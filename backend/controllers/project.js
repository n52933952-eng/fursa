import Project from '../models/Project.js'

function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
import Milestone from '../models/Milestone.js'
import Contract from '../models/Contract.js'
import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import Notification from '../models/Notification.js'
import { getRecipientSocketId, io, emitToAdmins, emitToFreelancers, emitToClientRoom } from '../socket/socket.js'
import { pushPaymentReleased, pushProjectComplete } from '../services/fcm.js'

export const createProject = async (req, res) => {
    try {
        const { title, description, category, budgetType, budget, deadline, skills } = req.body
        const newProject = new Project({
            title, description, category, budgetType,
            budget, deadline, skills,
            clientId: req.user._id
        })
        await newProject.save()

        const populated = await Project.findById(newProject._id)
            .populate('clientId', 'username profilePic rating')
            .lean()
        const projectPayload = JSON.parse(JSON.stringify(populated || newProject))

        // Admin dashboard
        emitToAdmins('adminUpdate', { type: 'newProject', data: projectPayload })
        // Freelancers: refresh browse feed without reload
        emitToFreelancers('openProjectsChanged', { reason: 'newProject', project: projectPayload })
        // Client (same account, other device / Home list)
        emitToClientRoom(req.user._id, 'clientProjectsChanged', {
            reason: 'created',
            projectId: String(newProject._id),
        })

        res.status(201).json(projectPayload)
    } catch (error) {
        res.status(500).json({ error: "Failed to create project" })
    }
}

export const getProjects = async (req, res) => {
    try {
        const { category, minBudget, maxBudget, skill, search } = req.query
        const conditions = [{ status: 'open' }]

        if (category) {
            conditions.push({ category: String(category) })
        } else {
            const me = req.user
            const cats = me?.interestedCategories
            if (
                me?.role === 'freelancer'
                && Array.isArray(cats)
                && cats.length > 0
            ) {
                conditions.push({ category: { $in: cats } })
            }
        }

        if (skill) {
            conditions.push({ skills: String(skill) })
        }

        const q = search != null ? String(search).trim() : ''
        if (q) {
            const safe = escapeRegex(q)
            conditions.push({
                $or: [
                    { title: { $regex: safe, $options: 'i' } },
                    { description: { $regex: safe, $options: 'i' } },
                    { category: { $regex: safe, $options: 'i' } },
                    { skills: { $regex: safe, $options: 'i' } },
                ],
            })
        }

        if (minBudget || maxBudget) {
            const budget = {}
            if (minBudget) {
                const n = parseFloat(minBudget)
                if (!Number.isNaN(n)) budget.$gte = n
            }
            if (maxBudget) {
                const n = parseFloat(maxBudget)
                if (!Number.isNaN(n)) budget.$lte = n
            }
            if (Object.keys(budget).length) conditions.push({ budget })
        }

        const filter = conditions.length === 1 ? conditions[0] : { $and: conditions }

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

// Freelancer: mark project complete → escrow moves from client to admin wallet
export const markProjectComplete = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
        if (!project) return res.status(404).json({ error: "Project not found" })
        if (project.freelancerId?.toString() !== req.user._id.toString())
            return res.status(403).json({ error: "Not authorized" })
        if (project.status !== 'in-progress')
            return res.status(400).json({ error: "Project is not in progress" })

        // Get the contract amount
        const contract = await Contract.findOne({ projectId: project._id })
        const amount   = contract?.amount || 0

        // Find admin user to hold the funds
        const User = (await import('../models/User.js')).default
        const adminUser = await User.findOne({ role: 'admin' })
        if (!adminUser) return res.status(500).json({ error: "Admin user not found" })

        if (amount > 0) {
            // Move from client escrow → admin balance (admin holds the payment)
            await Wallet.findOneAndUpdate(
                { userId: project.clientId },
                { $inc: { escrow: -amount } }
            )
            await Wallet.findOneAndUpdate(
                { userId: adminUser._id },
                { $inc: { balance: amount } },
                { upsert: true }
            )
            // Internal transaction: admin records the held amount (client already saw -$X when accepting the bid)
            // fromUserId is admin so this does NOT appear twice in the client's transaction history
            await new Transaction({
                fromUserId:  adminUser._id,
                toUserId:    adminUser._id,
                amount,
                type:        'escrow',
                projectId:   project._id,
                description: `Holding payment pending review for: ${project.title}`
            }).save()
        }

        // Move all pending milestones to review
        await Milestone.updateMany(
            { projectId: project._id, status: 'pending' },
            { status: 'review' }
        )

        await Project.findByIdAndUpdate(req.params.id, {
            status: 'pending-approval',
            pendingAmount: amount
        })

        // Notify client
        const clientNotif = new Notification({
            userId: project.clientId,
            type:   'project',
            title:  'Project Submitted for Review',
            body:   `Freelancer marked "${project.title}" as complete. $${amount} moved to admin holding.`,
        })
        await clientNotif.save()
        const clientSocket = getRecipientSocketId(project.clientId.toString())
        if (clientSocket) {
            io.to(clientSocket).emit('newNotification', clientNotif)
        } else {
            pushProjectComplete(project.clientId, req.user.username, project.title, project._id)
        }

        // Notify admin dashboard in real-time
        emitToAdmins('adminUpdate', {
            type: 'projectComplete',
            data: { projectId: project._id, title: project.title, amount }
        })

        res.status(200).json({ message: "Project submitted for admin approval", amount })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Failed to mark project complete" })
    }
}

