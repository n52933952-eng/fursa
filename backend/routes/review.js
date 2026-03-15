import express from 'express'
import { createReview, getReviews } from '../controllers/review.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.post("/", verifyToken, createReview)
router.get("/:userId", getReviews)

export default router
