var mongoose = require('mongoose');
var databaseUrl = process.env.DATABASE_URL || "mongodb://localhost/Chat";
mongoose.Promise = global.Promise;
mongoose.connect(databaseUrl, {useMongoClient: true});

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

var userSchema = mongoose.Schema({
  "fname" : String,
  "lname": String,
  "username": String,
  "pass": String,
  "friends": Array,
  "pendingFriends": Array,
  "requestedFriends": Array,
  "notifications": Array,
  "blocked": Array,
  "blockedBy": Array
});

var UserModel = mongoose.model('users', userSchema);


var onlineSchema = mongoose.Schema({
  onlineUsers: Object
});

var OnlineModel = mongoose.model("online", onlineSchema, "online");

module.exports.users = UserModel;
module.exports.online = OnlineModel;