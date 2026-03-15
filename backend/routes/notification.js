import express from 'express'
import { getNotifications, markAllRead } from '../controllers/notification.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.get("/", verifyToken, getNotifications)
router.put("/read", verifyToken, markAllRead)

export default router
