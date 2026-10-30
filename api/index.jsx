require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { User, Post, Comment, AuditLog, sequelize } = require('./models/Associations');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs').promises;
const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { Op } = require('sequelize');
const sanitizeHtml = require('sanitize-html');
const helmet = require('helmet');
const { PASSWORD_REGEX, PASSWORD_POLICY_MESSAGE } = require('./utils/passwordPolicy');
const { logAdminAction } = require('./utils/auditLog');
const { asyncHandler } = require('./utils/asyncHandler');
const { deleteUserAccount, changeUserRole } = require('./utils/userAccounts');

// Each upload is processed once, and Sharp's cache would keep input files open (blocking cleanup on Windows).
sharp.cache(false);

const app = express();

// Trust Apache's single proxy hop on cPanel/Passenger so req.ip is the real client IP.
app.set('trust proxy', 1);

// Constants
const uploadsDir = path.join(process.cwd(), 'uploads');
const tempUploadsDir = path.join(process.cwd(), 'temp');
require('fs').mkdirSync(tempUploadsDir, { recursive: true });
const BCRYPT_COST_FACTOR = 10;
const JWT_EXPIRES_IN = '7d';
const JWT_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const secret = process.env.SECRET_KEY;
// Public site address, used for CORS and the sitemap's absolute URLs.
const SITE_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

if (!secret) {
  throw new Error('SECRET_KEY environment variable is not set.');
}

// Query strings and JSON bodies can carry arrays, objects or numbers, so check before using string methods.
const isNonEmptyString = value => typeof value === 'string' && value.length > 0;

function sanitizeContent(content) {
  return sanitizeHtml(content, {
    allowedTags: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'blockquote',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'code',
      'pre'
    ],

    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt']
    },

    allowedSchemes: [
      'http',
      'https',
      'mailto'
    ],

    allowProtocolRelative: false,

    // Prevent reverse tabnabbing on links opened in a new tab.
    transformTags: {
      a: (tagName, attribs) => {
        if (attribs.target === '_blank') {
          attribs.rel = 'noopener noreferrer';
        }
        return { tagName, attribs };
      }
    }
  });
}

// Must match MAX_COMMENT_LENGTH in client/src/constants/comments.js.
const MAX_COMMENT_LENGTH = 5000;
const COMMENT_TOO_LONG_MESSAGE = `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`;

function sanitizeComment(content) {
  return sanitizeHtml(content, {
    allowedTags: [],
    allowedAttributes: {}
  });
}

// File uploads: fileFilter is a spoofable MIME pre-check; processUploadedImage() does the real Sharp-based validation.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 15;

const uploadMiddleware = multer({
  dest: tempUploadsDir,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const error = new Error('Only image files (jpeg, png, webp) are allowed.');
      error.status = 400;
      return cb(error);
    }
    cb(null, true);
  },
});

// Send www.* visitors to the bare domain so the app and its API share one origin (and one canonical URL).
app.use((req, res, next) => {
  if (!req.hostname.startsWith('www.')) {
    return next();
  }

  // Production is HTTPS-only; the proxy may not report the original protocol reliably.
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
  const host = req.get('host').replace(/^www\./, '');

  res.redirect(301, `${protocol}://${host}${req.originalUrl}`);
});

// Core middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Explicit allowlist: everything is served from this origin. Inline styles are needed by React style props and Quill.
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      upgradeInsecureRequests: [],
    },
  },
}));

app.use(cors({
  credentials: true,
  origin: SITE_URL,
}));

// Explicit cap on JSON bodies (register/login/comments); post uploads go through multer instead.
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, '../client/dist')));

const CLIENT_INDEX_HTML = path.join(__dirname, '../client/dist/index.html');

// Client page routes that share a URL with a JSON API route (mirror App.jsx).
const SHARED_PAGE_ROUTES = [
  /^\/post\/[^/]+\/?$/,
  /^\/category\/[^/]+\/?$/,
  /^\/admin\/comments\/?$/,
  /^\/admin\/activity\/?$/,
  /^\/admin\/users\/?$/,
];

