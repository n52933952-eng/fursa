import express from 'express'
import { getProfile, updateProfile, searchFreelancers } from '../controllers/user.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.get("/search", verifyToken, searchFreelancers)
router.get("/:id", verifyToken, getProfile)
router.put("/update", verifyToken, updateProfile)

export default router
