import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const verifyToken = async (req, res, next) => {
    try {
        // Web dashboard sends cookie; mobile app sends Authorization: Bearer <token>
        let token = req.cookies?.access
        if (!token) {
            const auth = req.headers.authorization
            if (auth && auth.startsWith('Bearer ')) token = auth.split(' ')[1]
        }
        if (!token) return res.status(401).json({ error: "Unauthorized - no token" })

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const userId = decoded.id
        const user = await User.findById(userId).select("-password")
        if (!user) {
            let dbHint = ''
            try {
                const uri = process.env.MONGO_URI || ''
                const noQuery = uri.split('?')[0] || ''
                const seg = noQuery.split('/').filter(Boolean)
                const name = seg.length ? seg[seg.length - 1] : ''
                if (name && !name.includes('@')) dbHint = ` DB name from MONGO_URI: "${name}".`
            } catch { /* ignore */ }
            console.warn(
                `[verifyToken] JWT user id ${userId} not in MongoDB.${dbHint} ` +
                'Fix: use same MONGO_URI as where users are created, or sign in again after clearing the app session.'
            )
            return res.status(401).json({ error: `User not found (${userId})` })
        }
        if (user.isBanned) return res.status(403).json({ error: "Account banned" })

        req.user = user
        next()
    } catch (error) {
        res.status(401).json({ error: "Invalid token" })
    }
}
