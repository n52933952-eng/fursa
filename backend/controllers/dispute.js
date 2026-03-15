import Dispute from '../models/Dispute.js'
import Project from '../models/Project.js'
import { emitToAdmins } from '../socket/socket.js'

export const createDispute = async (req, res) => {
    try {
        const { projectId, reason } = req.body
        const project = await Project.findById(projectId)
        if (!project) return res.status(404).json({ error: "Project not found" })

        const dispute = new Dispute({
            projectId,
            clientId: project.clientId,
            freelancerId: project.freelancerId,
            reason
        })
        await dispute.save()
        await Project.findByIdAndUpdate(projectId, { status: 'disputed' })

        // Notify admin dashboard in real-time
        emitToAdmins('adminUpdate', { type: 'newDispute', data: dispute })

        res.status(201).json(dispute)
    } catch (error) {
        res.status(500).json({ error: "Failed to create dispute" })
    }
}

export const getMyDisputes = async (req, res) => {
    try {
        const disputes = await Dispute.find({
            $or: [{ clientId: req.user._id }, { freelancerId: req.user._id }]
        }).populate('projectId', 'title').sort({ createdAt: -1 })
        res.status(200).json(disputes)
    } catch (error) {
        res.status(500).json({ error: "Failed to get disputes" })
    }
}
