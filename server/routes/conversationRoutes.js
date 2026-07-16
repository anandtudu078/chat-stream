import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createConversation,
  createGroupConversation,
  getMyConversations,
} from "../controllers/conversationcontroller.js";

const router = express.Router();

router.use(protect); // every route below requires authentication

router.post("/", createConversation);
router.post("/group", createGroupConversation);
router.get("/", getMyConversations);

export default router;