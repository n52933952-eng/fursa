import User from '../models/User.js'
import { sanitizeInterestedCategories } from '../config/projectCategories.js'
import Wallet from '../models/Wallet.js'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { emitToAdmins } from '../socket/socket.js'

export const signup = async (req, res) => {
    try {
        const { username, email, password, role, interestedCategories } = req.body
        const cats = sanitizeInterestedCategories(interestedCategories)
        if (cats.length === 0) {
            return res.status(400).json({ error: 'Select at least one project category (Design, Development, etc.)' })
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] })
        if (existingUser) return res.status(400).json({ error: "Username or email already exists" })

        const hashedPassword = bcryptjs.hashSync(password, 10)
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role: role || 'client',
            interestedCategories: cats,
        })
        await newUser.save()

        // Create wallet for every new user
        await new Wallet({ userId: newUser._id }).save()

        // Generate token for mobile auto-login after register
        const token = jwt.sign({ id: String(newUser._id) }, process.env.JWT_SECRET, { expiresIn: '15d' })
        const { password: pass, ...rest } = newUser._doc

        // Notify admin dashboard in real-time
        emitToAdmins('adminUpdate', { type: 'newUser', data: rest })

        res.status(201).json({ ...rest, token })
    } catch (error) {
        res.status(500).json({ error: "Signup failed" })
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body

        const user = await User.findOne({ email })
        if (!user) return res.status(400).json({ error: "Invalid email or password" })
        if (user.isBanned) return res.status(403).json({ error: "Account banned" })

        const isCorrect = bcryptjs.compareSync(password, user.password)
        if (!isCorrect) return res.status(400).json({ error: "Invalid email or password" })

        const token = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '15d' })
        const { password: pass, ...rest } = user._doc

        // Set cookie for web dashboard + include token in body for mobile app
        res.status(200).cookie("access", token, {
            httpOnly: true,
            maxAge: 15 * 24 * 60 * 60 * 1000,
            sameSite: "strict"
        }).json({ ...rest, token })
    } catch (error) {
        res.status(500).json({ error: "Login failed" })
    }
}

export const logout = (req, res) => {
    try {
        res.clearCookie("access").status(200).json({ message: "Logged out successfully" })
    } catch (error) {
        res.status(500).json({ error: "Logout failed" })
    }
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body
        const user = await User.findOne({ email })
        if (!user) return res.status(404).json({ error: "No account with that email" })

        const token = crypto.randomBytes(32).toString('hex')
        user.resetPasswordToken = token
        user.resetPasswordExpires = Date.now() + 3600000 // 1 hour
        await user.save()

        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`
        await transporter.sendMail({
            to: email,
            subject: 'Fursa - Reset Your Password / إعادة تعيين كلمة المرور',
            html: `
                <h2>Reset Your Password</h2>
                <p>Click the link below to reset your password. This link expires in 1 hour.</p>
                <a href="${resetUrl}">${resetUrl}</a>
                <hr/>
                <h2>إعادة تعيين كلمة المرور</h2>
                <p>انقر على الرابط أدناه لإعادة تعيين كلمة المرور. ينتهي هذا الرابط خلال ساعة.</p>
                <a href="${resetUrl}">${resetUrl}</a>
            `
        })
        res.status(200).json({ message: "Reset email sent" })
    } catch (error) {
        res.status(500).json({ error: "Failed to send reset email" })
    }
}

export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        })
        if (!user) return res.status(400).json({ error: "Invalid or expired token" })

        user.password = bcryptjs.hashSync(newPassword, 10)
        user.resetPasswordToken = undefined
        user.resetPasswordExpires = undefined
        await user.save()

        res.status(200).json({ message: "Password reset successfully" })
    } catch (error) {
        res.status(500).json({ error: "Failed to reset password" })
    }
}

// ─── Google Sign-In ───────────────────────────────────────────────────────────
// Mobile sends: { email, name, googleId, profilePic, role }
// We trust the mobile (it already verified with Firebase client-side).
//
// Returning user: same Google account again → findOne matches googleId or email → 200 + JWT (no role).
// Brand-new user: no document → 400 { error: "role_required" } until app sends role once.
export const googleSignIn = async (req, res) => {
    try {
        const { email, name, googleId, profilePic, role, interestedCategories } = req.body

        if (!email || !googleId) {
            return res.status(400).json({ error: "Email and Google ID are required" })
        }

        const emailNorm = String(email).trim().toLowerCase()

        // 1. Find existing user by googleId or email (covers “registered before, logging in again”)
        let user = await User.findOne({ $or: [{ googleId }, { email: emailNorm }] })

        if (user) {
            // ── Existing user: just log in ──
            // Update googleId if they had a local account with same email
            if (!user.googleId) {
                user.googleId     = googleId
                user.authProvider = 'google'
            }
            if (profilePic && !user.profilePic) user.profilePic = profilePic
            await user.save()

        } else {
            // ── New user: role is required ──
            if (!role || !['client', 'freelancer'].includes(role)) {
                return res.status(400).json({ error: "role_required" })
            }
            const cats = sanitizeInterestedCategories(interestedCategories)
            if (cats.length === 0) {
                return res.status(400).json({ error: 'categories_required' })
            }

            // Generate unique username from email
            let baseUsername = emailNorm.split('@')[0].replace(/[^a-z0-9_]/g, '')
            let username = baseUsername
            let counter  = 1
            while (await User.findOne({ username })) {
                username = `${baseUsername}${counter++}`
            }

            user = new User({
                username,
                email:        emailNorm,
                password:     bcryptjs.hashSync(Math.random().toString(36), 10), // unused placeholder
                role:         role,
                profilePic:   profilePic || '',
                googleId,
                authProvider: 'google',
                interestedCategories: cats,
            })
            await user.save()

            // Create wallet for new user
            const Wallet = (await import('../models/Wallet.js')).default
            await new Wallet({ userId: user._id }).save()

            emitToAdmins('adminUpdate', { type: 'newUser', data: user })
            console.log('✅ New Google user created:', username, role)
        }

        // 2. Generate JWT (same as regular login) — id must be a string for reliable verifyToken + findById
        const token = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '15d' })
        const { password: _pw, ...rest } = user._doc

        res.status(200).json({ ...rest, token })

    } catch (error) {
        console.error('Google Sign-In error:', error)
        res.status(500).json({ error: "Google Sign-In failed" })
    }
}
