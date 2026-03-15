import express from 'express'
import { submitProposal, getProposalsByProject, acceptProposal, getMyProposals } from '../controllers/proposal.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.post("/",           verifyToken, submitProposal)
router.get("/my",          verifyToken, getMyProposals)
router.get("/:projectId",  verifyToken, getProposalsByProject)
router.put("/accept/:id",  verifyToken, acceptProposal)

export default router
