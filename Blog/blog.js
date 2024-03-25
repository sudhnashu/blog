/* jshint esversion: 8 */
import express from "express";
import bodyParser from "body-parser";
import mongoose from 'mongoose';

const app = express();
const port = 4000;
let uri = 'mongodb+srv://DB_username:DB_password@cluster0.ykxusfx.mongodb.net/?retryWrites=true&w=majority';
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const { Schema } = mongoose;

const blogSchema = new Schema({
  Blogid: {
    type: Number,
    unique: true
  },
  title: String,
  content: String,
  author: String,
  date: {
    type: Date,
    default: Date.now
  }
});


blogSchema.pre('save', async function(next) {
  const doc = this;
  try {
    console.log('Before saving document:', doc);
    const highestBlog = await Blog.findOne({}, 'Blogid').sort({ Blogid: -1 }).exec();
    if (highestBlog) {
      doc.Blogid = highestBlog.Blogid + 1;
    } else {
      doc.Blogid = 1; // If no documents found, set blogId to 1
    }
    console.log('After auto-increment:', doc);
    next();
  } catch (error) {
    next(error);
  }
});

const Blog = mongoose.model('Blog', blogSchema);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/myposts",async(req,res)=>{
  try {
    const filteredPosts = await Blog.find({ author: req.body.username }).sort({ _id: -1 });
    res.json(filteredPosts);
  } catch (error) {
    res.status(500).send(error.message);
  }
  });
  

app.get("/posts",async(req,res)=>{
  try {
    const allPosts = await Blog.find().sort({ _id: -1 });
    res.json(allPosts);
  } catch (error) {
    res.status(500).send(error.message);
  }
});


app.get("/posts/:id",async(req,res)=>{
  const id = parseInt(req.params.id);
  const foundpost = await Blog.find({ Blogid: id});
  if (!foundpost) {
    return res.status(404).send("Post not found");
  }
  const foundPost = foundpost[0];
  const response = {
    id: foundPost.Blogid,
    title: foundPost.title,
    content: foundPost.content,
    author: foundPost.author,
    date: foundPost.date
  };
  res.json(response);
});


app.post("/posts",async(req,res)=>{
  console.log(req.body);
  try{
    const post = {
      title: req.body.title,
    content:req.body.content,
    author: req.body.author,
    };
    const article = new Blog(post);
      await article.save();
    console.log('Posts saved successfully.');
    return res.json(post);
  }
  catch (error) {
    console.error('Error saving posts:', error);
  }
});


app.patch("/posts/:id",async(req, res)=>{
  const id = parseInt(req.params.id);
  try {
    const post = await Blog.findOneAndUpdate(
      { Blogid: id },
      {
        title: req.body.title,
        content: req.body.content,
        author: req.body.author,
      },
      { new: true }
    );
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/posts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const deletedPost = await Blog.findOneAndDelete({ Blogid: id });
    if (deletedPost) {
      res.sendStatus(200);
    } else {
      console.log("No post found with the specified ID.");
      res.status(404).send("No post found with the specified ID.");
    }
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`API is running at http://localhost:${port}`);
});