// Serve the app for page loads (browsers and crawlers prefer text/html) and JSON for fetch() (Accept: */*).
// Registered before the rate limiters so page loads don't use up the API allowance.
app.use((req, res, next) => {
  if (req.method !== 'GET' || !SHARED_PAGE_ROUTES.some(route => route.test(req.path))) {
    return next();
  }

  // The same URL returns HTML or JSON depending on Accept, so caches must key on it.
  res.vary('Accept');

  if (req.accepts(['json', 'html']) === 'html') {
    return res.sendFile(CLIENT_INDEX_HTML);
  }

  next();
});

//Rate limiters (object messages are sent as JSON, matching the standard { error } format)
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts. Please try again in 15 minutes.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  handler: (req, res, next, options) => {
    logFailedLogin('rate limited', req.body?.email);
    res.status(options.statusCode).json(options.message);
  },
});

// Generous because each page view makes several API calls and mobile readers often share an IP.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests. Please try again later.' },
});

const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'You are commenting too quickly. Please try again in a few minutes.' },
});

// Registered before apiLimiter so uptime checks are never rate-limited.
app.get('/health', asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');

  try {
    await sequelize.authenticate();
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(503).json({ status: 'error' });
  }
}));

app.use(apiLimiter);

//Auth middleware

// Verifies the JWT cookie, then loads the user so a deleted account, changed role or ended session
// (password changed) takes effect at once. Attaches req.user from the database; 401 if invalid.
function authenticateUser(req, res, next) {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  jwt.verify(token, secret, { issuer: 'inlightofeternity', algorithms: ['HS256'] }, async (err, info) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    try {
      const user = await User.findByPk(info.id, {
        attributes: ['id', 'username', 'email', 'role', 'tokenVersion'],
      });

      // Tokens issued before token versions existed count as version 0.
      if (!user || (info.tokenVersion ?? 0) !== user.tokenVersion) {
        return res.status(401).json({ error: 'Your session has ended. Please log in again.' });
      }

      req.user = { id: user.id, username: user.username, email: user.email, role: user.role };
      next();
    } catch (error) {
      console.error('Authentication lookup error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });
}

// Issues the login cookie for this user, tied to their current token version.
function setLoginCookie(res, user) {
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion
    },
    secret,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'inlightofeternity'
    }
  );

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: JWT_COOKIE_MAX_AGE_MS
  });
}

function clearLoginCookie(res) {
  res.cookie('token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0)
  });
}

// Blocks access unless req.user.role === 'admin'.
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

// Registration route
app.post('/register', registerLimiter, asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (![username, email, password].every(isNonEmptyString)) {
    return res.status(400).json({
      error: 'Username, email, and password are required.'
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim();

  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      error: PASSWORD_POLICY_MESSAGE
    });
  }

  try {
    const existingUsername = await User.findOne({
      where: { username: normalizedUsername }
    });

    if (existingUsername) {
      return res.status(400).json({
        error: 'Username already taken.'
      });
    }

    const existingEmail = await User.findOne({
      where: { email: normalizedEmail }
    });

    if (existingEmail) {
      return res.status(400).json({
        error: 'Email already registered.'
      });
    }

    const hashedPassword = bcrypt.hashSync(password, BCRYPT_COST_FACTOR);

    const newUser = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'user'
    });

    return res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    });

  } catch (e) {
    console.error('Registration error:', e);

    if (e.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: e.errors[0].message
      });
    }

    if (e.name === 'SequelizeUniqueConstraintError') {
      const field = e.errors?.[0]?.path;

      const message =
        field === 'username'
          ? 'Username already taken.'
          : field === 'email'
            ? 'Email already registered.'
            : 'Username or email already in use.';

      return res.status(400).json({
        error: message
      });
    }

    return res.status(500).json({
      error: 'Internal server error.'
    });
  }
}));

// Record failed logins (never the password) so targeted accounts can be spotted in the server log.
function logFailedLogin(reason, email) {
  const attemptedEmail = typeof email === 'string' ? email.slice(0, 254) : null;

  console.warn('Failed login:', JSON.stringify({
    time: new Date().toISOString(),
    reason,
    email: attemptedEmail,
  }));
}

