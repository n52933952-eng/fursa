import express from 'express'
import { createService, getServices, getServiceById, deleteService } from '../controllers/service.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

/** @fileoverview Freelancer service listing browse and manage routes. */

/** Create a new service listing. */
router.post("/", verifyToken, createService)
/** Browse active service listings. */
router.get("/", getServices)
/** Get single service by ID. */
router.get("/:id", getServiceById)
/** Delete a service owned by freelancer. */
router.delete("/:id", verifyToken, deleteService)

export default router
