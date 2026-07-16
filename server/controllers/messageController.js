import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";

// @desc  Send a message
// @route POST /api/messages
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, mediaUrl, mediaType } = req.body;

    if (!conversationId || (!content && !mediaUrl)) {
      return res.status(400).json({
        message: "conversationId and either content or mediaUrl are required",
      });
    }

    const message = await Message.create({
      conversationId,
      sender: req.user._id,
      content: content || "",
      mediaUrl: mediaUrl || "",
      mediaType: mediaType || null,
      readBy: [req.user._id], // sender has implicitly "read" their own message
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
    });

    const populatedMessage = await message.populate("sender", "username avatar");

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get all messages in a conversation (paginated)
// @route GET /api/messages/:conversationId
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversationId })
      .populate("sender", "username avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};