import express from 'express'
import { submitProposal, getProposalsByProject, acceptProposal } from '../controllers/proposal.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.post("/", verifyToken, submitProposal)
router.get("/:projectId", verifyToken, getProposalsByProject)
router.put("/accept/:id", verifyToken, acceptProposal)

export default router
