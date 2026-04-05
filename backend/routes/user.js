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

/** Multer errors → JSON (avoids HTML 500; RN shows real reason) */
const avatarUploadMiddleware = (req, res, next) => {
    uploadAvatar.single('avatar')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'Image too large (max 5MB)' })
            }
            return res.status(400).json({ error: err.message || 'Upload failed' })
        }
        next()
    })
}

router.get("/search", verifyToken, searchFreelancers)
router.get("/search-chat", verifyToken, searchUsers)
router.get("/support-admin", verifyToken, getSupportAdmin)
router.put("/fcm-token", verifyToken, saveFcmToken)
router.get("/payment-methods", verifyToken, getPaymentMethods)
router.post("/payment-methods", verifyToken, addPaymentMethod)
router.delete("/payment-methods/:cardId", verifyToken, removePaymentMethod)
router.post("/avatar", verifyToken, avatarUploadMiddleware, uploadProfileAvatar)
router.get("/:id", verifyToken, getProfile)
router.put("/update", verifyToken, updateProfile)

export default router
