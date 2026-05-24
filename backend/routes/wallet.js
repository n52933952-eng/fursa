import express from 'express'
import { getWallet, getTransactions, deposit, withdraw } from '../controllers/wallet.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

/** @fileoverview Wallet balance, transactions, deposit, and withdraw. */

/** Get logged-in user's wallet balances. */
router.get("/", verifyToken, getWallet)
/** List recent wallet transactions. */
router.get("/transactions", verifyToken, getTransactions)
/** Sandbox deposit — add test funds. */
router.post("/deposit", verifyToken, deposit)
/** Withdraw funds from wallet. */
router.post("/withdraw", verifyToken, withdraw)

export default router
