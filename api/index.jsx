require('dotenv').config();

const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST;


const express = require('express');
const cors = require('cors');
const { User, Post, Comment, sequelize } = require('./models/Associations');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({dest: 'uploads/' });
// const fs = require('fs');
const fs = require('fs').promises;
// const { createCanvas, loadImage } = require('canvas');
const Jimp = require('jimp');
const path = require('path');
const rateLimit = require('express-rate-limit');


const app = express();

const salt = await bcrypt.genSalt(10);
const secret = process.env.SECRET_KEY;


if (!secretKey) {
  throw new Error('SECRET_KEY environment variable is not set.');
}

app.use(cors({credentials:true,origin:'http://localhost:5000'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));


app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

sequelize.sync({ force: false })
  .then(() => {
    console.log('Database synchronized.');
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server started on http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('Database synchronization error:', err);
  });

// Rate limiter for registration
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many registration attempts. Please try again in 15 minutes.',
});

// Rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});


// Regisration route
app.post('/register', registerLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      username,
      password: hashedPassword,
    });

    res.status(201).json(newUser);
  } catch (e) {
    console.error('Registration error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Login route
app.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const userDoc = await User.findOne({ where: { username } });
    if (!userDoc) {
      return res.status(400).json({ error: 'User not found' });
    }

    const passOk = await bcrypt.compare(password, userDoc.password);
    if (passOk) {
      jwt.sign({ username, id: userDoc.id }, secret, {}, (err, token) => {
        if (err) {
          console.error('JWT error:', err);
          return res.status(500).json({ error: 'Error generating token' });
        }
        res.cookie('token', token, { httpOnly: true }).json({
          id: userDoc.id,
          username,
        });
      });
    } else {
      return res.status(400).json({ error: 'Wrong Credentials' });
    }
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Fetch user profile info
app.get('/profile', (req, res) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ error: 'Token is required' });
  }

  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(401).json({ error: 'Invalid token' });
    }

    try {
      const user = await User.findByPk(info.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ id: user.id, username: user.username });
    } catch (dbErr) {
      console.error('Database error:', dbErr);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});


// Logout a user
app.post('/logout', (req, res) => {
  try {
    res.cookie('token', '', { httpOnly: true });
    res.status(200).json({ message: 'You have been successfully logged out.' });
  } catch (err) {
    console.error('Error during logout:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/* 
   Route for creating a new post with file upload.
   Handles file upload, JWT authentication, and post creation.
*/

// Commented code- changed from using canvas to jimp
/*
app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
  const newPath = path + '.' + ext;
  fs.renameSync(path, newPath);

  try {
    // Load the image
    const image = await loadImage(newPath);

    // Define the new width and calculate the new height to maintain aspect ratio
    const newWidth = 400;
    const newHeight = (image.height / image.width) * newWidth;

    // Create a canvas and resize the image
    const canvas = createCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, newWidth, newHeight);

    // Write the resized image to a file
    const resizedImagePath = newPath.replace('.' + ext, '_resized.' + ext); //resized img path
    const out = fs.createWriteStream(resizedImagePath);
    const stream = canvas.createJPEGStream();
    stream.pipe(out);
    await new Promise((resolve, reject) => {
      out.on('finish', resolve);
      out.on('error', reject);
    });

    // Delete the original unresized img file
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }

    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) throw err;
      const { title, summary, content, category } = req.body;
      const postDoc = await Post.create({
        title,
        summary,
        content,
        cover: newPath,
        resizedCover: resizedImagePath,
        category,
        authorId: info.id,
      });
      res.json(postDoc);
    });
  } catch (err) {
    console.error('Error processing image:', err);
    res.status(500).send('Error processing image');
  }
});
*/

// Alternative using jimp instead of canvas
app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
  const { originalname, path: tempPath } = req.file;
  const ext = originalname.split('.').pop();
  const newPath = `${tempPath}.${ext}`;
  const resizedImagePath = newPath.replace(`.${ext}`, `_resized.${ext}`);

  try {
    await fs.rename(tempPath, newPath);

    const image = await Jimp.read(newPath);

    const newWidth = 400;
    const newHeight = Jimp.AUTO;

    await image.resize(newWidth, newHeight);

    if (ext.toLowerCase() === 'jpg' || ext.toLowerCase() === 'jpeg') {
      await image.quality(80);
    }

    await image.writeAsync(resizedImagePath);

    try {
      await fs.unlink(newPath);
    } catch (unlinkErr) {
      console.error('Error deleting original image:', unlinkErr);
    }

    // JWT verification
    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) {
        console.error('JWT verification failed:', err);
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const { title, summary, content, category } = req.body;
        const postDoc = await Post.create({
          title,
          summary,
          content,
          cover: newPath,
          resizedCover: resizedImagePath,
          category,
          authorId: info.id,
        });
        res.status(201).json(postDoc);
      } catch (dbErr) {
        console.error('Error saving post to database:', dbErr);
        res.status(500).json({ error: 'Error saving post' });
      }
    });
  } catch (err) {
    console.error('Error processing image:', err);
    res.status(500).json({ error: 'Error processing image' });
  }
});


