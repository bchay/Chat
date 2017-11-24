db = db.getSiblingDB('Chat');
db.createCollection("users");
db.createCollection("online");
db.online.insert({});