// Login route
app.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (![email, password].every(isNonEmptyString)) {
    return res.status(400).json({
      error: 'Email and password are required.'
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const userDoc = await User.findOne({
      where: { email: normalizedEmail }
    });

    if (!userDoc) {
      logFailedLogin('unknown email', normalizedEmail);

      return res.status(400).json({
        error: 'Invalid email or password.'
      });
    }

    const passOk = await bcrypt.compare(
      password,
      userDoc.password
    );

    if (!passOk) {
      logFailedLogin('wrong password', normalizedEmail);

      return res.status(400).json({
        error: 'Invalid email or password.'
      });
    }

    try {
      setLoginCookie(res, userDoc);
    } catch (err) {
      console.error('JWT error:', err);

      return res.status(500).json({
        error: 'Error generating token.'
      });
    }

    return res.json({
      id: userDoc.id,
      username: userDoc.username,
      email: userDoc.email,
      role: userDoc.role
    });

  } catch (e) {
    console.error('Login error:', e);

    return res.status(500).json({
      error: 'Internal server error.'
    });
  }
}));

//Profile
app.get('/profile', authenticateUser, asyncHandler(async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'email', 'role'],
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (e) {
    console.error('Profile error:', e);
    res.status(500).json({ error: 'Internal server error.' });
  }
}));

// Limited per account (after login is checked), so the current password can't be guessed quickly.
const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: req => `user:${req.user.id}`,
  message: { error: 'Too many password change attempts. Please try again in 15 minutes.' },
});

// Change password (any logged-in user). Ends every other login session by bumping tokenVersion.
app.put('/account/password', authenticateUser, passwordChangeLimiter, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  if (!PASSWORD_REGEX.test(newPassword)) {
    return res.status(400).json({ error: PASSWORD_POLICY_MESSAGE });
  }

  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'New password must be different from your current password.' });
  }

  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(401).json({ error: 'Your session has ended. Please log in again.' });
    }

    const passOk = await bcrypt.compare(currentPassword, user.password);

    if (!passOk) {
      logFailedLogin('wrong current password', user.email);
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    await user.update({
      password: bcrypt.hashSync(newPassword, BCRYPT_COST_FACTOR),
      tokenVersion: user.tokenVersion + 1,
    });

    // Keep this device logged in with a token for the new version.
    setLoginCookie(res, user);

    res.json({ message: 'Password changed.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}));

// Limited per account, so the password can't be guessed quickly.
const accountDeleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: req => `user:${req.user.id}`,
  message: { error: 'Too many account deletion attempts. Please try again in 15 minutes.' },
});

// Delete your own account and comments. Admins are refused until another admin removes their access.
app.delete('/account', authenticateUser, accountDeleteLimiter, asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (req.user.role === 'admin') {
    return res.status(403).json({ error: 'Another admin must remove your admin access before you can delete your account.' });
  }

  if (!isNonEmptyString(password)) {
    return res.status(400).json({ error: 'Your password is required.' });
  }

  const user = await User.findByPk(req.user.id);

  if (!user) {
    return res.status(401).json({ error: 'Your session has ended. Please log in again.' });
  }

  const passOk = await bcrypt.compare(password, user.password);

  if (!passOk) {
    logFailedLogin('wrong password for account deletion', user.email);
    return res.status(400).json({ error: 'Password is incorrect.' });
  }

  await deleteUserAccount(user.id);

  clearLoginCookie(res);
  res.json({ message: 'Account deleted.' });
}));

