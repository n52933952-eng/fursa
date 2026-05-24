import express from 'express'
import { generateInvoice } from '../controllers/invoice.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

/** @fileoverview PDF invoice download for transactions. */

/** Download PDF invoice for a transaction. */
router.get("/:transactionId", verifyToken, generateInvoice)

export default router
