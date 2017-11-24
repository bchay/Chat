var express = require('express');
var router = express.Router();

router.get("/", function(req, res) {
	res.render("home");
});

router.get("/signUp", function(req, res) {
	if(!req.user.username) res.render('signUp');
	else {
		res.location("main");
		res.redirect("main");
	}
});

router.get("/login", function(req, res) {
	if(!req.user.username) res.render("login");
	else {
		res.location("main");
		res.redirect("main");
	}
});

router.get("/logout", function(req, res) {
	if(req.user) req.user.reset();
	res.location("home");
	res.redirect("home");
});

router.get("/error", function(req, res) {
	res.render("error");
});

router.get("/home", function(req, res) {
	res.render("home");
});

module.exports = router;