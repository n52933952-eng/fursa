import User from '../models/User.js'

export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password")
        if (!user) return res.status(404).json({ error: "User not found" })
        res.status(200).json(user)
    } catch (error) {
        res.status(500).json({ error: "Failed to get profile" })
    }
}

export const updateProfile = async (req, res) => {
    try {
        const { bio, skills, country, language, profilePic, portfolio } = req.body
        const updated = await User.findByIdAndUpdate(
            req.user._id,
            { bio, skills, country, language, profilePic, portfolio },
            { new: true }
        ).select("-password")
        res.status(200).json(updated)
    } catch (error) {
        res.status(500).json({ error: "Failed to update profile" })
    }
}

export const searchFreelancers = async (req, res) => {
    try {
        const { query, skill, minRating, maxPrice } = req.query
        let filter = { role: 'freelancer', isBanned: false }

        if (query) filter.username = { $regex: query, $options: 'i' }
        if (skill) filter.skills = { $in: [skill] }
        if (minRating) filter.rating = { $gte: parseFloat(minRating) }

        const freelancers = await User.find(filter).select("-password").limit(20)
        res.status(200).json(freelancers)
    } catch (error) {
        res.status(500).json({ error: "Search failed" })
    }
}

// Search all users by username (for starting new chat conversations)
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
