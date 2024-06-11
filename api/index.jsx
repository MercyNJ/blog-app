const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
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

require('dotenv').config();

const app = express();

const salt = bcrypt.genSaltSync(10);
const secret = process.env.SECRET_KEY || 'inlightofeternity';

app.use(cors({credentials:true,origin:'http://localhost:5000'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

mongoose.connect('mongodb+srv://mercinjuguna:m7eQpZQB4LyVZjAf@cluster0.gltmwku.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

// Register route
app.post('/register', async(req, res) => {
	const {username,password} = req.body;
	try{
		const userDoc = await User.create({
			username,
			password:bcrypt.hashSync(password, salt),
		});
	        res.json(userDoc);
	} catch(e) {
		console.log(e);
		res.status(400).json(e);
	}
});

// Login route
app.post('/login', async (req, res) => {
	const {username, password} = req.body;
	const userDoc = await User.findOne({username});
	const passOk = bcrypt.compareSync(password, userDoc.password);
	if (passOk) {
		jwt.sign({username,id:userDoc._id}, secret, {}, (err,token) => {
			if (err) throw err;
			res.cookie('token', token).json({
				id: userDoc._id,
				username,
			});
		});
	} else {
		res.status(400).json('Wrong Credentials');
	}
});


// Fetch user profile info
app.get('/profile', (req, res) => {
	const {token} = req.cookies;
	jwt.verify(token, secret, {}, (err,info) => {
		if (err) throw err;
		res.json(info);
	});
});


// Logout a user
app.post('/logout', (req,res) => {
  res.cookie('token', '').json({ message: 'You have been successfully logged out.' });
});

/* 
   Route for creating a new post with file upload.
   Handles file upload, JWT authentication, and post creation.
*/
app.post('/post', uploadMiddleware.single('file'), async (req,res) => {
  const {originalname,path} = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
  const newPath = path+'.'+ext;
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
app.put('/post',uploadMiddleware.single('file'), async (req,res) => {
  let newPath = null;
  if (req.file) {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path+'.'+ext;
    fs.renameSync(path, newPath);
  }

  const {token} = req.cookies;
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) throw err;
    const {id,title,summary,content} = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json('you are not the author');
    }
    await postDoc.updateOne({
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });

    res.json(postDoc);
  });

});

// Route for deleting a post
app.delete('/post/:id', async (req, res) => {
  const { id } = req.params;
  const { token } = req.cookies;

  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) return res.status(403).json({ message: 'Unauthorized' });

    const postDoc = await Post.findById(id);

    if (!postDoc) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json({ message: 'You are not the author' });
    }

    await postDoc.deleteOne();
    res.json({ message: 'Post deleted successfully' });
  });
});


/*
// Route for fetching & sending most recent 20 posts with author usernames
app.get('/post', async (req,res) => {
  res.json(
    await Post.find()
      .populate('author', ['username'])
      .sort({createdAt: -1})
      .limit(20)
  );
}); */


// Fetch posts with optional category filter
app.get('/post', async (req, res) => {
  const { category } = req.query;
  let query = {};

  if (category) {
    query = { category };
  }

  try {
    const posts = await Post.find(query)
      .populate('author', ['username'])
      .sort({ createdAt: -1 })
      .limit(20);
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
    const posts = await Post.find({ category })
      .populate('author', ['username'])
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(posts);
  } catch (error) {
    console.error(`Error fetching ${category} posts:`, error);
    res.status(500).json({ message: `Error fetching ${category} posts` });
  }
});

// Fetch a specific post by its ID from db
app.get('/post/:id', async (req, res) => {
  const {id} = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username']);
  res.json(postDoc);
})


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
    const comments = await Comment.find({ postId }).populate('author', ['username']);
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
    const comment = await Comment.findByIdAndUpdate(id, { content }, { new: true });
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
    await Comment.findByIdAndDelete(id);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Error deleting comment' });
  }
});

app.listen(3000);
