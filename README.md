# Pesterchum

![Screenshot](https://raw.githubusercontent.com/bchay/Chat/master/images/Site-Screenshot.png)

This project is a fully functional chat client developed in Node.js using Express. It enables one to sign up for an acccount and to then send friend requests to other users. Messages are sent using Socket.IO, and chat occurs in realtime.

## Getting Started
Create an account, and add a friend. You can then send messages to one another. You can add additional friends, block others, and send messages to offline users.

### Installing

You can use this program by going to [Chat](), or running your own version of the code. Once the code is cloned, run the `npm install` command. Then, start up a [MongoDB](https://www.mongodb.com/) database, with a dbpath option of `./data/db`, which runs at the /data/db folder of the cloned repository. Then, run `mongo mongo-config.js` from the root of the repository to properly configure the database. Create a file named .env, and add `COOKIE_SECRET=` and then a large, randomly generated string. Save this to the project root. Finally, run `npm start` to finish the setup and launch the program. Navigate to localhost:8080 to view the project. The mongodb server must be running simultaneously. 

## Built With

* [Node.js](https://nodejs.org/)
* [Express](https://expressjs.com/)
* [MongoDB](https://www.mongodb.com/)