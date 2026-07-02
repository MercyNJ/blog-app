require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { User, Post, Comment, sequelize } = require('./models/Associations');
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
const { PASSWORD_REGEX } = require('./utils/passwordPolicy');

const app = express();

// Constants
const uploadsDir = path.join(process.cwd(), 'uploads');
const BCRYPT_COST_FACTOR = 10;
const JWT_EXPIRES_IN = '7d';
const JWT_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const secret = process.env.SECRET_KEY;

if (!secret) {
  throw new Error('SECRET_KEY environment variable is not set.');
}

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

    allowProtocolRelative: false
  });
}

function sanitizeComment(content) {
  return sanitizeHtml(content, {
    allowedTags: [],
    allowedAttributes: {}
  });
}

//File upload middleware
// Client-supplied MIME type is a fast, spoofable pre-filter only.
// The authoritative check is processUploadedImage(), which sniffs the
// actual file content via Sharp instead of trusting this header.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 15;

const uploadMiddleware = multer({
  dest: 'uploads/',
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const error = new Error('Only image files (jpeg, png, webp, gif) are allowed.');
      error.status = 400;
      return cb(error);
    }
    cb(null, true);
  },
});

// Core middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  credentials: true,
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
}));

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, '../client/dist')));

//Rate limiters
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many registration attempts. Please try again in 15 minutes.',
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests. Please try again later.',
});

app.use(apiLimiter);

//Auth middleware

/**
 * Verifies the JWT cookie and attaches req.user = { id, username, email, role }.
 * Returns 401 if the token is missing or invalid.
 */
function authenticateUser(req, res, next) {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  jwt.verify(token, secret, { issuer: 'inlightofeternity' }, (err, info) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    req.user = info;
    next();
  });
}

/**
 * Blocks access unless req.user.role === 'admin'.
 */
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

// Registration route
app.post('/register', registerLimiter, async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      error: 'Username, email, and password are required.'
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim();

  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      error:
        'Password must be at least 8 characters long and contain an uppercase letter, lowercase letter, number, and special character.'
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
});

// Login route
app.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
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
      return res.status(400).json({
        error: 'Invalid email or password.'
      });
    }

    const passOk = await bcrypt.compare(
      password,
      userDoc.password
    );

    if (!passOk) {
      return res.status(400).json({
        error: 'Invalid email or password.'
      });
    }

    jwt.sign(
      {
        id: userDoc.id,
        username: userDoc.username,
        email: userDoc.email,
        role: userDoc.role
      },
      secret,
      {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'inlightofeternity'
      },
      (err, token) => {
        if (err) {
          console.error('JWT error:', err);

          return res.status(500).json({
            error: 'Error generating token.'
          });
        }

        return res
          .cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: JWT_COOKIE_MAX_AGE_MS
          })
          .json({
            id: userDoc.id,
            username: userDoc.username,
            email: userDoc.email,
            role: userDoc.role
          });
      }
    );

  } catch (e) {
    console.error('Login error:', e);

    return res.status(500).json({
      error: 'Internal server error.'
    });
  }
});

//Profile
app.get('/profile', authenticateUser, async (req, res) => {
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
});

//Logout
app.post('/logout', (req, res) => {
  try {
    res.cookie('token', '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', expires: new Date(0) });
    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Maps Sharp's real, content-sniffed format to the output pipeline/extension.
// Keyed by what libvips actually detects from the file bytes, not by the
// client-supplied filename or Content-Type header.
const SUPPORTED_IMAGE_FORMATS = ['jpeg', 'png', 'webp'];
const EXTENSION_BY_FORMAT = { jpeg: '.jpg', png: '.png', webp: '.webp' };
const UNSUPPORTED_FORMAT_MESSAGE =
  'Unsupported image format. Please upload a JPG, PNG or WebP image.';

// Helper: process and resize uploaded image
async function processUploadedImage(file) {
  const { path: tempPath } = file;

  await fs.mkdir(uploadsDir, { recursive: true });

  try {
    const metadata = await sharp(tempPath).metadata();

    if (!SUPPORTED_IMAGE_FORMATS.includes(metadata.format)) {
      throw new Error(UNSUPPORTED_FORMAT_MESSAGE);
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

    await image.toFile(finalPath);

    return path.relative(process.cwd(), finalPath).replace(/\\/g, '/');

  } catch (error) {
    console.error('Image processing error:', error);

    if (error.message === UNSUPPORTED_FORMAT_MESSAGE) {
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
  async (req, res) => {
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

      res.status(201).json(postDoc);

    } catch (err) {
      console.error('Create post error:', err);

      if (coverPath) {
        await deleteImageFile(coverPath);
      }

      res.status(500).json({
        error: 'Error creating post.',
      });
    }
  }
);

/// Update post (admin only)
app.put(
  '/post',
  authenticateUser,
  requireAdmin,
  uploadMiddleware.single('file'),
  async (req, res) => {
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

      res.status(200).json(updatedPost);

    } catch (err) {
      console.error('Update post error:', err);

      if (req.file && coverPath && coverPath !== oldCover) {
        await deleteImageFile(coverPath);
      }

      res.status(500).json({
        error: 'Error updating post.',
      });
    }
  }
);

// Delete post (admin only)
app.delete('/post/:id', authenticateUser, requireAdmin, async (req, res) => {
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

    res.status(200).json({
      message: 'Post deleted successfully.',
    });

  } catch (err) {
    console.error('Delete post error:', err);

    res.status(500).json({
      error: 'Internal server error.',
    });
  }
});

//Get posts with optional category filter + pagination
app.get('/post', async (req, res) => {
  const { category } = req.query;
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
});

//Get posts by category + pagination
app.get('/category/:category', async (req, res) => {
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

    if (count === 0) {
      return res.status(404).json({ error: `No posts found in the "${category}" category.` });
    }

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
});

//Get single post
app.get('/post/:id', async (req, res) => {
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
});

// Search posts (title, summary, content, category)
app.get('/search', async (req, res) => {
  const searchTerm = req.query.q ? req.query.q.trim() : '';

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

    if (posts.length === 0) {
      return res.status(404).json({
        error: 'No posts found.'
      });
    }

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
});

//Create comment (authenticated users)
app.post('/comment', authenticateUser, async (req, res) => {
  const { postId, content } = req.body;

  if (!postId || !content) {
    return res.status(400).json({ error: 'postId and content are required.' });
  }

  if (!content.trim()) {
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
      content: sanitizeComment(
  content.trim()
),
    });
    res.status(201).json(comment);
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: 'Error creating comment.' });
  }
});

//Get comments for a post
app.get('/comments/:postId', async (req, res) => {
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
});

//Update comment (owner or admin)
app.put('/comment/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content is required.' });
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

    await comment.update({ content: sanitizeComment(
  content.trim()
) });
    res.json(comment);
  } catch (err) {
    console.error('Update comment error:', err);
    res.status(500).json({ error: 'Error updating comment.' });
  }
});

//Delete comment (owner or admin)
app.delete('/comment/:id', authenticateUser, async (req, res) => {
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

    await comment.destroy();
    res.status(200).json({ message: 'Comment deleted successfully.' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Error deleting comment.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

//Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);

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

// Schema is managed exclusively through migrations (`npm run migrate`) in
// every environment. See migrations/20260701000000-create-baseline-schema.js
// and the corrective migrations that follow it.
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