import express from 'express'
import {
    getStats, getAllUsers, banUser, getAllDisputes, resolveDispute,
    getMonthlyRevenue, getProjectsByCategory, getAllTransactions
} from '../controllers/admin.js'
import { verifyToken } from '../middleware/verifyToken.js'
import { isAdmin } from '../middleware/isAdmin.js'

const router = express.Router()

router.get("/stats",            verifyToken, isAdmin, getStats)
router.get("/monthly-revenue",  verifyToken, isAdmin, getMonthlyRevenue)
router.get("/category-stats",   verifyToken, isAdmin, getProjectsByCategory)
router.get("/transactions",     verifyToken, isAdmin, getAllTransactions)
router.get("/users",            verifyToken, isAdmin, getAllUsers)
router.put("/ban/:id",          verifyToken, isAdmin, banUser)
router.get("/disputes",         verifyToken, isAdmin, getAllDisputes)
router.put("/disputes/resolve/:id", verifyToken, isAdmin, resolveDispute)

export default router
