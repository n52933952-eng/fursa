import express from 'express'
import { createDispute, getMyDisputes } from '../controllers/dispute.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.post("/", verifyToken, createDispute)
router.get("/my", verifyToken, getMyDisputes)

export default router
