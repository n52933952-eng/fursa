import mongoose from 'mongoose'

const ContractSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    proposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: true },
    terms: { type: String, required: true },
    amount: { type: Number, required: true },
    deadline: { type: Date, required: true },
    status: { type: String, enum: ['active', 'completed', 'cancelled', 'disputed'], default: 'active' },
    clientSigned: { type: Boolean, default: true },
    freelancerSigned: { type: Boolean, default: false },
}, { timestamps: true })

const Contract = mongoose.model("Contract", ContractSchema)
export default Contract
