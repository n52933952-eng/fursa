import express from 'express'
import { generateInvoice } from '../controllers/invoice.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.get("/:transactionId", verifyToken, generateInvoice)

export default router
