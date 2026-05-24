import express from 'express'
import { createDispute, getMyDisputes } from '../controllers/dispute.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

/** @fileoverview Project dispute create and list routes. */

/** Open a new dispute on a project. */
router.post("/", verifyToken, createDispute)
/** List disputes involving logged-in user. */
router.get("/my", verifyToken, getMyDisputes)

export default router
