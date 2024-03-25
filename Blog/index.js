/* jshint esversion: 8 */
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import bodyParser from 'body-parser';
import axios from 'axios';
import dotenv from 'dotenv';
import session from 'express-session';
import mongoose from 'mongoose';
dotenv.config({ silent: process.env.NODE_ENV === 'production' });
const API_URL = "https://super-erin-clothes.cyclic.app";
const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_TOKEN_KEY; 

let uri = process.env.URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const { Schema } = mongoose;

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SECRET_TOKEN_KEY,
    resave: false,
    saveUninitialized: false,
}));

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
});
const User = mongoose.model('User', userSchema);

app.get('/signup',(req, res) =>{
 res.render('signup.ejs');
});
app.get('/login',(req, res) =>{
    res.render('login.ejs');
   });

   
app.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Check if the user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create a new user object
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Login route
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Find the user by username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        // Compare the password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        // Generate JWT token
        const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1hr' });
        // Store token in session
        req.session.token = token;
       res.redirect('/protected/posts');
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Logout route
app.post('/logout', (req, res) => {
    // Destroy session
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        }
       res.redirect('/login');
    });
});


const authenticateUser = (req, res, next) => {
    // Check if token is present in session
    if (!req.session.token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify JWT token
    jwt.verify(req.session.token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        // Token is valid, set user information in request object for future use
        req.user = decoded;
        next(); // Proceed to the next middleware or route handler
    });
};

// Protected routes
app.use('/protected', authenticateUser);

// Routes accessible under /protected

app.get("/protected/myposts", async (req, res) => {
  try {
    const username = req.user.username;
    const response = await axios.post(`${API_URL}/myposts`,{username});
    res.render("index.ejs", { posts: response.data });
  } catch (error) {
    res.status(500).json({ message: "Error fetching posts" });
  }
});

app.get("/protected/posts", async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/posts`);
    res.render("homepage.ejs", { posts: response.data });
  } catch (error) {
    res.status(500).json({ message: "Error fetching posts" });
  }
});

app.get("/protected/new", (req, res) => {
  const username = req.user.username;
  console.log(username);
  res.render("modify.ejs", { heading: "New Post", submit: "Create Post",author : username});
});

app.get("/protected/edit/:id", async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/posts/${req.params.id}`);
    console.log(response.data);
    res.render("modify.ejs", {
      heading: "Edit Post",
      submit: "Update Post",
      post: response.data,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Error fetching post" });
  }
});

app.post("/protected/api/posts", async (req, res) => {
  console.log(req.body);
  try {
    const response = await axios.post(`${API_URL}/posts`, req.body);
    res.redirect("/protected/myposts");
  } catch (error) {
    res.status(500).json({ message: "Error creating post" });
  }
});

app.post("/protected/api/posts/:id", async (req, res) => {
  try {
    const response = await axios.patch(
      `${API_URL}/posts/${req.params.id}`,
      req.body
    );
    res.redirect("/protected/myposts");
  } catch (error) {
    res.status(500).json({ message: "Error updating post" });
  }
});

app.get("/protected/api/posts/delete/:id", async (req, res) => {
  try {
    await axios.delete(`${API_URL}/posts/${req.params.id}`);
    res.redirect("/protected/myposts");
  } catch (error) {
    res.status(500).json({ message: "Error deleting post" });
  }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
