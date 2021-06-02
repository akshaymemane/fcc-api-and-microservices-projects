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
