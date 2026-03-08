const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

const rooms = {}; // { roomName: { users: { socketId: username } } }

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("joinRoom", ({ username, room }) => {
    if (!rooms[room]) {
      rooms[room] = { users: {} };
    }

    rooms[room].users[socket.id] = username;
    socket.join(room);

    // Welcome current user
    socket.emit("message", {
      system: true,
      user: "Shat Bot",
      text: `Welcome to #${room}, ${username}!`,
      time: new Date().toISOString()
    });

    // Broadcast to others
    socket.to(room).emit("message", {
      system: true,
      user: "Shat Bot",
      text: `${username} joined #${room}`,
      time: new Date().toISOString()
    });

    // Update room user list
    io.to(room).emit("roomUsers", {
      room,
      users: Object.values(rooms[room].users)
    });
  });

  socket.on("chatMessage", ({ room, text }) => {
    const username = getUsernameFromSocket(socket.id, room);
    if (!username) return;

    io.to(room).emit("message", {
      system: false,
      user: username,
      text,
      time: new Date().toISOString()
    });
  });

  socket.on("disconnecting", () => {
    const joinedRooms = [...socket.rooms].filter((r) => r !== socket.id);
    joinedRooms.forEach((room) => {
      const username = getUsernameFromSocket(socket.id, room);
      if (rooms[room] && rooms[room].users[socket.id]) {
        delete rooms[room].users[socket.id];

        socket.to(room).emit("message", {
          system: true,
          user: "Shat Bot",
          text: `${username} left #${room}`,
          time: new Date().toISOString()
        });

        io.to(room).emit("roomUsers", {
          room,
          users: Object.values(rooms[room].users)
        });

        if (Object.keys(rooms[room].users).length === 0) {
          delete rooms[room];
        }
      }
    });
  });
});

function getUsernameFromSocket(socketId, room) {
  if (!rooms[room]) return null;
  return rooms[room].users[socketId];
}

server.listen(PORT, () => {
  console.log(`Shat server running on http://localhost:${PORT}`);
});