//Logout
app.post('/logout', (req, res) => {
  try {
    clearLoginCookie(res);
    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Extension/pipeline lookup keyed by Sharp's real content-sniffed format, not the client-supplied filename.
const SUPPORTED_IMAGE_FORMATS = ['jpeg', 'png', 'webp'];
const EXTENSION_BY_FORMAT = { jpeg: '.jpg', png: '.png', webp: '.webp' };
const UNSUPPORTED_FORMAT_MESSAGE =
  'Unsupported image format. Please upload a JPG, PNG or WebP image.';

function createUnsupportedImageError() {
  const error = new Error(UNSUPPORTED_FORMAT_MESSAGE);
  error.status = 400;
  return error;
}

// Helper: process and resize uploaded image
async function processUploadedImage(file) {
  const { path: tempPath } = file;

  await fs.mkdir(uploadsDir, { recursive: true });

  try {
    const metadata = await sharp(tempPath).metadata().catch(() => {
      throw createUnsupportedImageError();
    });

    if (!SUPPORTED_IMAGE_FORMATS.includes(metadata.format)) {
      throw createUnsupportedImageError();
    }

    const ext = EXTENSION_BY_FORMAT[metadata.format];
    const filename = `${crypto.randomUUID()}${ext}`;
    const finalPath = path.join(uploadsDir, filename);

    let image = sharp(tempPath)
      .rotate()
      .resize({
        width: 1200,
        fit: 'inside',
        withoutEnlargement: true,
      });

    switch (metadata.format) {
      case 'jpeg':
        image = image.jpeg({
          quality: 80,
          mozjpeg: true,
        });
        break;

      case 'png':
        image = image.png({
          compressionLevel: 9,
          palette: true,
        });
        break;

      case 'webp':
        image = image.webp({
          quality: 80,
        });
        break;
    }

    // Encode before writing: a failure here means the image itself is damaged, and no partial file is left.
    const processedImage = await image.toBuffer().catch(() => {
      throw createUnsupportedImageError();
    });

    await fs.writeFile(finalPath, processedImage);

    return path.relative(process.cwd(), finalPath).replace(/\\/g, '/');

  } catch (error) {
    console.error('Image processing error:', error);

    if (error.status) {
      throw error;
    }

    throw new Error('Failed to process uploaded image.');
  } finally {
    try {
      await fs.unlink(tempPath);
    } catch (cleanupError) {
      console.error('Temporary file cleanup failed:', cleanupError);
    }
  }
}

// Helper: delete image file from disk
async function deleteImageFile(filePath) {
  if (!filePath) {
    return;
  }

  try {
    const resolvedPath = path.resolve(process.cwd(), filePath);

    if (!resolvedPath.startsWith(uploadsDir + path.sep)) {
      throw new Error(`Refusing to delete file outside uploads directory: ${filePath}`);
    }

    await fs.unlink(resolvedPath);

  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Could not delete file ${filePath}:`, error);
    }
  }
}

// Helper: delete a raw multer temp upload that was never handed to processUploadedImage
async function cleanupTempUpload(file) {
  if (!file) {
    return;
  }

  try {
    await fs.unlink(file.path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Could not delete temp upload ${file.path}:`, error);
    }
  }
}

// Create post (admin only)
app.post(
  '/post',
  authenticateUser,
  requireAdmin,
  uploadMiddleware.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: 'An image file is required.',
      });
    }

    const { title, summary, content, category } = req.body;

    if (!title || !summary || !content || !category) {
      await cleanupTempUpload(req.file);

      return res.status(400).json({
        error: 'Title, summary, content and category are required.',
      });
    }

    let coverPath;

    try {
      coverPath = await processUploadedImage(req.file);

      const sanitizedContent = sanitizeContent(content);
      const normalizedCategory = category.trim().toLowerCase();

      const postDoc = await Post.create({
        title,
        summary,
        content: sanitizedContent,
        cover: coverPath,
        category: normalizedCategory,
        authorId: req.user.id,
      });

      await logAdminAction({
        actor: req.user,
        action: 'post.create',
        targetType: 'post',
        targetId: postDoc.id,
        targetLabel: postDoc.title,
      });

      res.status(201).json(postDoc);

    } catch (err) {
      console.error('Create post error:', err);

      if (coverPath) {
        await deleteImageFile(coverPath);
      }

      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }

      res.status(500).json({
        error: 'Error creating post.',
      });
    }
  })
);

