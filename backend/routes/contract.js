import express from 'express'
import { getContractByProject } from '../controllers/contract.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

/** @fileoverview Contract lookup by project. */

/** Get contract for a project by project ID. */
router.get('/project/:projectId', verifyToken, getContractByProject)

export default router
