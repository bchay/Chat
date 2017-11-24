var UserModel = require("./../mongodb-models.js").users;
var cookieParser = require("cookie-parser");
var cookie = require("cookie");
var sanitizeHtml = require("sanitize-html");
var bcrypt = require("bcrypt-nodejs");
var debug = require('debug')('app');
var app = require('../app');

var onlineUsers = {};

module.exports.onlineUsers = onlineUsers;

module.exports.io = function(io) {
	io.sockets.on("connection", function(socket) {
		var user = require("cookie").parse(socket.request.headers.cookie).user;
		var secret = process.env.COOKIE_SECRET;
		var decode = require("client-sessions").util.decode;
		var decoded = decode({cookieName: "user", secret: secret}, user);
		var username = decoded.content.username;
		var replacements;
		var prefix;
		var suffix;
		onlineUsers[username] = {};
		onlineUsers[username].username = username;
		onlineUsers[username].chatting = [];
		onlineUsers[username].wishToChat = [];
		onlineUsers[username].socket = socket;

		socket.broadcast.emit("userConnected", username);
		
		UserModel.findOne({"username": username}, function(error, docs) {
			if(error) console.log(error)
			onlineUsers[username].socket.emit("notification", docs.notifications);
		});
		
		socket.on("removeNotification", function(notification) {
			UserModel.update({username: username}, {$pull: {notifications: {type: notification.type, content: notification.content}}}, function(err) {
				if(err) console.log(err);
			});
		});
		
		socket.on("initiateChat", function(user) {
			if(user && onlineUsers[username] && onlineUsers[username].wishToChat.indexOf(user) === -1) {
				UserModel.findOne({username: username}, function(err, docs) {
					if(docs.friends.indexOf(user) > -1) {
						onlineUsers[username].wishToChat.push(user);
						onlineUsers[user].wishToChat.push(username);
						if(onlineUsers[user]) onlineUsers[user].socket.emit("startChat", username);
					} else console.log("An error has occurred");
				});
			}
		});
		
		socket.on("chatAccepted", function(user) {
			UserModel.findOne({username: user}, function(err, docs) {
				if(docs && docs.friends.indexOf(username) > -1) {
					if(onlineUsers[user] && onlineUsers[user].wishToChat.indexOf(username) > -1) onlineUsers[user].chatting.push(username);
					onlineUsers[username].chatting.push(user);
					onlineUsers[username].socket.emit("beginChat", user);
					onlineUsers[user].socket.emit("beginChat", username);

					onlineUsers[username].socket.emit("chat message", "<li>-- " + onlineUsers[user].username + " has begun chatting with you. --</li>", user);
					onlineUsers[user].socket.emit("chat message", "<li>-- " + username + " has begun chatting with you. --</li>", username);
					onlineUsers[user].wishToChat.splice(onlineUsers[user].wishToChat.indexOf(username), 1); //remove username from user's wishToChat
					onlineUsers[username].wishToChat.splice(onlineUsers[username].wishToChat.indexOf(user), 1); //remove user from username's wishToChat
				}
			});
		});
		
		socket.on("chatDenied", function(user) {
			onlineUsers[username].wishToChat.splice(onlineUsers[username].wishToChat.indexOf(user), 1);
			onlineUsers[user].wishToChat.splice(onlineUsers[user].wishToChat.indexOf(username), 1);
			if(onlineUsers[user]) onlineUsers[user].socket.emit("chatDenied", username);
		});
		
		socket.on("sendMessageOffline", function(to, str) {
			if(!onlineUsers[to]) {
				UserModel.findOne({username: username}, function(err, docs) {
					if(docs.friends.indexOf(to) > -1) {
						UserModel.update({username: to}, {$push: {notifications: {type: "notification", content: username + " has sent you a message: " + str}}}, function(err) {
							if(err) socket.emit("errorOccurred", "An error has occurred.");
						});
					}
				});
			} else socket.emit("errorOccurred", "You may only send messages to offline users. Please initiate a chat if you wish to contact a user that is online.");
		});
		
		socket.on("chat message", function(msg, to) {
			if(msg && msg !== "" && to && to !== "") {
				msg = msg.toString();
				to = to.toString();
				if(onlineUsers[username] && onlineUsers[to] && onlineUsers[username].chatting.indexOf(to) > -1 && onlineUsers[to].chatting.indexOf(username) > -1) {
					msg = msg.replace(new RegExp("(http(s)?://www\.[^ ]+)", "g"), "<a href = \"$1\" target = \"_blank\">$1</a>"); //Convert link to <a> tag
					
					var allowedHTML = {
						allowedTags: [
							"b", "i", "a"
						], 
						allowedAttributes: {
							"a": ["href", "target"],
						}
					};
					msg = "<li>" + username + ": " + sanitizeHtml(msg, allowedHTML) + "</li>";
					onlineUsers[username].socket.emit("chat message", msg, to);
					onlineUsers[to].socket.emit("chat message", msg, username);
				} //Person chatting has disconnected
			}
		});
		
		socket.on("addFriend", function(friend) {
			friend = friend.toString();
			if(friend !== username) {
				UserModel.findOne({username: username}, function(err, docs) {
					if(docs.blockedBy.indexOf(friend) > -1) onlineUsers[username].socket.emit("errorOccurred", friend + " has blocked you.")
					else if(docs.friends.indexOf(friend) > -1) onlineUsers[username].socket.emit("errorOccurred", friend + " is already your friend.");
					else if(docs.requestedFriends.indexOf(friend) > -1) onlineUsers[username].socket.emit("errorOccurred", "You have already sent a request to " + friend + ".");
					else {
						if(docs.blocked.indexOf(friend > -1)) {
							UserModel.update({username: username}, {$pull: {blocked: friend}}, function(err) {
								if (err) console.log(err);
								else {
									UserModel.update({username: friend}, {$pull: {blockedBy: username}}, function(err) {
										if (err) console.log(err);
									});
								}
							});
						}

						UserModel.count({username: username}, function(err, count) {
							if(err) console.log(err);
							if(count === 1) {
								UserModel.update({"username": username}, {$addToSet: {"requestedFriends": friend}}, function(err) {
									if(err) {
										console.log(err);
										onlineUsers[username].socket.emit("errorOccurred", "An error has occurred.")
									} else {
										UserModel.update({username: friend}, {$addToSet: {pendingFriends: username}}, function(error) {
											if(error) console.log(error);
										});
										if(onlineUsers[friend]) onlineUsers[friend].socket.emit("friendRequest", username);
										else {
											UserModel.update({username: friend}, {$push: {notifications: {"type": "pendingFriend", "content": username}}}, function(err) {
												if(err) console.log(err);
											});
										}
									}
								});
							} else onlineUsers[username].socket.emit("errorOccurred", "You have entered an invalid username.");
						});
					}
				});
			}
		});
		
		socket.on("friendAccepted", function(friend) {
			UserModel.findOne({username: friend}, function(err, docs) {
				if(err) onlineUsers[username].socket.emit("errorOccurred", "An error occurred.");
				else {
					if(docs) {
						if(docs.blocked.indexOf(username) > -1) onlineUsers[username].socket.emit("errorOccurred", friend + " has blocked you.")
						else if(docs.requestedFriends.indexOf(username) > -1) {
							UserModel.findOne({username: username}, function(err, docs) {
								if(err) onlineUsers[username].socket.emit("errorOccurred", "An error occurred.");
								else {
									var pending = docs.pendingFriends;
									if(pending.indexOf(friend) > -1) {
										UserModel.update({username: friend}, {$addToSet: {friends: username}, $pull: {requestedFriends: username}}, function(err) {
											if(err) onlineUsers[username].socket.emit("errorOccurred", "An error occurred");
											else {
												UserModel.update({username: username}, {$addToSet: {friends: friend}, $pull: {pendingFriends: friend}}, function(err) {
													if(err) onlineUsers[username].socket.emit("errorOccurred", "An error occurred");
													else {
														if(onlineUsers[friend]) {
															onlineUsers[username].socket.emit("addFriendtoList", friend, true);
															onlineUsers[friend].socket.emit("addFriendtoList", username, true);
														} else {
															onlineUsers[username].socket.emit("addFriendtoList", friend, false);
															UserModel.update({username: friend}, {$push: {notifications: {"type": "notification", "content": username + " is now your friend."}}}, function(err) {
																if(err) console.log(err);
															});
														}
													}
												});
											}
										});
									} else onlineUsers[username].socket.emit("errorOccurred", "An error occurred.");
								}
							});
						} else onlineUsers[username].socket.emit("errorOccurred", "An error occurred.");
					} else onlineUsers[username].socket.emit("errorOccurred", "An error occurred.");
				}
			});
		});
		
		socket.on("friendDenied", function(friend) {
			UserModel.findOne({username: friend}, function(err, docs) {
				if(err) onlineUsers[username].socket.emit("errorOccurred", "An error occurred.");
				else {
					if(docs) {
						var request = docs.requestedFriends;
						if(request.indexOf(username) > -1) {
							UserModel.find({username: username}, function(err, docs){
								if(err) onlineUsers[username].socket.emit("errorOccurred", "An error occurred.");
								else {
									var pending = docs[0].pendingFriends;
									if(pending.indexOf(friend) > -1) {
										UserModel.update({username: friend}, {$push: {blockedBy: username}, $pull: {requestedFriends: username}}, function(err) {
											if(err) onlineUsers[username].socket.emit("errorOccurred", "An error occurred");
											else {
												UserModel.update({username: username}, {$push: {blocked: friend}, $pull: {pendingFriends: friend}}, function(err) {
													if(err) onlineUsers[username].socket.emit("errorOccurred", "An error occurred");
												});
											}
										});
									} else onlineUsers[username].socket.emit("errorOccurred", "An error occurred.");
								}
							});
						} else onlineUsers[username].socket.emit("errorOccurred", "An error occurred.");
					} else onlineUsers[username].socket.emit("errorOccurred", "An error occurred.");
				}
			});
		});
		
		socket.on("remove", function(remove) {
			UserModel.findOne({username: username}, function(err, docs) {
				if(err) console.log(err);
				else if(docs.friends.indexOf(remove) > -1) {
					UserModel.findOne({username: remove}, function(err, docs) {
						if(err) console.log(err);
						else if(docs.friends.indexOf(username) > -1) {
							UserModel.update({username: username}, {$pull: {friends: remove}, $push: {blocked: remove}}, function(err) {
								if(err) console.log(err);
								else {
									UserModel.update({username: remove}, {$pull: {friends: username}, $push: {blockedBy: username}}, function(err) {
										if(err) console.log(err);
									});
								}
							});
						} else onlineUsers[username].socket.emit("errorOccurred", "An error has occurred.")
					});
				}
			});
		});
		
		socket.on("checkOnline", function(friendsArray) {
			var online = Object.keys(onlineUsers);
			var onlineFriends = [];

			for(var i = 0; i < friendsArray.length; i++) {
				if(online.indexOf(friendsArray[i]) > -1) onlineFriends.push(friendsArray[i]);
			}
      
			onlineUsers[username].socket.emit("listOfOnlineFriends", onlineFriends);
		});
		
		socket.on("closedTab", function(user) { //username of the person you were chatting with
			onlineUsers[username].chatting.splice(onlineUsers[username].chatting.indexOf(user), 1);
			onlineUsers[user].chatting.splice(onlineUsers[user].chatting.indexOf(username), 1);
			onlineUsers[user].socket.emit("userDisconnected", username, user, "closedTab");
		});
		
		socket.on("disconnect", function() {
			if(onlineUsers[username]) {
				socket.broadcast.emit("userDisconnected", username, "disconnect");
				for(var i = 0; i < onlineUsers[username].chatting.length; i++) {
					onlineUsers[onlineUsers[username].chatting[i]].chatting.splice(onlineUsers[onlineUsers[username].chatting[i]].chatting.indexOf(username), 1); //Remove you from their chatting
				}
				delete onlineUsers[username];
			}
		});
	});
}