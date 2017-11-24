var express = require('express');
var router = express.Router();
var bcrypt = require("bcrypt-nodejs");
var UserModel = require("./../mongodb-models.js").users;


router.post('/signUp', function(req, res) {
	var username = req.body.username;
	var pass = req.body.password;
	var confirm = req.body.confirm;
	var message = "";

	if(!(username && pass && confirm)) {
		res.render("signUp", {errorMessage: "An error has occured. Please try again."});
		return;
	}

	if (username == "") message += "You must enter your username. \n";
	if (pass == "") message += "You must enter your password. \n";
	if (pass.match(".{8,128}") === null) message += "Your password must be at least eight characters. \n";
	if (pass != confirm) message += "Your passwords do not match. \n";
	
	if (message !== "") {
		res.render("signUp", {"errorMessage": message});
	} else {
		UserModel.findOne({"username": username}, function (err, docs) {
			if(!docs) {
				bcrypt.genSalt(10, function(err, salt) {
					bcrypt.hash(pass, salt, null, function(err, hash) {
						if (err) console.log(err);

            var userObject = {
              "username": username,
              "pass": hash,
              "friends": [],
              "pendingFriends": [],
              "requestedFriends": [],
              "notifications": [],
              "blocked": [],
              "blockedBy": []
            }

            var user = UserModel(userObject, false);
            user.save(function(err) {
              res.render("login");
            });
					});
				});												
			} else { //Username already exists in database
				res.render('signUp', {
					"errorMessage": "The username " + username + " already exists."
				});
			}
		});
	}
});

router.post('/login', function(req, res) {
	var username = req.body.username;
	var pass = req.body.pass;
	if(!(username && pass)) {
		res.render("login", {errorMessage: "An error has occured. Please try again."});
		return;
	}

  UserModel.findOne({"username": username}, function (error, docs) {
  	if(error) console.log(error);
  	else if (docs) { //username exists
  		bcrypt.compare(pass, docs.pass, function(error, result) {
  			if (error) console.log(error);
  			else if (result) { //user/pass combo correct
  				req.user.username = docs.username;
  				req.user.id = docs._id;
  				res.location("main");
  				res.redirect("main");
        } else { //Wrong username and password combinaton
          res.render("login", {"errorMessage": "You have entered an incorrect username or password. Please try again."});
        }
    	});
  	} else res.render("login", {"errorMessage": "You have entered an incorrect username or password. Please try again."});
  });
});

router.get("/main", function(req, res) {
	if(req.user && req.user.username && req.user.id) {
		UserModel.findOne({"username": req.user.username}, function(err, docs) {
			if(err) console.log(err);

      if(docs) res.render("main", {"username": req.user.username, "friendList": docs.friends});
      else { //No docs found, user is not in database, but req.user was set - can happen if database is cleared
        req.user.reset();
        res.location("home");
        res.redirect("home");
      }
		});
	} else {
		res.location("home");
		res.redirect("home");
	}
});

module.exports = router;