/// Update post (admin only)
app.put(
  '/post',
  authenticateUser,
  requireAdmin,
  uploadMiddleware.single('file'),
  asyncHandler(async (req, res) => {
    const { id, title, summary, content, category } = req.body;

    if (!id || !title || !summary || !content || !category) {
      await cleanupTempUpload(req.file);

      return res.status(400).json({
        error: 'ID, title, summary, content and category are required.',
      });
    }

    let oldCover = null;
    let coverPath = null;

    try {
      const post = await Post.findByPk(id);

      if (!post) {
        await cleanupTempUpload(req.file);

        return res.status(404).json({
          error: 'Post not found.',
        });
      }

      oldCover = post.cover;
      coverPath = oldCover;

      if (req.file) {
        coverPath = await processUploadedImage(req.file);
      }

      const sanitizedContent = sanitizeContent(content);
      const normalizedCategory = category.trim().toLowerCase();

      const updatedPost = await post.update({
        title,
        summary,
        content: sanitizedContent,
        cover: coverPath,
        category: normalizedCategory,
      });

      if (req.file && oldCover && oldCover !== coverPath) {
        await deleteImageFile(oldCover);
      }

      await logAdminAction({
        actor: req.user,
        action: 'post.update',
        targetType: 'post',
        targetId: updatedPost.id,
        targetLabel: updatedPost.title,
      });

      res.status(200).json(updatedPost);

    } catch (err) {
      console.error('Update post error:', err);

      if (req.file && coverPath && coverPath !== oldCover) {
        await deleteImageFile(coverPath);
      }

      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }

      res.status(500).json({
        error: 'Error updating post.',
      });
    }
  })
);

// Delete post (admin only)
app.delete('/post/:id', authenticateUser, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const post = await Post.findByPk(id);

    if (!post) {
      return res.status(404).json({
        error: 'Post not found.',
      });
    }

    const coverPath = post.cover;

    await post.destroy();
    await deleteImageFile(coverPath);

    await logAdminAction({
      actor: req.user,
      action: 'post.delete',
      targetType: 'post',
      targetId: post.id,
      targetLabel: post.title,
    });

    res.status(200).json({
      message: 'Post deleted successfully.',
    });

  } catch (err) {
    console.error('Delete post error:', err);

    res.status(500).json({
      error: 'Internal server error.',
    });
  }
}));

