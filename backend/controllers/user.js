import mongoose from 'mongoose'
import User from '../models/User.js'
import { sanitizeInterestedCategories } from '../config/projectCategories.js'

const MAX_SAVED_CARDS = 5
const BRANDS = new Set(['visa', 'mastercard', 'mada', 'amex', 'other'])

/** Client / freelancer: single admin account to open support chat */
export const getSupportAdmin = async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            return res.status(400).json({ error: 'Use the admin panel for messaging' })
        }
        const admin = await User.findOne({ role: 'admin' }).select('username email role profilePic')
        if (!admin) return res.status(503).json({ error: 'Support is not available' })
        res.status(200).json(admin)
    } catch (error) {
        res.status(500).json({ error: 'Failed to load support contact' })
    }
}

export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password -savedCards")
        if (!user) return res.status(404).json({ error: "User not found" })
        res.status(200).json(user)
    } catch (error) {
        res.status(500).json({ error: "Failed to get profile" })
    }
}

export const updateProfile = async (req, res) => {
    try {
        const { bio, skills, country, language, profilePic, portfolio, interestedCategories } = req.body
        const patch = { bio, skills, country, language, profilePic, portfolio }
        if (interestedCategories !== undefined) {
            patch.interestedCategories = sanitizeInterestedCategories(interestedCategories)
        }
        const updated = await User.findByIdAndUpdate(
            req.user._id,
            patch,
            { new: true }
        ).select("-password")
        res.status(200).json(updated)
    } catch (error) {
        res.status(500).json({ error: "Failed to update profile" })
    }
}

/** Multipart field name: `avatar` — stores under /uploads/avatars/ and sets profilePic */
export const uploadProfileAvatar = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No image uploaded" })
        const relative = `/uploads/avatars/${req.file.filename}`
        const updated = await User.findByIdAndUpdate(
            req.user._id,
            { profilePic: relative },
            { new: true }
        ).select("-password")
        if (!updated) return res.status(404).json({ error: "User not found" })
        res.status(200).json(updated)
    } catch (error) {
        console.error("[uploadProfileAvatar]", error?.message || error)
        res.status(500).json({ error: "Failed to upload avatar" })
    }
}

export const searchFreelancers = async (req, res) => {
    try {
        const { query, skill, minRating, maxPrice, country } = req.query

        // Base candidates (role + not banned). Keep this strict so ranking is fast.
        let filter = { role: 'freelancer', isBanned: false }

        // Optional filters
        if (country && String(country).trim()) {
            filter.country = { $regex: String(country).trim(), $options: 'i' }
        }
        if (minRating) {
            const mr = parseFloat(String(minRating))
            if (!Number.isNaN(mr)) filter.rating = { $gte: mr }
        }

        // Skill chip (UI sends "All" or a real skill)
        const skillValue = skill && String(skill).trim() && String(skill).trim().toLowerCase() !== 'all'
            ? String(skill).trim()
            : null
        if (skillValue) filter.skills = { $in: [skillValue] }

        const rawQuery = query && String(query).trim() ? String(query).trim() : ''
        const qLower = rawQuery.toLowerCase()

        // Keyword narrowing: search username/bio/skills for "SEO-like" matching.
        if (rawQuery) {
            filter = {
                ...filter,
                $or: [
                    { username: { $regex: rawQuery, $options: 'i' } },
                    { bio: { $regex: rawQuery, $options: 'i' } },
                    { skills: { $regex: rawQuery, $options: 'i' } },
                ],
            }
        }

        // Pull candidates, then rank in JS by match score.
        // (No price field exists in User schema right now, so maxPrice is accepted but not used.)
        const candidates = await User.find(filter)
            .select('username bio skills country rating totalProjects totalReviews profilePic successRate')
            .limit(60)

        const tokens = rawQuery
            ? rawQuery
                .toLowerCase()
                .split(/[\s,]+/)
                .map(t => t.trim())
                .filter(Boolean)
            : []

        const countryLower = country && String(country).trim() ? String(country).trim().toLowerCase() : ''

        const scored = candidates.map((u) => {
            const freelancer = u.toObject()

            const usernameLower = (freelancer.username || '').toLowerCase()
            const bioLower = (freelancer.bio || '').toLowerCase()
            const skillsLower = Array.isArray(freelancer.skills) ? freelancer.skills.map((s) => String(s).toLowerCase()) : []
            const fCountryLower = (freelancer.country || '').toLowerCase()

            let score = 0

            // Direct skill chip match
            if (skillValue && skillsLower.includes(skillValue.toLowerCase())) score += 6

            if (qLower) {
                // Full query match boosts
                if (usernameLower.includes(qLower)) score += 3
                if (bioLower.includes(qLower)) score += 3
                if (skillsLower.some(s => s.includes(qLower))) score += 3

                // Token-level matching for better SEO-like behavior
                for (const t of tokens) {
                    if (usernameLower.includes(t)) score += 1.5
                    if (bioLower.includes(t)) score += 1.5
                    if (skillsLower.some(s => s === t || s.includes(t))) score += 2.5
                }
            }

            // Quality signals
            score += (freelancer.rating ?? 0) * 0.8
            score += (freelancer.totalProjects ?? 0) * 0.03
            score += (freelancer.successRate ?? 0) * 0.2

            // Country preference
            if (countryLower && fCountryLower.includes(countryLower)) score += 2

            return { ...freelancer, matchScore: score }
        })

        scored.sort((a, b) => {
            // Highest score first; tie-break by rating
            if (b.matchScore !== a.matchScore) return (b.matchScore ?? 0) - (a.matchScore ?? 0)
            return (b.rating ?? 0) - (a.rating ?? 0)
        })

        // Return top results for UI
        res.status(200).json(scored.slice(0, 20))
    } catch (error) {
        res.status(500).json({ error: "Search failed" })
    }
}

