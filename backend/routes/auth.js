import express from 'express'
import { signup, login, logout, forgotPassword, resetPassword, googleSignIn } from '../controllers/auth.js'

const router = express.Router()

/** @fileoverview Auth routes — signup, login, logout, password reset, Google. */

/** Register a new user account. */
router.post("/signup", signup)
/** Log in with email and password. */
router.post("/login", login)
/** Log out and clear auth cookie. */
router.post("/logout", logout)
/** Request password reset email. */
router.post("/forgot-password", forgotPassword)
/** Reset password with token from email. */
router.post("/reset-password", resetPassword)
/** Sign in or register via Google OAuth. */
router.post("/google", googleSignIn)

export default router
