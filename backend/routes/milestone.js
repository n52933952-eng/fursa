import express from 'express'
import { createMilestones, getMilestones, requestReview, releasePayment } from '../controllers/milestone.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.post("/", verifyToken, createMilestones)
router.get("/:projectId", verifyToken, getMilestones)
router.put("/review/:id", verifyToken, requestReview)
router.put("/release/:id", verifyToken, releasePayment)

export default router
