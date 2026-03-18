import express from 'express'
import { getProfile, updateProfile, searchFreelancers, searchUsers, saveFcmToken } from '../controllers/user.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.get("/search", verifyToken, searchFreelancers)
router.get("/search-chat", verifyToken, searchUsers)
router.put("/fcm-token", verifyToken, saveFcmToken)
router.get("/:id", verifyToken, getProfile)
router.put("/update", verifyToken, updateProfile)

export default router
