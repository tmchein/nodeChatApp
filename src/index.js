const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");

//Load user methods
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

//Load bad words library
const Filter = require("bad-words");

//Load socket io
const socketio = require("socket.io");
//set up support for web sockets
const http = require("http");
//To use express we need to do it in a certain way
const express = require("express");
const path = require("path");

const app = express();
//re factoring server initialization
const server = http.createServer(app);

//Socket io expects to be called with a raw http server
//This is why we pass the express app to the http core module

//Create a new instance of socketio for configuration
const io = socketio(server);

const port = 3000 || process.env.PORT;

app.use(express.static(path.join(__dirname, "../public")));

//Connection event, socket for a single client and io for overall client
io.on("connection", (socket) => {
  socket.on("join", (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);
    socket.emit("message", generateMessage("System", `Welcome! [^_^]`));

    //Overall for all the clients except the one whos triggering the event
    //socket.emit sends event to specific client
    //io.emit to every client
    //socket.broadcast.emit to every client except yours
    //io.to.emit to is a function and this emits an event to everybody in a specific room
    //Theres also socket.broadcast.to.emit which works in the same philosophy than the one up above
    socket.broadcast
      .to(user.room)
      .emit("message", generateMessage(`${user.username} has joined`));

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();
    if (filter.isProfane(message)) {
      return callback("Profanity is not allowed");
    }
    io.to(user.room).emit("message", generateMessage(user.username, message));
    callback();
  });

  socket.on("sendLocation", (data, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        `https://www.google.com/maps?q=${data.lat},${data.long}`
      )
    );
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage(`${user.username} has disconnected`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

//instead of using app listen we are using server
server.listen(port, () => {
  console.log("Server listening on port 3000");
});
