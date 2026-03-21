import express from 'express'
import { matchFreelancers, generateDescription, suggestPrice, extractSkills, chatAssistant } from '../controllers/ai.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.get("/match/:projectId", verifyToken, matchFreelancers)
router.post("/description", verifyToken, generateDescription)
router.post("/pricing", verifyToken, suggestPrice)
router.post("/skills", verifyToken, extractSkills)
router.post("/chat", verifyToken, chatAssistant)

export default router
