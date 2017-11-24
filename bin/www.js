var app = require('../app');

var UserModel = require("./../mongodb-models.js").users;
var OnlineModel = require("./../mongodb-models.js").online;


var cookieParser = require("cookie-parser");
var cookie = require("cookie");
var sanitizeHtml = require("sanitize-html");
var bcrypt = require("bcrypt-nodejs");
var io = require("socket.io");

app.set('port', process.env.PORT || 3000);
var server = app.listen(app.get('port'), function() {
	console.log('Express server listening on port ' + server.address().port);
});

io = io.listen(server);

var main = require("./mainSocket.js");
main.io(io);

io.use(function(socket, next) {
	var user = require("cookie").parse(socket.request.headers.cookie).user;
	var secret = process.env.COOKIE_SECRET;
	var decode = require("client-sessions").util.decode;
	var decoded = decode({cookieName: "user", secret: secret}, user);
	var username = decoded.content.username;
	var id = decoded.content.id;
	
	UserModel.count({"username": username}, function(err, count) {
		if(err) console.log(err);
		else {
			if(count) next();
			else next(new Error("Not authorized"));
		}
	});
});

process.on("SIGINT", function() {
	var onlineList = main.onlineUsers;
	var saveUsers = {};
	for(key in onlineList) {
		if(onlineList.hasOwnProperty(key)) {
			var obj = onlineList[key];
			saveUsers[key] = {chatting: obj.chatting, wishToChat: obj.wishToChat};
		}
	}

	OnlineModel.update({}, {$set: {onlineUsers: saveUsers}}, function(err) {
		if(err) console.log(err);
		process.exit();
	});
});