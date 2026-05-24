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

/** @fileoverview User profile, search, avatar, FCM, and payment methods. */

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

/** Search freelancers with filters and ranking. */
router.get("/search", verifyToken, searchFreelancers)
/** Search users by username for new chats. */
router.get("/search-chat", verifyToken, searchUsers)
/** Get platform admin contact for support chat. */
router.get("/support-admin", verifyToken, getSupportAdmin)
/** Save device FCM push token. */
router.put("/fcm-token", verifyToken, saveFcmToken)
/** List saved payment cards. */
router.get("/payment-methods", verifyToken, getPaymentMethods)
/** Add a saved payment card. */
router.post("/payment-methods", verifyToken, addPaymentMethod)
/** Remove a saved payment card. */
router.delete("/payment-methods/:cardId", verifyToken, removePaymentMethod)
/** Upload profile avatar image. */
router.post("/avatar", verifyToken, avatarUploadMiddleware, uploadProfileAvatar)
/** Get user profile by ID. */
router.get("/:id", verifyToken, getProfile)
/** Update logged-in user profile. */
router.put("/update", verifyToken, updateProfile)

export default router