//Get posts with optional category filter + pagination
app.get('/post', asyncHandler(async (req, res) => {
  const { category } = req.query;

  if (category !== undefined && typeof category !== 'string') {
    return res.status(400).json({ error: 'Category must be a single value.' });
  }

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const whereClause = category ? { category: category.trim().toLowerCase() } : {};

  try {
    const { count, rows: posts } = await Post.findAndCountAll({
      where: whereClause,
      include: [{ model: User, attributes: ['username'], as: 'author' }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      posts,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error('Fetch posts error:', err);
    res.status(500).json({ error: 'Error fetching posts.' });
  }
}));

//Get posts by category + pagination
app.get('/category/:category', asyncHandler(async (req, res) => {
  const category = req.params.category.trim().toLowerCase();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  try {
    const { count, rows: posts } = await Post.findAndCountAll({
      where: { category },
      include: [{ model: User, attributes: ['username'], as: 'author' }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      posts,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error('Fetch category posts error:', err);
    res.status(500).json({ error: `Error fetching posts in "${category}".` });
  }
}));

//Get single post
app.get('/post/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const post = await Post.findByPk(id, {
      include: [{ model: User, attributes: ['username'], as: 'author' }],
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    res.json(post);
  } catch (err) {
    console.error('Fetch post error:', err);
    res.status(500).json({ error: 'Error fetching post.' });
  }
}));

// Search posts (title, summary, content, category)
app.get('/search', asyncHandler(async (req, res) => {
  const searchTerm = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  if (!searchTerm) {
    return res.status(400).json({
      error: 'Search term is required.'
    });
  }

  try {
    const posts = await Post.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${searchTerm}%` } },
          { summary: { [Op.like]: `%${searchTerm}%` } },
          { content: { [Op.like]: `%${searchTerm}%` } },
          { category: { [Op.like]: `%${searchTerm}%` } },
        ],
      },
      include: [
        {
          model: User,
          attributes: ['username'],
          as: 'author'
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      posts,
      total: posts.length
    });

  } catch (err) {
    console.error('Search error:', err);

    res.status(500).json({
      error: 'Error searching posts.'
    });
  }
}));

//Create comment (authenticated users)
app.post('/comment', commentLimiter, authenticateUser, asyncHandler(async (req, res) => {
  const { postId, content } = req.body;

  if (!postId || !isNonEmptyString(content)) {
    return res.status(400).json({ error: 'postId and content are required.' });
  }

  if (content.trim().length > MAX_COMMENT_LENGTH) {
    return res.status(400).json({ error: COMMENT_TOO_LONG_MESSAGE });
  }

  // Check after sanitizing: a comment of only markup has no text left to save.
  const sanitizedContent = sanitizeComment(content.trim()).trim();

  if (!sanitizedContent) {
    return res.status(400).json({ error: 'Comment cannot be empty.' });
  }

  try {
    const post = await Post.findByPk(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const comment = await Comment.create({
      postId,
      authorId: req.user.id,
      content: sanitizedContent,
    });
    res.status(201).json(comment);
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: 'Error creating comment.' });
  }
}));

//Get comments for a post
app.get('/comments/:postId', asyncHandler(async (req, res) => {
  const { postId } = req.params;

  try {
    const post = await Post.findByPk(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const comments = await Comment.findAll({
      where: { postId },
      include: [{ model: User, as: 'author', attributes: ['id', 'username'] }],
      order: [['createdAt', 'ASC']],
    });

    res.json(comments);
  } catch (err) {
    console.error('Fetch comments error:', err);
    res.status(500).json({ error: 'Error fetching comments.' });
  }
}));

// Audit label for a comment: number, author and post, never the comment text. Never throws.
async function describeComment(comment) {
  try {
    const [author, post] = await Promise.all([
      User.findByPk(comment.authorId, { attributes: ['username'] }),
      Post.findByPk(comment.postId, { attributes: ['title'] }),
    ]);

    return `Comment #${comment.id} by @${author?.username || 'unknown'} on "${post?.title || 'unknown post'}"`;
  } catch (error) {
    console.error('Audit label lookup failed:', error);
    return `Comment #${comment.id}`;
  }
}

//Update comment (owner or admin)
app.put('/comment/:id', authenticateUser, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!isNonEmptyString(content) || !content.trim()) {
    return res.status(400).json({ error: 'Comment content is required.' });
  }

  if (content.trim().length > MAX_COMMENT_LENGTH) {
    return res.status(400).json({ error: COMMENT_TOO_LONG_MESSAGE });
  }

  const sanitizedContent = sanitizeComment(content.trim()).trim();

  if (!sanitizedContent) {
    return res.status(400).json({ error: 'Comment cannot be empty.' });
  }

  try {
    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    const isOwner = comment.authorId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to edit this comment.' });
    }

    await comment.update({ content: sanitizedContent });

    // Only an admin acting on someone else's comment is recorded.
    if (!isOwner) {
      await logAdminAction({
        actor: req.user,
        action: 'comment.update',
        targetType: 'comment',
        targetId: comment.id,
        targetLabel: await describeComment(comment),
      });
    }

    res.json(comment);
  } catch (err) {
    console.error('Update comment error:', err);
    res.status(500).json({ error: 'Error updating comment.' });
  }
}));

//Delete comment (owner or admin)
app.delete('/comment/:id', authenticateUser, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    const isOwner = comment.authorId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to delete this comment.' });
    }

    // Describe it before it is gone; only an admin acting on someone else's comment is recorded.
    const auditLabel = isOwner ? null : await describeComment(comment);

    await comment.destroy();

    if (!isOwner) {
      await logAdminAction({
        actor: req.user,
        action: 'comment.delete',
        targetType: 'comment',
        targetId: comment.id,
        targetLabel: auditLabel,
      });
    }

    res.status(200).json({ message: 'Comment deleted successfully.' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Error deleting comment.' });
  }
}));

