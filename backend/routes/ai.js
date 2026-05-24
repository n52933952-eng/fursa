import express from 'express'
import { matchFreelancers, generateDescription, suggestPrice, extractSkills, chatAssistant } from '../controllers/ai.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

/** @fileoverview AI matchmaking, writing, pricing, skills, and chat. */

/** AI-recommend freelancers for a project. */
router.get("/match/:projectId", verifyToken, matchFreelancers)
/** Generate project description from keywords. */
router.post("/description", verifyToken, generateDescription)
/** Suggest project budget pricing range. */
router.post("/pricing", verifyToken, suggestPrice)
/** Extract skills from bio or portfolio text. */
router.post("/skills", verifyToken, extractSkills)
/** In-app AI chat assistant. */
router.post("/chat", verifyToken, chatAssistant)

export default router