// Admin: release funds from admin wallet → freelancer + complete project
export const adminReleaseProjectPayment = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
        if (!project) return res.status(404).json({ error: "Project not found" })
        if (project.status !== 'pending-approval')
            return res.status(400).json({ error: "Project is not pending approval" })

        const contract = await Contract.findOne({ projectId: project._id })
        const amount   = contract?.amount || project.pendingAmount || 0

        // Find admin user
        const User = (await import('../models/User.js')).default
        const adminUser = await User.findOne({ role: 'admin' })
        if (!adminUser) return res.status(500).json({ error: "Admin user not found" })

        if (amount > 0) {
            // Move admin balance → freelancer balance + totalEarned
            await Wallet.findOneAndUpdate(
                { userId: adminUser._id },
                { $inc: { balance: -amount } }
            )
            await Wallet.findOneAndUpdate(
                { userId: project.freelancerId },
                { $inc: { balance: amount, totalEarned: amount } },
                { upsert: true }
            )
            // Transaction: admin → freelancer (release)
            await new Transaction({
                fromUserId:  adminUser._id,
                toUserId:    project.freelancerId,
                amount,
                type:        'release',
                projectId:   project._id,
                description: `Admin approved and released payment for: ${project.title}`
            }).save()
        }

        // Mark all review milestones as released
        await Milestone.updateMany(
            { projectId: project._id, status: 'review' },
            { status: 'released' }
        )

        await Project.findByIdAndUpdate(project._id, { status: 'completed' })

        // ── Notify freelancer (real-time) ─────────────────────────────────────
        const freelancerNotif = new Notification({
            userId: project.freelancerId,
            type:   'payment',
            title:  '💸 Payment Released!',
            body:   `Admin approved your work on "${project.title}". $${amount} added to your wallet!`,
        })
        await freelancerNotif.save()
        const freelancerSocket = getRecipientSocketId(project.freelancerId.toString())
        if (freelancerSocket) {
            io.to(freelancerSocket).emit('newNotification', freelancerNotif)
            io.to(freelancerSocket).emit('paymentReleased', { amount, projectTitle: project.title })
        } else {
            pushPaymentReleased(project.freelancerId, amount, project.title)
        }

        // ── Notify client (real-time) ─────────────────────────────────────────
        const clientNotif = new Notification({
            userId: project.clientId,
            type:   'project',
            title:  '✅ Project Completed!',
            body:   `Your project "${project.title}" has been completed and payment released to the freelancer.`,
        })
        await clientNotif.save()
        const clientSocket = getRecipientSocketId(project.clientId.toString())
        if (clientSocket) io.to(clientSocket).emit('newNotification', clientNotif)

        // ── Update admin dashboard ────────────────────────────────────────────
        emitToAdmins('adminUpdate', { type: 'projectReleased', data: { projectId: project._id, amount } })

        res.status(200).json({ message: "Payment released successfully", totalReleased: amount })
    } catch (error) {
        console.error(error)
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
