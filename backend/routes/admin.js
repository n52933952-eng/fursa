import express from 'express'
import {
    getStats, getAllUsers, banUser, getAllDisputes, resolveDispute,
    getMonthlyRevenue, getProjectsByCategory, getAllTransactions
} from '../controllers/admin.js'
import { verifyToken } from '../middleware/verifyToken.js'
import { isAdmin } from '../middleware/isAdmin.js'

const router = express.Router()

/** @fileoverview Admin dashboard stats, users, disputes, and transactions. */

/** Platform overview stats and revenue estimates. */
router.get("/stats",            verifyToken, isAdmin, getStats)
/** Monthly revenue and user growth chart data. */
router.get("/monthly-revenue",  verifyToken, isAdmin, getMonthlyRevenue)
/** Project counts grouped by category. */
router.get("/category-stats",   verifyToken, isAdmin, getProjectsByCategory)
/** Recent platform transactions list. */
router.get("/transactions",     verifyToken, isAdmin, getAllTransactions)
/** All registered users list. */
router.get("/users",            verifyToken, isAdmin, getAllUsers)
/** Toggle ban status for a user. */
router.put("/ban/:id",          verifyToken, isAdmin, banUser)
/** All open and resolved disputes. */
router.get("/disputes",         verifyToken, isAdmin, getAllDisputes)
/** Resolve a dispute by ID. */
router.put("/disputes/resolve/:id", verifyToken, isAdmin, resolveDispute)

export default router
