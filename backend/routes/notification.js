import express from 'express'
import { getNotifications, markAllRead, markOneRead } from '../controllers/notification.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.get("/",          verifyToken, getNotifications)
router.put("/read",      verifyToken, markAllRead)
router.put("/:id/read",  verifyToken, markOneRead)

export default router
