import Proposal from '../models/Proposal.js'
import Project from '../models/Project.js'
import Contract from '../models/Contract.js'
import Notification from '../models/Notification.js'
import { getRecipientSocketId, io } from '../socket/socket.js'

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
        if (clientSocketId) io.to(clientSocketId).emit("newNotification", notification)

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
            body: `Your proposal was accepted for: ${project.title}`,
            link: `/project/${proposal.projectId}`
        })
        await notification.save()
        const freelancerSocketId = getRecipientSocketId(proposal.freelancerId.toString())
        if (freelancerSocketId) {
            io.to(freelancerSocketId).emit('newNotification', notification)
            // Dedicated event so mobile MyBids screen updates instantly
            io.to(freelancerSocketId).emit('proposalAccepted', {
                proposalId: proposal._id,
                projectId:  proposal.projectId,
                projectTitle: project.title,
                bid: proposal.bid,
            })
        }

        res.status(200).json({ message: "Proposal accepted", contract })
    } catch (error) {
        res.status(500).json({ error: "Failed to accept proposal" })
    }
}
