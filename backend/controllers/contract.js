import Contract from '../models/Contract.js'

export const getContractByProject = async (req, res) => {
    try {
        const contract = await Contract.findOne({ projectId: req.params.projectId })
            .populate('clientId', 'username profilePic')
            .populate('freelancerId', 'username profilePic rating')
            .populate('projectId', 'title category status')
        if (!contract) return res.status(404).json({ error: "Contract not found" })
        res.status(200).json(contract)
    } catch (error) {
        res.status(500).json({ error: "Failed to get contract" })
    }
}
