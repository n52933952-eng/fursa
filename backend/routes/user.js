import express from 'express'
import {
    getProfile,
    updateProfile,
    uploadProfileAvatar,
    searchFreelancers,
    searchUsers,
    saveFcmToken,
    getPaymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    getSupportAdmin,
} from '../controllers/user.js'
import { verifyToken } from '../middleware/verifyToken.js'
import { uploadAvatar } from '../middleware/upload.js'

const router = express.Router()

router.get("/search", verifyToken, searchFreelancers)
router.get("/search-chat", verifyToken, searchUsers)
router.get("/support-admin", verifyToken, getSupportAdmin)
router.put("/fcm-token", verifyToken, saveFcmToken)
router.get("/payment-methods", verifyToken, getPaymentMethods)
router.post("/payment-methods", verifyToken, addPaymentMethod)
router.delete("/payment-methods/:cardId", verifyToken, removePaymentMethod)
router.post("/avatar", verifyToken, uploadAvatar.single("avatar"), uploadProfileAvatar)
router.get("/:id", verifyToken, getProfile)
router.put("/update", verifyToken, updateProfile)

export default router
