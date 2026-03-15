import express from 'express'
import { sendMessage, getMessages, getConversations } from '../controllers/message.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.post("/", verifyToken, sendMessage)
router.get("/conversations", verifyToken, getConversations)
router.get("/:userId", verifyToken, getMessages)

export default router
