import express from 'express'
import {
    getProfile,
    updateProfile,
    searchFreelancers,
    searchUsers,
    saveFcmToken,
    getPaymentMethods,
    addPaymentMethod,
    removePaymentMethod,
} from '../controllers/user.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.get("/search", verifyToken, searchFreelancers)
router.get("/search-chat", verifyToken, searchUsers)
router.put("/fcm-token", verifyToken, saveFcmToken)
router.get("/payment-methods", verifyToken, getPaymentMethods)
router.post("/payment-methods", verifyToken, addPaymentMethod)
router.delete("/payment-methods/:cardId", verifyToken, removePaymentMethod)
router.get("/:id", verifyToken, getProfile)
router.put("/update", verifyToken, updateProfile)

export default router
