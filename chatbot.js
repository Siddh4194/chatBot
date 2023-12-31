////////// packages -----------------------------------------------
const express = require("express");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const fs = require("fs");
const {chatData_All} = require("./gemini");
// const tf = require('@tensorflow/tfjs-node');
// const run = require("./gemini");
const env = require('dotenv').config();


const { GoogleGenerativeAI } = require("@google/generative-ai");
// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
// tensorflow.js node model
// the value of predicted que no is returned
// async function load_model(data) {
//   // console.log(data);
//   const m =  await tf.loadLayersModel('file:///react/chatbot/model/model.json');
//   let prediction = await m.predict(tf.stack([tf.tensor1d(data)])).data();
//   let score = Math.max(...prediction);
//   const no = prediction.indexOf(Math.max(...prediction))
//   console.log(no+":"+score);
//   return Promise.resolve([no, score]);
// }

// Brain.js Lerned model are getting in use

// const state = JSON.parse(fs.readFileSync('new.json'));
// const net1 = new brain.recurrent.LSTM();
// net1.fromJSON(state);


// local mongodb connection is extablished

// mongoose.connect('mongodb://127.0.0.1:27017/studentDatabase', {
//   useNewUrlParser: true
// });


var pass = process.env.DB_PASSWORD;

mongoose.connect(pass, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected to MongoDB');
});

// student schema created

const studentSchema = new mongoose.Schema({
  name : String, //we can specify only true also  and [true,"check the entered data"] also like this
  whatsapp_no :{
    type : Number
  }, 
  email :String,
  added_AT:Date
});

const Student = mongoose.model("Student",studentSchema);


// Prediction insights
const collectionSchema = new mongoose.Schema({
  predictedQueNo : Number,
  accuracy:Number,
  userquestion:String,
  added_AT:Date
});

// wrong answers
const wrongAnswer = mongoose.model("WrongAnswer", collectionSchema);

const badResponceSchema = new mongoose.Schema({
  userInput1:String,
  botResponce1:String,
  added_AT:Date
});

// /bad responce
const badResponse = mongoose.model("BadResponse", badResponceSchema);

// good response
const goodResponceSchema = new mongoose.Schema({
  userInput:String,
  botResponce:String,
  added_AT:Date
});

const goodResponse = mongoose.model("GoodResponse", goodResponceSchema);

// Feedtext response

const feedbackSchema = new mongoose.Schema({
  Rating:Number,
  Catagory:String,
  feedText:String,
  added_AT:Date
});

const FeedBack = mongoose.model("FeedBack", feedbackSchema);
// initialized the express
const app = express();
app.use(
  express.urlencoded({ extended: true })
);
  
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // This line is sufficient for parsing URL-encoded data
app.use(express.static("public"));

// Initialize the view engine
app.set("view engine", "ejs");
app.set('view options', {
  strict: true,
  destructuredLocals: ["user", "timestamp"],
});
// app.set('views', './views');





// student data is posted
app.post("/post",function(req,res){
  var name = req.body.name;
  var wpno = req.body.no;
  var email = req.body.mail;
  var newStudent = new Student({
    name:name,
    whatsapp_no:wpno,
    email:email,
    added_AT:new Date()
  });
  newStudent.save();
  res.send({response:"success"});
});


app.post("/downthumb",(req, res) => {
  var bad = new badResponse({
    userInput1:req.body.userInput,
    botResponce1:req.body.botResponce,
    added_AT:new Date()
  })
  bad.save();
  res.send({response:"success"});
});

app.post("/upthumb",(req, res) => {
  var good = new goodResponse({
    userInput:req.body.userInput,
    botResponce:req.body.botResponce,
    added_AT:new Date()
  });
  good.save();
  res.send({response:"success"});
});

app.post("/feeddata",(req, res) => {
  var feed = new FeedBack({
    Rating:req.body.rating,
    Catagory:req.body.catagory,
    feedText:req.body.feedText,
    added_AT:new Date()
  })
  feed.save();
  res.send({response:"success"});
})

//creating the file for nural network

// the user unput is fetched and give back the predictios.
let chatInstance;
async function run(string) {
  // For text-only input, use the gemini-pro model
  const model = genAI.getGenerativeModel({ model: "gemini-pro"});
  console.log(chatData_All[chatData_All.length - 1]);
  chatInstance = model.startChat({
    history: [
      {
        role: "user",
        parts: chatData_All
        // ["Developed by Siddhant Dhanaji Kadam student at NMCOE.Peth To assist student to give the positive fedback for there further jurney","programmed by Siddhant Dhanaji Kadam, And programmed in such way that I can Guide students for there admission process and many more"],
      },
      {
        role: "model",
        parts: "Great to meet you. What would you like to know?",
      },
    ],
    generationConfig: {
      maxOutputTokens: 400,
    },
  });
  const result = await chatInstance.sendMessage(string);
  const response = await result.response;
  const text = response.text();
  console.log(text);
  return text;
  // console.log("model is loaded successfully");
}

async function renderModelReply(string){
  const result = await chatInstance.sendMessage(string);
  const response = await result.response;
  const text = response.text();
  console.log(text);
  return text;
}

app.post("/predict",async (req,res) => {
  console.log(req.body.input);
  let pred = await run(req.body.input);
  res.send({responce:pred});
});

app.post("/api/predict",async (req,res) => {
  console.log(req.body.input);
  let pred = await run(req.body.input);
  res.send({responce:pred});
});

app.post("/wrongAnswer",(req, res) => {
  var newQue = new wrongAnswer({
    predictedQueNo:req.body.predQue,
    accuracy:req.body.accuracy,
    userquestion:req.body.userInput,
    added_AT:new Date()
  });
  newQue.save();
    res.send({response:"Your Question is stored to process. I'll process it shortly."});
});


app.get('/getStatus',(req,res)=>{
try {
  require.resolve('@google/generative-ai');
  res.send('Package is installed.');
} catch (error) {
  res.send('Package is not installed.');
}
	// res.send(chatData_All);
// res.sendFile("public/chatbot.html");
	// res.render("chatbot");
	  // res.render("chatbot");
});

  
////////// server  -----------------------------------------------
// main page render
app.get('/',(req,res)=>{
    res.send(chatData_All);
// res.sendFile("public/chatbot.html");
	// res.render("chatbot");
	  // res.render("chatbot");
});


app.listen(process.env.PORT || 500 , function() {
    console.log("Server started on port 500");
	// run();
});
