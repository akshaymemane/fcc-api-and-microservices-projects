// server.js
// where your node app starts
let DB_URI='mongodb+srv://akshaymemane:root@fcc-akshaymemane.xvy0g.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
// init project
var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var app = express();
var bodyParser = require('body-parser');
var shortId = require('shortid');
var multer = require('multer');
var upload = multer({dest : 'uploads/'})

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

mongoose.connect(DB_URI,{useNewUrlParser:true,useUnifiedTopology:true});

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
app.use(cors({optionsSuccessStatus: 200}));  // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});


// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

//Timestamp Microservice
app.get("/api/timestamp/:date?", function (req, res) {
  let dateParam = req.params.date;
  if(parseInt(dateParam) > 10000){
    res.json({unix: new Date(parseInt(dateParam)).getTime(),utc:new Date(parseInt(dateParam)).toUTCString()});
  }
  if(dateParam){
    if(!Date.parse(dateParam)){
      res.json({ error : "Invalid Date" });
    }
    res.json({unix: new Date(dateParam).getTime(),utc:new Date(dateParam).toUTCString()});
  }else{
    res.json({unix: new Date().getTime(),utc:new Date().toUTCString()});
  }  
});

//Request Header Parser Microservice
app.get("/api/whoami", function (req, res) {
  let ip = req.ip;
  let lang = req.headers["accept-language"];
  let sw = req.headers["user-agent"];
  res.json({ipaddress: ip,language: lang,software: sw});
});

//URL Shortner Parser Microservice
var ShortUrlModel = mongoose.model('ShortUrlModel',new mongoose.Schema({
  original_url: String,
  short_url: String
}));

function isURL(str) {
  var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
  var url = new RegExp(urlRegex, 'i');
  return str.length < 2083 && url.test(str);
}

app.post("/api/shorturl", function (req, res) {
  let requestUrl = req.body.url;
  let shortUrl = shortId.generate();

  if(!isURL(requestUrl)){
    res.send({ error: 'invalid url' });
  }

  let newUrl = new ShortUrlModel({
    original_url:requestUrl,
    short_url: shortUrl
  });
  newUrl.save((err,data)=>{
    if(err) return console.log(err);
    res.send({
      original_url:requestUrl,
      short_url:shortUrl
    });
  });
});

app.get('/api/shorturl/:url',(req,res)=>{
  ShortUrlModel.find({short_url:req.params.url},(err,data)=>{
    if(err) return console.log(err);
    res.redirect(data[0].original_url);
  });
});

//Exercise Tracker
var Person = mongoose.model('Person',new mongoose.Schema({username:{type:String,unique:true}}));

app.post("/api/newuser",(req,res)=>{
  let newUser = new Person({username : req.body.username});
  newUser.save((err,data)=>{
    if(err){
      res.send("Username already taken");
    }
    res.send(data);
  });
});

var ExerciseModel = mongoose.model("ExerciseModel",new mongoose.Schema({
  userId:String,
  description:String,
  duration:Number,
  date:Date
}));

app.post("/api/newuser/:_id/exercises",(req,res)=>{
  let newExercise = new ExerciseModel({
    userId:req.params._id,
    description: req.body.description,
    duration: req.body.duration,
    date: req.body.date
  });

  Person.findById(req.params._id,(err,data)=>{
    if(!data){
      res.send("Unknown userId");
    }else{
      let username = data.username;
      newExercise.save((err,data)=>{
        if(err) return console.log(err);
        res.send({userId:data.userId,username:username,description:data.description,duration:data.duration,date:data.date});
      });
    }
  });
});

app.get("/api/newuser/:_id/logs",(req,res)=>{
  const {from,to,limit} = req.query;
  const userId = req.params._id;
  Person.findById(userId,(err,data)=>{
    if(!data){
      res.send("unknown userId");
    }else{
      const username = data.username;
      ExerciseModel.find({userId},{date:{$gte:new Date(from),$lte:new Date(to)}}).select(["id","desctiption","duration","date"]).limit(+limit)
      .exec((err,data)=>{
        let customData = data.map(e=>{
          let formattedDate = new Date(e.date).toDateString();
          return {id:e.id,description:e.description,duration:e.duration,date:e.formattedDate};
        });
        if(!data){
          res.send({
            userId:userId,
            username:username,
            count:0,
            log:[]
          });
        }else{
          res.send({
            userId:userId,
            username:username,
            count:data.length,
            log:customData
          });
        }
      });
    }
  });
});

app.get("/api/users",(req,res)=>{
  Person.find((err,data)=>{
    if(err){
      res.send("No users found!");
    }else{
      res.send(data);
    }
  });
});


//File Metadata Microservice
app.post("/api/fileanalyse", upload.single('upfile'), function (req, res) {
  res.send({
    name:req.file.originalname,
    type:req.file.mimetype,
    size:req.file.size
  });
});


// listen for requests :)
var listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
