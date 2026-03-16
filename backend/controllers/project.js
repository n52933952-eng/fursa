import Project from '../models/Project.js'
import Milestone from '../models/Milestone.js'
import Contract from '../models/Contract.js'
import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import Notification from '../models/Notification.js'
import { getRecipientSocketId, io, emitToAdmins } from '../socket/socket.js'

export const createProject = async (req, res) => {
    try {
        const { title, description, category, budgetType, budget, deadline, skills } = req.body
        const newProject = new Project({
            title, description, category, budgetType,
            budget, deadline, skills,
            clientId: req.user._id
        })
        await newProject.save()

        // Notify admin dashboard in real-time
        emitToAdmins('adminUpdate', { type: 'newProject', data: newProject })

        res.status(201).json(newProject)
    } catch (error) {
        res.status(500).json({ error: "Failed to create project" })
    }
}

export const getProjects = async (req, res) => {
    try {
        const { category, minBudget, maxBudget, skill, search } = req.query
        let filter = { status: 'open' }

        if (category) filter.category = category
        if (skill) filter.skills = { $in: [skill] }
        if (search) filter.title = { $regex: search, $options: 'i' }
        if (minBudget || maxBudget) {
            filter.budget = {}
            if (minBudget) filter.budget.$gte = parseFloat(minBudget)
            if (maxBudget) filter.budget.$lte = parseFloat(maxBudget)
        }

        const projects = await Project.find(filter)
            .populate('clientId', 'username profilePic rating')
            .sort({ createdAt: -1 })
        res.status(200).json(projects)
    } catch (error) {
        res.status(500).json({ error: "Failed to get projects" })
    }
}

export const getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('clientId', 'username profilePic rating country')
            .populate('proposals')
        if (!project) return res.status(404).json({ error: "Project not found" })
        res.status(200).json(project)
    } catch (error) {
        res.status(500).json({ error: "Failed to get project" })
    }
}

export const getMyProjects = async (req, res) => {
    try {
        const projects = await Project.find({ clientId: req.user._id }).sort({ createdAt: -1 })
        res.status(200).json(projects)
    } catch (error) {
        res.status(500).json({ error: "Failed to get projects" })
    }
}

// Admin: get ALL projects (no status filter)
export const getAllProjectsAdmin = async (req, res) => {
    try {
        const projects = await Project.find()
            .populate('clientId', 'username profilePic')
            .sort({ createdAt: -1 })
        res.status(200).json(projects)
    } catch (error) {
        res.status(500).json({ error: "Failed to get projects" })
    }
}

// Freelancer: mark project as complete → awaits admin approval
export const markProjectComplete = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
        if (!project) return res.status(404).json({ error: "Project not found" })
        if (project.freelancerId?.toString() !== req.user._id.toString())
            return res.status(403).json({ error: "Not authorized" })

        await Project.findByIdAndUpdate(req.params.id, { status: 'pending-approval' })

        // Move all pending milestones to review
        await Milestone.updateMany(
            { projectId: project._id, status: 'pending' },
            { status: 'review' }
        )

        // Notify admin
        emitToAdmins('adminUpdate', {
            type: 'projectComplete',
            data: { projectId: project._id, title: project.title }
        })

        res.status(200).json({ message: "Project submitted for admin approval" })
    } catch (error) {
        res.status(500).json({ error: "Failed to mark project complete" })
    }
}

// Admin: release all escrowed funds to freelancer and close project
export const adminReleaseProjectPayment = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
        if (!project) return res.status(404).json({ error: "Project not found" })

        const reviewMilestones = await Milestone.find({ projectId: project._id, status: 'review' })
        let totalReleased = 0

        for (const ms of reviewMilestones) {
            await Milestone.findByIdAndUpdate(ms._id, { status: 'released' })
            await Wallet.findOneAndUpdate(
                { userId: project.clientId },
                { $inc: { escrow: -ms.amount } }
            )
            await Wallet.findOneAndUpdate(
                { userId: project.freelancerId },
                { $inc: { balance: ms.amount, totalEarned: ms.amount } },
                { upsert: true }
            )
            totalReleased += ms.amount
        }

        // If no milestones, release from contract amount
        if (reviewMilestones.length === 0) {
            const contract = await Contract.findOne({ projectId: project._id })
            const amount = contract?.amount || 0
            if (amount > 0) {
                await Wallet.findOneAndUpdate({ userId: project.clientId }, { $inc: { escrow: -amount } })
                await Wallet.findOneAndUpdate(
                    { userId: project.freelancerId },
                    { $inc: { balance: amount, totalEarned: amount } },
                    { upsert: true }
                )
                totalReleased = amount
            }
        }

        if (totalReleased > 0) {
            await new Transaction({
                fromUserId: project.clientId,
                toUserId:   project.freelancerId,
                amount:     totalReleased,
                type:       'release',
                projectId:  project._id,
                description: `Admin released payment for: ${project.title}`
            }).save()
        }

        await Project.findByIdAndUpdate(project._id, { status: 'completed' })

        const notification = new Notification({
            userId: project.freelancerId,
            type: 'payment',
            title: 'Payment Released by Admin!',
            body: `$${totalReleased} approved and released for: ${project.title}`,
        })
        await notification.save()

        const freelancerSocket = getRecipientSocketId(project.freelancerId.toString())
        if (freelancerSocket) {
            io.to(freelancerSocket).emit('newNotification', notification)
            io.to(freelancerSocket).emit('paymentReleased', { amount: totalReleased, projectTitle: project.title })
        }

        emitToAdmins('adminUpdate', { type: 'projectReleased', data: { projectId: project._id } })

        res.status(200).json({ message: "Payment released successfully", totalReleased })
    } catch (error) {
        res.status(500).json({ error: "Failed to release payment" })
    }
}

export const deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
        if (!project) return res.status(404).json({ error: "Project not found" })
        if (project.clientId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: "Not authorized" })
        await Project.findByIdAndDelete(req.params.id)
        res.status(200).json({ message: "Project deleted" })
    } catch (error) {
        res.status(500).json({ error: "Failed to delete project" })
    }
}
