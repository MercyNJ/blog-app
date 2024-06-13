require('dotenv').config();

const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST;

// Print environment variables
console.log(`DB_NAME: ${dbName}`);
console.log(`DB_USER: ${dbUser}`);
console.log(`DB_PASSWORD: ${dbPassword}`);
console.log(`DB_HOST: ${dbHost}`);

const express = require('express');
const cors = require('cors');
const sequelize = require('./database');
const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({dest: 'uploads/' });
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');


const app = express();

const salt = bcrypt.genSaltSync(10);
const secret = process.env.SECRET_KEY || 'inlightofeternity';

app.use(cors({credentials:true,origin:'http://localhost:5000'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

sequelize.sync({ force: true })
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


// Register route
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, salt);
    const newUser = await User.create({
      username,
      password: hashedPassword,
    });

    res.json(newUser);
  } catch (e) {
    console.error(e);
    res.status(400).json(e);
  }
});


// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.findOne({ where: { username } });
    if (!userDoc) {
      return res.status(400).json({ error: 'User not found' });
    }

    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
      jwt.sign({ username, id: userDoc.id }, secret, {}, (err, token) => {
        if (err) throw err;
        res.cookie('token', token, { httpOnly: true }).json({
          id: userDoc.id,
          username,
        });
      });
    } else {
      res.status(400).json('Wrong Credentials');
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Fetch user profile info
app.get('/profile', (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    User.findByPk(info.id)
      .then(user => {
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ id: user.id, username: user.username });
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
      });
  });
});


// Logout a user
app.post('/logout', (req, res) => {
  res.cookie('token', '', { httpOnly: true }).json({ message: 'You have been successfully logged out.' });
});


/* 
   Route for creating a new post with file upload.
   Handles file upload, JWT authentication, and post creation.
*/
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

    // Delete the original unresized image file
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
        author: info.id,
      });
      res.json(postDoc);
    });
  } catch (err) {
    console.error('Error processing image:', err);
    res.status(500).send('Error processing image');
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
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path + '.' + ext;
    fs.renameSync(path, newPath);
  }

  const { token } = req.cookies;
  jwt.verify(token, process.env.SECRET_KEY || 'inlightofeternity', {}, async (err, info) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id, title, summary, content } = req.body;

    try {
      // Find the post by ID
      const post = await Post.findByPk(id);

      // Check if the user is the author of the post
      if (post.authorId !== info.id) {
        return res.status(403).json({ message: 'You are not the author of this post' });
      }

      // Update the post with new data
      const updatedPost = await post.update({
        title,
        summary,
        content,
        cover: newPath ? newPath : post.cover
      });

      res.json(updatedPost);
    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).send('Error updating post');
    }
  });
});



// Route for deleting a post
app.delete('/post/:id', async (req, res) => {
  const { id } = req.params;
  const { token } = req.cookies;

  jwt.verify(token, process.env.SECRET_KEY || 'inlightofeternity', {}, async (err, info) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      // Find the post by ID
      const post = await Post.findByPk(id);

      // Check if the post exists
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      // Check if the user is the author of the post
      if (post.authorId !== info.id) {
        return res.status(403).json({ message: 'You are not the author of this post' });
      }

      // Delete the post
      await post.destroy();

      res.json({ message: 'Post deleted successfully' });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).send('Error deleting post');
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

    res.json(posts);
  } catch (error) {
    console.error(`Error fetching ${category} posts:`, error);
    res.status(500).json({ message: `Error fetching ${category} posts` });
  }
});



// Fetch a specific post by its ID from db
app.get('/post/:id', async (req, res) => {
  const { id } = req.params;

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
    res.status(500).json({ message: `Error fetching post ${id}` });
  }
});


// Create a new comment
app.post('/comment', async (req, res) => {
  const { postId, author, content } = req.body;

  try {
    const comment = await Comment.create({ postId, author, content });
    res.json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Error creating comment' });
  }
});


// Get comments for a specific post
app.get('/comments/:postId', async (req, res) => {
  const { postId } = req.params;

  try {
    const comments = await Comment.findAll({ where: { postId }, include: ['author'] });
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



// Delete a comment
app.delete('/comment/:id', async (req, res) => {
  const { id } = req.params;

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


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

