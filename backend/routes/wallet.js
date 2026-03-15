import express from 'express'
import { getWallet, getTransactions, deposit, withdraw } from '../controllers/wallet.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.get("/", verifyToken, getWallet)
router.get("/transactions", verifyToken, getTransactions)
router.post("/deposit", verifyToken, deposit)
router.post("/withdraw", verifyToken, withdraw)

export default router
