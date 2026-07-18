import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";

// Track online users: userId -> socketId
const onlineUsers = new Map();

export const socketHandler = (io) => {
  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    // Mark user online
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, { status: "online" });
    io.emit("user:online", { userId });

    // Join a conversation room
    socket.on("conversation:join", (conversationId) => {
      socket.join(conversationId);
    });

    // Leave a conversation room
    socket.on("conversation:leave", (conversationId) => {
      socket.leave(conversationId);
    });

    // Handle sending a message
    socket.on("message:send", async ({ conversationId, content, mediaUrl, mediaType }) => {
      try {
        const message = await Message.create({
          conversationId,
          sender: userId,
          content: content || "",
          mediaUrl: mediaUrl || "",
          mediaType: mediaType || null,
          readBy: [userId],
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
        });

        const populatedMessage = await message.populate("sender", "username avatar");

        io.to(conversationId).emit("message:receive", populatedMessage);
      } catch (error) {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Typing indicators
    socket.on("typing:start", ({ conversationId }) => {
      socket.to(conversationId).emit("typing:start", { conversationId, userId });
    });

    socket.on("typing:stop", ({ conversationId }) => {
      socket.to(conversationId).emit("typing:stop", { conversationId, userId });
    });

    // Mark message as read
    socket.on("message:read", async ({ messageId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { readBy: userId },
        });
        io.emit("message:read", { messageId, userId });
      } catch (error) {
        socket.emit("error", { message: "Failed to mark message as read" });
      }
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.user.username}`);
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, {
        status: "offline",
        lastSeen: new Date(),
      });
      io.emit("user:offline", { userId, lastSeen: new Date() });
    });
  });
};





// "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNWJjMDc0N2I4ZTY1ODI1MTk4YTNkMCIsImlhdCI6MTc4NDM5Nzk0MCwiZXhwIjoxNzg0Mzk5MTQwfQ.bkUrGdYbSjrYrCLdosxQDjggVfoK3XnDVgrYZtSL6uw"