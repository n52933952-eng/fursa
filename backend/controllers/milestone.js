import Milestone from '../models/Milestone.js'
import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import Project from '../models/Project.js'
import Notification from '../models/Notification.js'
import { getRecipientSocketId, io } from '../socket/socket.js'

export const createMilestones = async (req, res) => {
    try {
        const { projectId, milestones } = req.body
        const created = await Milestone.insertMany(
            milestones.map((m, i) => ({ ...m, projectId, order: i }))
        )
        res.status(201).json(created)
    } catch (error) {
        res.status(500).json({ error: "Failed to create milestones" })
    }
}

export const getMilestones = async (req, res) => {
    try {
        const milestones = await Milestone.find({ projectId: req.params.projectId }).sort({ order: 1 })
        res.status(200).json(milestones)
    } catch (error) {
        res.status(500).json({ error: "Failed to get milestones" })
    }
}

export const requestReview = async (req, res) => {
    try {
        const milestone = await Milestone.findByIdAndUpdate(
            req.params.id, { status: 'review' }, { new: true }
        )
        const project = await Project.findById(milestone.projectId)

        const notification = new Notification({
            userId: project.clientId,
            type: 'project',
            title: 'Milestone Ready for Review',
            body: `Freelancer completed: ${milestone.title}`,
            link: `/project/${milestone.projectId}`
        })
        await notification.save()
        const clientSocketId = getRecipientSocketId(project.clientId.toString())
        if (clientSocketId) io.to(clientSocketId).emit("newNotification", notification)

        res.status(200).json(milestone)
    } catch (error) {
        res.status(500).json({ error: "Failed to request review" })
    }
}

export const releasePayment = async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id)
        const project = await Project.findById(milestone.projectId)
        if (project.clientId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: "Not authorized" })

        await Milestone.findByIdAndUpdate(req.params.id, { status: 'released' })

        // Move from escrow to freelancer wallet
        await Wallet.findOneAndUpdate(
            { userId: req.user._id },
            { $inc: { escrow: -milestone.amount } }
        )
        await Wallet.findOneAndUpdate(
            { userId: project.freelancerId },
            { $inc: { balance: milestone.amount, totalEarned: milestone.amount } },
            { upsert: true }
        )

        await new Transaction({
            fromUserId: req.user._id,
            toUserId: project.freelancerId,
            amount: milestone.amount,
            type: 'release',
            projectId: project._id,
            milestoneId: milestone._id,
            description: `Payment released for: ${milestone.title}`
        }).save()

        const notification = new Notification({
            userId: project.freelancerId,
            type: 'payment',
            title: 'Payment Released!',
            body: `$${milestone.amount} released for: ${milestone.title}`,
            link: `/wallet`
        })
        await notification.save()
        const freelancerSocketId = getRecipientSocketId(project.freelancerId.toString())
        if (freelancerSocketId) io.to(freelancerSocketId).emit("newNotification", notification)

        res.status(200).json({ message: "Payment released successfully" })
    } catch (error) {
        res.status(500).json({ error: "Failed to release payment" })
    }
}
