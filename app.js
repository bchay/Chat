var express = require('express')
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var compression = require("compression");
var session = require("client-sessions");
var enforce = require('express-sslify');
require('dotenv').config();

var index = require("./routes/index");
var static = require("./routes/static");

var app = express();

if(process.env.ENV === "production") app.use(enforce.HTTPS({ trustProtoHeader: true }));

app.use(compression());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {maxage: 31550000000}));

app.use(session({
	cookieName: 'user',
	secret: process.env.COOKIE_SECRET,
	duration: 1000 * 60 * 60 * 24 * 30,
	activeDuration: 1000 * 60 * 10,
	httpOnly: true,
	secure: true
}));

app.use('/', index);
app.use("/", static);

//catch 404
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

//development error handler
if (process.env.ENV === 'development') {
    app.use(function(err, req, res, next) {
      res.status(err.status || 500);
		  res.render("error", {error: err});
    });
}

//production error handler
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    if(err.status === 404) {
	   res.render("404");
    } else {
	   res.render("error");
    }
});

module.exports = app;