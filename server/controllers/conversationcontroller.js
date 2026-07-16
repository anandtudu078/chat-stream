import Conversation from "../models/Conversation.js";

// @desc  Create or get a 1-to-1 conversation
// @route POST /api/conversations
export const createConversation = async (req, res) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ message: "participantId is required" });
    }

    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, participantId], $size: 2 },
    });

    if (conversation) {
      return res.status(200).json(conversation);
    }

    conversation = await Conversation.create({
      isGroup: false,
      participants: [req.user._id, participantId],
    });

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Create a group conversation
// @route POST /api/conversations/group
export const createGroupConversation = async (req, res) => {
  try {
    const { groupName, participantIds } = req.body;

    if (!groupName || !participantIds || participantIds.length < 2) {
      return res.status(400).json({
        message: "Group name and at least 2 other participants are required",
      });
    }

    const conversation = await Conversation.create({
      isGroup: true,
      groupName,
      participants: [req.user._id, ...participantIds],
      groupAdmins: [req.user._id],
    });

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get all conversations for the logged-in user
// @route GET /api/conversations
export const getMyConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "username avatar status lastSeen")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};