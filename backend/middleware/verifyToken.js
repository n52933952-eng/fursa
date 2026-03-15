import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const verifyToken = async (req, res, next) => {
    try {
        const token = req.cookies.access
        if (!token) return res.status(401).json({ error: "Unauthorized - no token" })

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.id).select("-password")
        if (!user) return res.status(401).json({ error: "User not found" })
        if (user.isBanned) return res.status(403).json({ error: "Account banned" })

        req.user = user
        next()
    } catch (error) {
        res.status(401).json({ error: "Invalid token" })
    }
}
