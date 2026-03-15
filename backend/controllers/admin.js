import User from '../models/User.js'
import Project from '../models/Project.js'
import Transaction from '../models/Transaction.js'
import Dispute from '../models/Dispute.js'

export const getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments()
        const activeProjects = await Project.countDocuments({ status: 'in-progress' })
        const openDisputes = await Dispute.countDocuments({ status: 'open' })
        const transactions = await Transaction.find({ type: 'release' })
        const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0)
        res.status(200).json({ totalUsers, activeProjects, openDisputes, totalRevenue })
    } catch (error) {
        res.status(500).json({ error: "Failed to get stats" })
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
        const user = await User.findByIdAndUpdate(
            req.params.id, { isBanned: true }, { new: true }
        ).select("-password")
        res.status(200).json({ message: "User banned", user })
    } catch (error) {
        res.status(500).json({ error: "Failed to ban user" })
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
