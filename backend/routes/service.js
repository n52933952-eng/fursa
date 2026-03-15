import express from 'express'
import { createService, getServices, getServiceById, deleteService } from '../controllers/service.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.post("/", verifyToken, createService)
router.get("/", getServices)
router.get("/:id", getServiceById)
router.delete("/:id", verifyToken, deleteService)

export default router
