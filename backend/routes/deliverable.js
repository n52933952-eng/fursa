import express from 'express'
import { uploadDeliverable, getDeliverables } from '../controllers/deliverable.js'
import { verifyToken } from '../middleware/verifyToken.js'
import { uploadDeliverable as uploadMiddleware } from '../middleware/upload.js'

const router = express.Router()

/** @fileoverview Project deliverable upload and list routes. */

/** Upload a deliverable file for a project. */
router.post("/", verifyToken, uploadMiddleware.single('file'), uploadDeliverable)
/** List deliverables for a project. */
router.get("/:projectId", verifyToken, getDeliverables)

export default router
