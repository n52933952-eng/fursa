import User from '../models/User.js'
import Project from '../models/Project.js'
import Transaction from '../models/Transaction.js'
import Dispute from '../models/Dispute.js'
import { PLATFORM_FEE_RATE, PLATFORM_FEE_PERCENT } from '../config/platformFee.js'

export const getStats = async (req, res) => {
    try {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
         
        const [totalUsers, totalProjects, activeProjects, openDisputes, newUsersThisMonth] = await Promise.all([
            User.countDocuments(),
            Project.countDocuments(),
            Project.countDocuments({ status: 'in-progress' }),
            Dispute.countDocuments({ status: 'open' }),
            User.countDocuments({ createdAt: { $gte: startOfMonth } })
        ])

        // Sum of admin→freelancer releases (gross payout volume through the platform).
        // This is NOT "platform profit" unless you deduct a fee in the release flow.
        const releaseTransactions = await Transaction.find({ type: 'release' })
        const totalRevenue = releaseTransactions.reduce((sum, t) => sum + t.amount, 0)
        // Same % applied to every release in DB → estimated platform share (reporting)
        const estimatedPlatformFees = Math.round(totalRevenue * PLATFORM_FEE_RATE * 100) / 100

        res.status(200).json({
            totalUsers,
            totalProjects,
            activeProjects,
            openDisputes,
            totalRevenue,
            platformFeePercent: PLATFORM_FEE_PERCENT,
            estimatedPlatformFees,
            newUsersThisMonth,
        })
    } catch (error) {
        res.status(500).json({ error: "Failed to get stats" })
    }
}

export const getMonthlyRevenue = async (req, res) => {
    try {
        const sixMonthsAgo = new Date()
        console.log(sixMonthsAgo)
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

        const [txData, userCounts] = await Promise.all([
            // Only `release` = money paid out to freelancers (matches getStats totalRevenue).
            // Do NOT sum all types — escrow/deposit rows would double-count the same project cash.
            Transaction.aggregate([
                { $match: { createdAt: { $gte: sixMonthsAgo }, type: 'release' } },
                {
                    $group: {
                        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                        revenue: { $sum: '$amount' },
                        // Illustrative 10% platform fee (not auto-deducted in wallet flow unless you add that)
                        fees: {
                            $sum: { $multiply: ['$amount', PLATFORM_FEE_RATE] }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),
            User.aggregate([
                { $match: { createdAt: { $gte: sixMonthsAgo } } },
                {
                    $group: {
                        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                        users: { $sum: 1 }
                    }
                }
            ])
        ])

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        const userMap = {}
        userCounts.forEach(u => {
            userMap[`${u._id.year}-${u._id.month}`] = u.users
        })

        const result = txData.map(d => ({
            month: monthNames[d._id.month - 1],
            revenue: Math.round(d.revenue),
            fees: Math.round(d.fees),
            users: userMap[`${d._id.year}-${d._id.month}`] || 0,
            count: d.count
        }))

        res.status(200).json(result)
    } catch (error) {
        res.status(500).json({ error: "Failed to get monthly revenue" })
    }
}

export const getProjectsByCategory = async (req, res) => {
    try {
        const data = await Project.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 }
        ])
        res.status(200).json(data.map(d => ({ name: d._id || 'Other', count: d.count })))
    } catch (error) {
        res.status(500).json({ error: "Failed to get category stats" })
    }
}

export const getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate('fromUserId', 'username email')
            .populate('toUserId', 'username email')
            .populate('projectId', 'title')
            .sort({ createdAt: -1 })
            .limit(200)
        res.status(200).json(transactions)
    } catch (error) {
        res.status(500).json({ error: "Failed to get transactions" })
    }
}

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 })
        res.status(200).json(users)
    } catch (error) {
        res.status(500).json({ error: "Failed to get users" })
    }
}

export const banUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
        if (!user) return res.status(404).json({ error: "User not found" })
        user.isBanned = !user.isBanned
        await user.save()
        const { password, ...rest } = user._doc
        res.status(200).json(rest)
    } catch (error) {
        res.status(500).json({ error: "Failed to update user status" })
    }
}

export const getAllDisputes = async (req, res) => {
    try {
        const disputes = await Dispute.find()
            .populate('clientId', 'username email')
            .populate('freelancerId', 'username email')
            .populate('projectId', 'title')
            .sort({ createdAt: -1 })
        res.status(200).json(disputes)
    } catch (error) {
        res.status(500).json({ error: "Failed to get disputes" })
    }
}

export const resolveDispute = async (req, res) => {
    try {
        const { adminNote } = req.body
        const dispute = await Dispute.findByIdAndUpdate(
            req.params.id,
            { status: 'resolved', adminNote, resolvedBy: req.user._id },
            { new: true }
        )
        await Project.findByIdAndUpdate(dispute.projectId, { status: 'completed' })
        res.status(200).json(dispute)
    } catch (error) {
        res.status(500).json({ error: "Failed to resolve dispute" })
    }
}
