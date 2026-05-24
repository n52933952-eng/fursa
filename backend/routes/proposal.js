import express from 'express'
import { submitProposal, getProposalsByProject, acceptProposal, getMyProposals } from '../controllers/proposal.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

/** @fileoverview Proposal submit, list, and accept routes. */

/** Submit a bid on a project. */
router.post("/",           verifyToken, submitProposal)
/** List logged-in freelancer's proposals. */
router.get("/my",          verifyToken, getMyProposals)
/** List all proposals for a project. */
router.get("/:projectId",  verifyToken, getProposalsByProject)
/** Accept a proposal and start contract. */
router.put("/accept/:id",  verifyToken, acceptProposal)

export default router