// List comments across all posts for moderation (admin only); author username only, never email.
// Optional ?q= matches comment text, author username or post title; optional ?postId= limits to one post.
app.get('/admin/comments', authenticateUser, requireAdmin, asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const searchTerm = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const postId = /^\d+$/.test(req.query.postId || '') ? Number(req.query.postId) : null;

  const conditions = [];

  if (searchTerm) {
    // Comments are stored escaped by sanitizeComment(), so escape the term the same way to match "&" or "<".
    conditions.push({
      [Op.or]: [
        { content: { [Op.like]: `%${sanitizeComment(searchTerm)}%` } },
        { '$author.username$': { [Op.like]: `%${searchTerm}%` } },
        { '$post.title$': { [Op.like]: `%${searchTerm}%` } },
      ],
    });
  }

  if (postId) {
    conditions.push({ postId });
  }

  const whereClause = conditions.length ? { [Op.and]: conditions } : {};

  // Admin-only data: never keep it in a browser or shared cache.
  res.set('Cache-Control', 'no-store');

  try {
    const { count, rows: comments } = await Comment.findAndCountAll({
      where: whereClause,
      attributes: ['id', 'content', 'createdAt'],
      include: [
        { model: User, as: 'author', attributes: ['id', 'username'] },
        { model: Post, as: 'post', attributes: ['id', 'title'] },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      comments,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error('Fetch admin comments error:', err);
    res.status(500).json({ error: 'Error fetching comments.' });
  }
}));

// Read-only audit log for admins, newest first. Entries are written only by logAdminAction().
app.get('/admin/activity', authenticateUser, requireAdmin, asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  res.set('Cache-Control', 'no-store');

  try {
    const { count, rows: entries } = await AuditLog.findAndCountAll({
      attributes: ['id', 'actorId', 'actorUsername', 'action', 'targetType', 'targetId', 'targetLabel', 'createdAt'],
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      limit,
      offset,
    });

    res.json({
      // Account ids stay private; the page only needs to know the admin's account is gone.
      entries: entries.map(entry => {
        const { actorId, ...details } = entry.toJSON();
        return { ...details, actorDeleted: actorId === null };
      }),
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error('Fetch audit log error:', err);
    res.status(500).json({ error: 'Error fetching activity.' });
  }
}));

// List registered users for admins, newest first, never the password hash. Optional ?q= matches username or email.
app.get('/admin/users', authenticateUser, requireAdmin, asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const searchTerm = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  const whereClause = searchTerm
    ? {
      [Op.or]: [
        { username: { [Op.like]: `%${searchTerm}%` } },
        { email: { [Op.like]: `%${searchTerm}%` } },
      ],
    }
    : {};

  res.set('Cache-Control', 'no-store');

  try {
    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: [
        'id',
        'username',
        'email',
        'role',
        'createdAt',
        [sequelize.literal('(SELECT COUNT(*) FROM Comments WHERE Comments.authorId = User.id)'), 'commentCount'],
        [sequelize.literal('(SELECT COUNT(*) FROM Posts WHERE Posts.authorId = User.id)'), 'postCount'],
      ],
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      limit,
      offset,
    });

    res.json({
      users,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Error fetching users.' });
  }
}));

// Give or remove admin access. Admins can't change their own role, so one admin always remains.
app.patch('/admin/users/:id/role', authenticateUser, requireAdmin, asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or user.' });
  }

  const user = await changeUserRole({ actorId: req.user.id, userId: Number(req.params.id), role });

  await logAdminAction({
    actor: req.user,
    action: role === 'admin' ? 'user.role_change' : 'user.demote',
    targetType: 'user',
    targetId: user.id,
    targetLabel: `@${user.username}`,
  });

  res.json({ id: user.id, username: user.username, role: user.role });
}));

