import express from 'express'
import { signup, login, logout, forgotPassword, resetPassword, googleSignIn } from '../controllers/auth.js'

const router = express.Router()

router.post("/signup", signup)
router.post("/login", login)
router.post("/logout", logout)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)
router.post("/google", googleSignIn)

export default router
