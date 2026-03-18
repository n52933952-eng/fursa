import Proposal from '../models/Proposal.js'
import Project from '../models/Project.js'
import Contract from '../models/Contract.js'
import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import Notification from '../models/Notification.js'
import { getRecipientSocketId, io, emitToAdmins } from '../socket/socket.js'
import { pushNewProposal, pushProposalAccepted } from '../services/fcm.js'

export const submitProposal = async (req, res) => {
    try {
        const { projectId, coverLetter, bid, deliveryTime } = req.body
        const project = await Project.findById(projectId)
        if (!project) return res.status(404).json({ error: "Project not found" })
        if (project.status !== 'open') return res.status(400).json({ error: "Project is not open" })

        const existing = await Proposal.findOne({ projectId, freelancerId: req.user._id })
        if (existing) return res.status(400).json({ error: "Already submitted a proposal" })

        const proposal = new Proposal({ projectId, freelancerId: req.user._id, coverLetter, bid, deliveryTime })
        await proposal.save()
        await Project.findByIdAndUpdate(projectId, { $push: { proposals: proposal._id } })

        // Notify client
        const notification = new Notification({
            userId: project.clientId,
            type: 'proposal',
            title: 'New Proposal',
            body: `${req.user.username} submitted a proposal on your project`,
            link: `/project/${projectId}`
        })
        await notification.save()
        const clientSocketId = getRecipientSocketId(project.clientId.toString())
        if (clientSocketId) {
            io.to(clientSocketId).emit("newNotification", notification)
        } else {
            // Client is offline — push notification
            pushNewProposal(project.clientId, req.user.username, project.title, projectId)
        }

        res.status(201).json(proposal)
    } catch (error) {
        res.status(500).json({ error: "Failed to submit proposal" })
    }
}

export const getMyProposals = async (req, res) => {
    try {
        const proposals = await Proposal.find({ freelancerId: req.user._id })
            .populate('projectId', 'title budget status category clientId')
            .sort({ createdAt: -1 })
        res.status(200).json(proposals)
    } catch (error) {
        res.status(500).json({ error: "Failed to get proposals" })
    }
}

export const getProposalsByProject = async (req, res) => {
    try {
        const proposals = await Proposal.find({ projectId: req.params.projectId })
            .populate('freelancerId', 'username profilePic rating skills totalProjects')
            .sort({ createdAt: -1 })
        res.status(200).json(proposals)
    } catch (error) {
        res.status(500).json({ error: "Failed to get proposals" })
    }
}

export const acceptProposal = async (req, res) => {
    try {
        const proposal = await Proposal.findById(req.params.id)
        if (!proposal) return res.status(404).json({ error: "Proposal not found" })

        const project = await Project.findById(proposal.projectId)
        if (project.clientId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: "Not authorized" })

        // ── Check client wallet has enough funds ──────────────────────────────
        const clientWallet = await Wallet.findOne({ userId: req.user._id })
        if (!clientWallet || clientWallet.balance < proposal.bid) {
            return res.status(400).json({
                error: `Insufficient wallet balance. You need $${proposal.bid} to accept this bid. Please add funds to your wallet first.`
            })
        }

        // ── Lock bid amount in escrow ─────────────────────────────────────────
        await Wallet.findOneAndUpdate(
            { userId: req.user._id },
            { $inc: { balance: -proposal.bid, escrow: proposal.bid } }
        )
        await new Transaction({
            fromUserId:  req.user._id,
            toUserId:    req.user._id,
            amount:      proposal.bid,
            type:        'escrow',
            projectId:   proposal.projectId,
            description: `Funds locked in escrow for: ${project.title}`
        }).save()

        await Proposal.findByIdAndUpdate(req.params.id, { status: 'accepted' })
        await Project.findByIdAndUpdate(proposal.projectId, {
            status: 'in-progress',
            freelancerId: proposal.freelancerId
        })

        // Auto-generate contract
        const contract = new Contract({
            projectId: proposal.projectId,
            clientId: req.user._id,
            freelancerId: proposal.freelancerId,
            proposalId: proposal._id,
            terms: `Project: ${project.title}. Budget: $${proposal.bid}. Delivery: ${proposal.deliveryTime} days.`,
            amount: proposal.bid,
            deadline: new Date(Date.now() + proposal.deliveryTime * 24 * 60 * 60 * 1000)
        })
        await contract.save()
        await Project.findByIdAndUpdate(proposal.projectId, { contractId: contract._id })

        // Notify freelancer
        const notification = new Notification({
            userId: proposal.freelancerId,
            type: 'proposal',
            title: 'Proposal Accepted!',
            body: `Your proposal was accepted for: ${project.title}. $${proposal.bid} has been locked in escrow.`,
            link: `/project/${proposal.projectId}`
        })
        await notification.save()
        const freelancerSocketId = getRecipientSocketId(proposal.freelancerId.toString())
        if (freelancerSocketId) {
            io.to(freelancerSocketId).emit('newNotification', notification)
            io.to(freelancerSocketId).emit('proposalAccepted', {
                proposalId:   proposal._id,
                projectId:    proposal.projectId,
                projectTitle: project.title,
                bid:          proposal.bid,
            })
        } else {
            // Freelancer is offline — push notification
            pushProposalAccepted(proposal.freelancerId, project.title, proposal.projectId)
        }

        // Notify CLIENT — money was deducted from their wallet into escrow
        const clientNotif = new Notification({
            userId: req.user._id,
            type:   'payment',
            title:  '🔒 Money Deducted from Your Wallet',
            body:   `$${proposal.bid} has been deducted from your wallet and locked in escrow for: "${project.title}". It will be released once the project is approved.`,
        })
        await clientNotif.save()
        const clientSocketId = getRecipientSocketId(req.user._id.toString())
        if (clientSocketId) io.to(clientSocketId).emit('newNotification', clientNotif)

        // Notify admin
        emitToAdmins('adminUpdate', {
            type: 'proposalAccepted',
            data: { projectTitle: project.title, bid: proposal.bid }
        })

        res.status(200).json({ message: "Proposal accepted", contract })
    } catch (error) {
        res.status(500).json({ error: "Failed to accept proposal" })
    }
}
