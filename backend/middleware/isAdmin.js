/** @fileoverview Restrict routes to admin role only. */

/** Block request if user is not an admin. */
export const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied - Admins only" })
    }
    next()
}
