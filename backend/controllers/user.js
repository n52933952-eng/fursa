import mongoose from 'mongoose'
import User from '../models/User.js'
import { sanitizeInterestedCategories } from '../config/projectCategories.js'
import { sanitizeCareer, careerPatternsFromQuery, namePartsFromUser } from '../config/freelancerCareers.js'

function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const MAX_SAVED_CARDS = 5
const BRANDS = new Set(['visa', 'mastercard', 'mada', 'amex', 'other'])

/** @fileoverview User profiles, search, avatars, FCM tokens, and saved cards. */

/** Return the platform admin contact for support chat. */
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

/** Get public profile for a user by ID. */
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password -savedCards")
        if (!user) return res.status(404).json({ error: "User not found" })
        res.status(200).json(user)
    } catch (error) {
        res.status(500).json({ error: "Failed to get profile" })
    }
}

/** Update logged-in user's profile fields. */
export const updateProfile = async (req, res) => {
    try {
        const {
            bio, skills, country, language, profilePic, portfolio,
            interestedCategories, firstName, lastName, career,
        } = req.body

        const patch = {}
        if (bio !== undefined) patch.bio = String(bio)
        if (skills !== undefined) patch.skills = Array.isArray(skills) ? skills.map(String) : []
        if (country !== undefined) patch.country = String(country).trim()
        if (language !== undefined) patch.language = language === 'en' ? 'en' : 'ar'
        if (profilePic !== undefined) patch.profilePic = String(profilePic)
        if (portfolio !== undefined) patch.portfolio = Array.isArray(portfolio) ? portfolio.map(String) : []

        if (firstName !== undefined) {
            const fn = String(firstName).trim().slice(0, 80)
            if (!fn) return res.status(400).json({ error: 'First name cannot be empty' })
            patch.firstName = fn
        }
        if (lastName !== undefined) {
            const ln = String(lastName).trim().slice(0, 80)
            if (!ln) return res.status(400).json({ error: 'Last name cannot be empty' })
            patch.lastName = ln
        }
        if (career !== undefined) {
            if (req.user.role === 'freelancer') {
                const sanitized = sanitizeCareer(career)
                if (String(career || '').trim() && !sanitized) {
                    return res.status(400).json({ error: 'Invalid career. Pick Full Stack, IT, Writing, etc.' })
                }
                patch.career = sanitized
            } else {
                patch.career = ''
            }
        }
        if (interestedCategories !== undefined) {
            patch.interestedCategories = sanitizeInterestedCategories(interestedCategories)
        }

        const nextFirst = patch.firstName ?? req.user.firstName ?? ''
        const nextLast = patch.lastName ?? req.user.lastName ?? ''
        const displayUsername = `${nextFirst} ${nextLast}`.trim()
        if (displayUsername && displayUsername !== req.user.username) {
            const clash = await User.findOne({
                username: displayUsername,
                _id: { $ne: req.user._id },
            })
            if (!clash) patch.username = displayUsername.slice(0, 80)
        }

        if (Object.keys(patch).length === 0) {
            return res.status(400).json({ error: 'No profile fields to update' })
        }

        const updated = await User.findByIdAndUpdate(
            req.user._id,
            patch,
            { new: true, runValidators: true }
        ).select('-password')

        if (!updated) return res.status(404).json({ error: 'User not found' })
        res.status(200).json(updated)
    } catch (error) {
        console.error('[updateProfile]', error?.message || error)
        if (error?.code === 11000) {
            return res.status(400).json({ error: 'This display name is already in use' })
        }
        res.status(500).json({ error: 'Failed to update profile' })
    }
}

/** Upload avatar image and set profilePic URL. */
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

