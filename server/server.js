import http from "http";
import { Server } from "socket.io";
import dns from "dns";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import app from "./app.js";
import { socketAuth } from "./socket/socketAuth.js";
import { socketHandler } from "./socket/socketHandler.js";

// Force Node to use Google's public DNS for resolving MongoDB's SRV record
dns.setServers(["8.8.8.8", "8.8.4.4"]);

dotenv.config();
connectDB();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // we'll restrict this to the actual frontend URL later
    methods: ["GET", "POST"],
  },
});

io.use(socketAuth);
socketHandler(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});