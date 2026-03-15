import express from 'express'
import { uploadDeliverable, getDeliverables } from '../controllers/deliverable.js'
import { verifyToken } from '../middleware/verifyToken.js'
import { uploadDeliverable as uploadMiddleware } from '../middleware/upload.js'

const router = express.Router()

router.post("/", verifyToken, uploadMiddleware.single('file'), uploadDeliverable)
router.get("/:projectId", verifyToken, getDeliverables)

export default router