/** Search and rank freelancers by filters and keywords. */
export const searchFreelancers = async (req, res) => {
    try {
        const { query, skill, minRating, maxPrice, country, career: careerFilter } = req.query

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

        const careerChip =
            careerFilter && String(careerFilter).trim() && String(careerFilter).trim().toLowerCase() !== 'all'
                ? sanitizeCareer(careerFilter) || String(careerFilter).trim()
                : null
        if (careerChip) {
            filter.career = { $regex: `^${escapeRegex(careerChip)}$`, $options: 'i' }
        }

        // Skill chip (UI sends "All" or a real skill)
        const skillValue = skill && String(skill).trim() && String(skill).trim().toLowerCase() !== 'all'
            ? String(skill).trim()
            : null
        if (skillValue) filter.skills = { $in: [skillValue] }

        const rawQuery = query && String(query).trim() ? String(query).trim() : ''
        const qLower = rawQuery.toLowerCase()

        if (rawQuery) {
            const careerHits = careerPatternsFromQuery(rawQuery)
            const tokens = qLower.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean)

            const phraseOr = [
                { firstName: { $regex: escapeRegex(rawQuery), $options: 'i' } },
                { lastName: { $regex: escapeRegex(rawQuery), $options: 'i' } },
                { username: { $regex: escapeRegex(rawQuery), $options: 'i' } },
                { bio: { $regex: escapeRegex(rawQuery), $options: 'i' } },
                { skills: { $regex: escapeRegex(rawQuery), $options: 'i' } },
                { career: { $regex: escapeRegex(rawQuery), $options: 'i' } },
            ]
            for (const c of careerHits) {
                phraseOr.push({ career: { $regex: `^${escapeRegex(c)}$`, $options: 'i' } })
            }

            const tokenAnd = tokens.map((t) => {
                const safe = escapeRegex(t)
                const tokCareers = careerPatternsFromQuery(t)
                const orTok = [
                    { firstName: { $regex: safe, $options: 'i' } },
                    { lastName: { $regex: safe, $options: 'i' } },
                    { username: { $regex: safe, $options: 'i' } },
                    { bio: { $regex: safe, $options: 'i' } },
                    { skills: { $regex: safe, $options: 'i' } },
                    { career: { $regex: safe, $options: 'i' } },
                ]
                for (const c of tokCareers) {
                    orTok.push({ career: { $regex: `^${escapeRegex(c)}$`, $options: 'i' } })
                }
                return { $or: orTok }
            })

            filter = {
                ...filter,
                $or: tokenAnd.length > 0
                    ? [{ $and: tokenAnd }, ...phraseOr.map((clause) => ({ ...clause }))]
                    : phraseOr,
            }
        }

        const candidates = await User.find(filter)
            .select('username firstName lastName career bio skills country rating totalProjects totalReviews profilePic successRate')
            .limit(60)

        const tokens = rawQuery
            ? rawQuery
                .toLowerCase()
                .split(/[\s,]+/)
                .map(t => t.trim())
                .filter(Boolean)
            : []

        const countryLower = country && String(country).trim() ? String(country).trim().toLowerCase() : ''
        const queryCareers = careerPatternsFromQuery(rawQuery)

        const scored = candidates.map((u) => {
            const freelancer = u.toObject()

            const usernameLower = (freelancer.username || '').toLowerCase()
            const firstLower = (freelancer.firstName || '').toLowerCase()
            const lastLower = (freelancer.lastName || '').toLowerCase()
            const careerLower = (freelancer.career || '').toLowerCase()
            const bioLower = (freelancer.bio || '').toLowerCase()
            const skillsLower = Array.isArray(freelancer.skills) ? freelancer.skills.map((s) => String(s).toLowerCase()) : []
            const fCountryLower = (freelancer.country || '').toLowerCase()
            const nameParts = namePartsFromUser(freelancer)

            let score = 0

            if (skillValue && skillsLower.includes(skillValue.toLowerCase())) score += 6
            if (careerChip && careerLower === careerChip.toLowerCase()) score += 8

            if (qLower) {
                if (firstLower.includes(qLower) || lastLower.includes(qLower)) score += 4
                if (usernameLower.includes(qLower)) score += 3
                if (bioLower.includes(qLower)) score += 3
                if (skillsLower.some(s => s.includes(qLower))) score += 3
                if (careerLower.includes(qLower)) score += 5
                for (const c of queryCareers) {
                    if (careerLower === c.toLowerCase()) score += 7
                }

                for (const t of tokens) {
                    if (firstLower === t) score += 4
                    else if (firstLower.includes(t)) score += 2.5
                    if (lastLower === t) score += 4
                    else if (lastLower.includes(t)) score += 2.5
                    if (nameParts.some((p) => p === t || p.includes(t))) score += 2
                    if (usernameLower.includes(t)) score += 1.5
                    if (bioLower.includes(t)) score += 1.5
                    if (skillsLower.some(s => s === t || s.includes(t))) score += 2.5
                    for (const c of careerPatternsFromQuery(t)) {
                        if (careerLower === c.toLowerCase()) score += 6
                    }
                }
            }

            score += (freelancer.rating ?? 0) * 0.8
            score += (freelancer.totalProjects ?? 0) * 0.03
            score += (freelancer.successRate ?? 0) * 0.2

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

/** Save device push notification token for user. */
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
/** List saved payment cards for the logged-in user. */
export const getPaymentMethods = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('savedCards')
        if (!user) return res.status(404).json({ error: 'User not found' })
        res.status(200).json({ cards: user.savedCards || [] })
    } catch (error) {
        res.status(500).json({ error: 'Failed to load payment methods' })
    }
}

/** Add a saved card for wallet payouts. */
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

/** Remove a saved card by ID. */
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

/** Search users by username for starting chats. */
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
