import express from 'express'
import { getNotifications, markAllRead, markOneRead } from '../controllers/notification.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

/** @fileoverview In-app notification list and read status. */

/** List recent notifications for user. */
router.get("/",          verifyToken, getNotifications)
/** Mark all notifications as read. */
router.put("/read",      verifyToken, markAllRead)
/** Mark one notification as read. */
router.put("/:id/read",  verifyToken, markOneRead)

export default router
