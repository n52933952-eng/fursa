import Deliverable from '../models/Deliverable.js'

export const uploadDeliverable = async (req, res) => {
    try {
        const { projectId, milestoneId, note } = req.body
        const file = req.file
        if (!file) return res.status(400).json({ error: "No file uploaded" })

        // Get latest version number for this project
        const latest = await Deliverable.findOne({ projectId }).sort({ version: -1 })
        const version = latest ? latest.version + 1 : 1

        const deliverable = new Deliverable({
            projectId,
            milestoneId: milestoneId || null,
            uploadedBy: req.user._id,
            filename: file.filename,
            originalName: file.originalname,
            fileUrl: `/uploads/deliverables/${file.filename}`,
            fileSize: file.size,
            version,
            note
        })
        await deliverable.save()
        res.status(201).json(deliverable)
    } catch (error) {
        res.status(500).json({ error: "Upload failed" })
    }
}

export const getDeliverables = async (req, res) => {
    try {
        const deliverables = await Deliverable.find({ projectId: req.params.projectId })
            .populate('uploadedBy', 'username profilePic')
            .sort({ version: -1 })
        res.status(200).json(deliverables)
    } catch (error) {
        res.status(500).json({ error: "Failed to get deliverables" })
    }
}
