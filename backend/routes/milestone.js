import express from 'express'
import { createMilestones, getMilestones, requestReview, releasePayment } from '../controllers/milestone.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

/** @fileoverview Milestone create, list, review, and release routes. */

/** Bulk create milestones for a project. */
router.post("/", verifyToken, createMilestones)
/** List milestones for a project. */
router.get("/:projectId", verifyToken, getMilestones)
/** Freelancer requests client review on milestone. */
router.put("/review/:id", verifyToken, requestReview)
/** Client releases milestone payment from escrow. */
router.put("/release/:id", verifyToken, releasePayment)

export default router
