// load the things we need
var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require("body-parser");

var PORT = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false, limit: 100000000, parameterLimit: 100000000}));
app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log( `${req.method} ${req.url}`);
  next();
});

// index page 
app.get('/', function(req, res) {
	res.render('pages/index');
});

app.use('/api', require('./api'));

app.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});