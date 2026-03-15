import express from 'express'
import { getContractByProject } from '../controllers/contract.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.get('/project/:projectId', verifyToken, getContractByProject)

export default router