/*
   Route for updating a post, including file upload,
   JWT authentication, and post document update
*/
app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
  let newPath = null;

  if (req.file) {
    const { originalname, path } = req.file;
    const ext = originalname.split('.').pop();
    newPath = `${path}.${ext}`;
    try {
      await fs.rename(path, newPath);
    } catch (renameErr) {
      console.error('Error renaming file:', renameErr);
      return res.status(500).json({ error: 'Error processing file' });
    }
  }

  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ error: 'No token provided, unauthorized' });
  }

  jwt.verify(token, process.env.SECRET_KEY, {}, async (err, info) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, title, summary, content } = req.body;

    if (!id || !title || !summary || !content) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    try {
      const post = await Post.findByPk(id);

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.authorId !== info.id) {
        return res.status(403).json({ error: 'You are not the author of this post' });
      }

      const updatedPost = await post.update({
        title,
        summary,
        content,
        cover: newPath ? newPath : post.cover,
      });

      res.status(200).json(updatedPost);
    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).json({ error: 'Error updating post' });
    }
  });
});

// Route for deleting a post
app.delete('/post/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Post ID is required' });
  }

  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ error: 'No token provided, unauthorized' });
  }

  jwt.verify(token, process.env.SECRET_KEY || 'inlightofeternity', {}, async (err, info) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const post = await Post.findByPk(id);

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.authorId !== info.id) {
        return res.status(403).json({ error: 'You are not the author of this post' });
      }

      await post.destroy();

      res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});


// Fetch posts with optional category filter
app.get('/post', async (req, res) => {
  const { category } = req.query;
  let whereClause = {};

  if (category) {
    whereClause = { category };
  }

  try {
    const posts = await Post.findAll({
      where: whereClause,
      include: [{
        model: User,
        attributes: ['username'],
        as: 'author'
      }],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    if (posts.length === 0) {
      return res.status(404).json({ message: 'No posts found' });
    }

    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Error fetching posts' });
  }
});


// Fetch posts for a specific category
app.get('/category/:category', async (req, res) => {
  const { category } = req.params;

  try {
    const posts = await Post.findAll({
      where: { category },
      include: [{
        model: User,
        attributes: ['username'],
        as: 'author'
      }],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    if (posts.length === 0) {
      return res.status(404).json({ message: `No posts found in the ${category} category` });
    }

    res.json(posts);
  } catch (error) {
    console.error(`Error fetching ${category} posts:`, error);
    res.status(500).json({ message: `Error fetching ${category} posts` });
  }
});



// Fetch a specific post by its ID from db
app.get('/post/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: 'Post ID is required' });
  }

  try {
    const post = await Post.findByPk(id, {
      include: [{
        model: User,
        attributes: ['username'],
        as: 'author'
      }]
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error(`Error fetching post ${id}:`, error);
    res.status(500).json({ message: 'Error fetching post' });
  }
});


// Create a new comment
app.post('/comment', async (req, res) => {
  const { postId, authorId, content } = req.body;

  if (!postId || !authorId || !content) {
    return res.status(400).json({ message: 'postId, authorId, and content are required' });
  }

  try {
    const comment = await Comment.create({ postId, authorId, content });
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Error creating comment' });
  }
});


// Get comments for a specific post
app.get('/comments/:postId', async (req, res) => {
  const { postId } = req.params;

  if (!postId) {
    return res.status(400).json({ message: 'Post ID is required' });
  }

  try {
    const comments = await Comment.findAll({ 
      where: { postId }, 
      include: { 
        model: User, 
        as: 'author', 
        attributes: ['id', 'username']
      } 
    });

    if (comments.length === 0) {
      return res.status(404).json({ message: 'No comments found for this post' });
    }
    
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Error fetching comments' });
  }
});


// Update a comment
app.put('/comment/:id', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!id || !content) {
    return res.status(400).json({ message: 'Comment ID and content are required' });
  }
  
  try {
    const comment = await Comment.findByPk(id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    await comment.update({ content });
    res.json(comment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ message: 'Error updating comment' });
  }
});


// Delete comment
app.delete('/comment/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: 'Comment ID is required' });
  }

  try {
    const comment = await Comment.findByPk(id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    await comment.destroy();
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Error deleting comment' });
  }
});

/*
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
*/