// Delete a user and their comments (admin only). Admins must have their access removed first.
app.delete('/admin/users/:id', authenticateUser, requireAdmin, asyncHandler(async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }

  const userId = Number(req.params.id);
  const removedComments = await deleteUserAccount(userId);

  // No username or email: the point of deleting an account is that its details are gone.
  await logAdminAction({
    actor: req.user,
    action: 'user.delete',
    targetType: 'user',
    targetId: userId,
    targetLabel: `Account #${userId} (${removedComments} comments removed)`,
  });

  res.json({ message: 'User deleted.', removedComments });
}));

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Sitemap for search engines: home, About, every category in use and every post.
app.get('/sitemap.xml', asyncHandler(async (req, res) => {
  try {
    const posts = await Post.findAll({
      attributes: ['id', 'category', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
    });

    const categories = [...new Set(posts.map(post => post.category))];

    const urls = [
      { urlPath: '/' },
      { urlPath: '/about' },
      ...categories.map(category => ({ urlPath: `/category/${encodeURIComponent(category)}` })),
      ...posts.map(post => ({
        urlPath: `/post/${post.id}`,
        lastmod: post.updatedAt.toISOString().slice(0, 10),
      })),
    ];

    const entries = urls.map(({ urlPath, lastmod }) => [
      '  <url>',
      `    <loc>${escapeXml(SITE_URL + urlPath)}</loc>`,
      lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
      '  </url>',
    ].filter(Boolean).join('\n'));

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...entries,
      '</urlset>',
    ].join('\n');

    res.type('application/xml').send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).json({ error: 'Error generating sitemap.' });
  }
}));

const SITE_TITLE = 'In Light of Eternity';
const SITE_DESCRIPTION = 'A Christian blog by Mercy Njuguna about living with an eternal perspective.';
const RSS_ITEM_LIMIT = 20;

// RSS 2.0 feed of the newest posts (summaries only).
app.get('/rss.xml', asyncHandler(async (req, res) => {
  try {
    const posts = await Post.findAll({
      attributes: ['id', 'title', 'summary', 'category', 'createdAt'],
      include: [{ model: User, attributes: ['username'], as: 'author' }],
      order: [['createdAt', 'DESC']],
      limit: RSS_ITEM_LIMIT,
    });

    const items = posts.map(post => {
      const postUrl = escapeXml(`${SITE_URL}/post/${post.id}`);

      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${postUrl}</link>`,
        `      <guid isPermaLink="true">${postUrl}</guid>`,
        `      <pubDate>${post.createdAt.toUTCString()}</pubDate>`,
        post.author ? `      <dc:creator>${escapeXml(post.author.username)}</dc:creator>` : null,
        `      <category>${escapeXml(post.category)}</category>`,
        `      <description>${escapeXml(post.summary)}</description>`,
        '    </item>',
      ].filter(Boolean).join('\n');
    });

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
      '  <channel>',
      `    <title>${escapeXml(SITE_TITLE)}</title>`,
      `    <link>${escapeXml(`${SITE_URL}/`)}</link>`,
      `    <description>${escapeXml(SITE_DESCRIPTION)}</description>`,
      '    <language>en</language>',
      `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
      `    <atom:link href="${escapeXml(`${SITE_URL}/rss.xml`)}" rel="self" type="application/rss+xml" />`,
      ...items,
      '  </channel>',
      '</rss>',
    ].join('\n');

    res.type('application/rss+xml').send(xml);
  } catch (err) {
    console.error('RSS feed error:', err);
    res.status(500).json({ error: 'Error generating RSS feed.' });
  }
}));

app.get('*', (req, res) => {
  res.sendFile(CLIENT_INDEX_HTML);
});

//Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `Image is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`
        : 'Error uploading file.';

    return res.status(400).json({ error: message });
  }

  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  res.status(500).json({
    error: 'Internal server error.'
  });
});

// Schema is migration-only (npm run migrate); see migrations/ for the baseline + corrective files.
sequelize.authenticate()
  .then(() => {
    console.log('Database connection established.');
  })
  .then(() => {
    const port = process.env.PORT || 3000;

    app.listen(port, () => {
      console.log(`Server started on http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('Database startup error:', err);
    process.exit(1);
  });