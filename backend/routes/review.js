import express from 'express'
import { createReview, getReviews } from '../controllers/review.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

/** @fileoverview Freelancer review create and list routes. */

/** Submit a review for a freelancer. */
router.post("/", verifyToken, createReview)
/** List reviews received by a user. */
router.get("/:userId", getReviews)

export default router
