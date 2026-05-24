import express from 'express'
import { sendMessage, getMessages, getConversations, deleteMessage } from '../controllers/message.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

/** @fileoverview Chat message and conversation routes. */

/** Send a new chat message. */
router.post("/", verifyToken, sendMessage)
/** Delete a message by ID. */
router.delete("/by-id/:messageId", verifyToken, deleteMessage)
/** List all conversations for logged-in user. */
router.get("/conversations", verifyToken, getConversations)
/** Get messages with a specific user. */
router.get("/:userId", verifyToken, getMessages)

export default router
