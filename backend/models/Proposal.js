import mongoose from 'mongoose'

const ProposalSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coverLetter: { type: String, required: true },
    bid: { type: Number, required: true },
    deliveryTime: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: true })

const Proposal = mongoose.model("Proposal", ProposalSchema)
export default Proposal
