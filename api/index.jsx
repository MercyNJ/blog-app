require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { User, Post, Comment, sequelize } = require('./models/Associations');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs').promises;
const Jimp = require('jimp');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { Op } = require('sequelize');
const sanitizeHtml = require('sanitize-html');
const helmet = require('helmet');

const app = express();

// Constants
const salt = bcrypt.genSaltSync(10);
const secret = process.env.SECRET_KEY;

if (!secret) {
  throw new Error('SECRET_KEY environment variable is not set.');
}

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

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
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_MB = 5;

const uploadMiddleware = multer({
  dest: 'uploads/',
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only image files (jpeg, png, webp, gif) are allowed.'));
    }
    cb(null, true);
  },
});

// Core middleware
app.use(helmet());

app.use(cors({
  credentials: true,
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
}));

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

  if (!passwordRegex.test(password)) {
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

    const hashedPassword = bcrypt.hashSync(password, salt);

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
        expiresIn: '7d',
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
            secure: process.env.NODE_ENV === 'production'
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

// Helper: process and resize uploaded image
async function processUploadedImage(file) {
  const { originalname, path: tempPath } = file;
  const ext = originalname.split('.').pop();
  const newPath = `${tempPath}.${ext}`;
  const resizedPath = newPath.replace(`.${ext}`, `_resized.${ext}`);

  await fs.rename(tempPath, newPath);

  const image = await Jimp.read(newPath);
  await image.resize(400, Jimp.AUTO);

  if (['jpg', 'jpeg'].includes(ext.toLowerCase())) {
    await image.quality(80);
  }

  await image.writeAsync(resizedPath);

  try {
    await fs.unlink(newPath);
  } catch (e) {
    console.error('Could not delete original after resize:', e);
  }

  return { newPath, resizedPath };
}

//Helper: delete image files from disk
async function deleteImageFiles(cover, resizedCover) {
  for (const filePath of [cover, resizedCover]) {
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (e) {
        console.error(`Could not delete file ${filePath}:`, e);
      }
    }
  }
}

//Create post (admin only)
app.post('/post', authenticateUser, requireAdmin, uploadMiddleware.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'An image file is required.' });
  }

  try {
    const { newPath, resizedPath } = await processUploadedImage(req.file);

    const { title, summary, content, category } = req.body;

    if (!title || !summary || !content || !category) {
      await deleteImageFiles(newPath, resizedPath);
      return res.status(400).json({ error: 'title, summary, content, and category are required.' });
    }

    const sanitizedContent = sanitizeContent(content);
    const normalizedCategory = category.trim().toLowerCase();

    const postDoc = await Post.create({
      title,
      summary,
      content: sanitizedContent,
      cover: newPath,
      resizedCover: resizedPath,
      category: normalizedCategory,
      authorId: req.user.id,
    });

    res.status(201).json(postDoc);
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Error creating post.' });
  }
});

// Update post (admin only)
app.put('/post', authenticateUser, requireAdmin, uploadMiddleware.single('file'), async (req, res) => {
  const { id, title, summary, content, category } = req.body;

  if (!id || !title || !summary || !content) {
    return res.status(400).json({ error: 'id, title, summary, and content are required.' });
  }

  try {
    const post = await Post.findByPk(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    let newPath = post.cover;
    let resizedPath = post.resizedCover;

    if (req.file) {
      const oldCover = post.cover;
      const oldResized = post.resizedCover;
      const processed = await processUploadedImage(req.file);
      newPath = processed.newPath;
      resizedPath = processed.resizedPath;
      await deleteImageFiles(oldCover, oldResized);
    }

    const sanitizedContent = sanitizeContent(content);
    const normalizedCategory = category ? category.trim().toLowerCase() : post.category;

    const updatedPost = await post.update({
      title,
      summary,
      content: sanitizedContent,
      cover: newPath,
      resizedCover: resizedPath,
      category: normalizedCategory,
    });

    res.status(200).json(updatedPost);
  } catch (err) {
    console.error('Update post error:', err);
    res.status(500).json({ error: 'Error updating post.' });
  }
});

//Delete post (admin only)
app.delete('/post/:id', authenticateUser, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const post = await Post.findByPk(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const { cover, resizedCover } = post;
    await post.destroy();
    await deleteImageFiles(cover, resizedCover);

    res.status(200).json({ message: 'Post deleted successfully.' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: 'Internal server error.' });
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
      return res.status(404).json({ message: `No posts found in the "${category}" category.` });
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

app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

//Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    error: 'Internal server error.'
  });
});

sequelize.authenticate()
  .then(() => {
    console.log('Database connection established.');
    return sequelize.sync({ force: false });
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