export const saveFcmToken = async (req, res) => {
    try {
        const { token } = req.body
        if (!token) return res.status(400).json({ error: "Token is required" })
        await User.findByIdAndUpdate(req.user._id, { fcmToken: token })
        res.status(200).json({ message: "FCM token saved" })
    } catch (error) {
        res.status(500).json({ error: "Failed to save FCM token" })
    }
}

// Search all users by username (for starting new chat conversations)
/** Saved card labels for wallet / payouts (metadata only — no full card number). */
export const getPaymentMethods = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('savedCards')
        if (!user) return res.status(404).json({ error: 'User not found' })
        res.status(200).json({ cards: user.savedCards || [] })
    } catch (error) {
        res.status(500).json({ error: 'Failed to load payment methods' })
    }
}

export const addPaymentMethod = async (req, res) => {
    try {
        const { holderName, brand, last4, expiry, nickname } = req.body
        const name = holderName != null ? String(holderName).trim() : ''
        if (!name) return res.status(400).json({ error: 'Cardholder name is required' })

        const digits = String(last4 || '').replace(/\D/g, '')
        if (digits.length !== 4) return res.status(400).json({ error: 'Last 4 digits are required' })

        const b = brand && BRANDS.has(String(brand)) ? String(brand) : 'other'
        const exp = expiry != null ? String(expiry).trim().slice(0, 5) : ''
        const nick = nickname != null ? String(nickname).trim().slice(0, 40) : ''

        const user = await User.findById(req.user._id)
        if (!user) return res.status(404).json({ error: 'User not found' })

        const list = user.savedCards || []
        if (list.length >= MAX_SAVED_CARDS) {
            return res.status(400).json({ error: `You can save up to ${MAX_SAVED_CARDS} cards` })
        }

        list.push({
            holderName: name,
            brand: b,
            last4: digits,
            expiry: exp,
            nickname: nick,
        })
        user.savedCards = list
        await user.save()

        res.status(201).json({ cards: user.savedCards })
    } catch (error) {
        res.status(500).json({ error: 'Failed to save card' })
    }
}

export const removePaymentMethod = async (req, res) => {
    try {
        const { cardId } = req.params
        if (!cardId || !mongoose.Types.ObjectId.isValid(cardId)) {
            return res.status(400).json({ error: 'Invalid card id' })
        }
        const user = await User.findById(req.user._id)
        if (!user) return res.status(404).json({ error: 'User not found' })

        user.savedCards = (user.savedCards || []).filter(
            (c) => String(c._id) !== String(cardId)
        )
        await user.save()
        res.status(200).json({ cards: user.savedCards })
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove card' })
    }
}

export const searchUsers = async (req, res) => {
    try {
        const { query } = req.query
        if (!query || query.trim().length < 1) return res.status(200).json([])

        const users = await User.find({
            _id: { $ne: req.user._id }, // exclude self
            isBanned: false,
            role: { $ne: 'admin' },     // exclude admins
            username: { $regex: query.trim(), $options: 'i' }
        })
        .select('_id username role rating profilePic skills')
        .limit(15)

        res.status(200).json(users)
    } catch (error) {
        res.status(500).json({ error: "Search failed" })
    }
}
