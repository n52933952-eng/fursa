import mongoose from 'mongoose'

const ProjectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    budgetType: { type: String, enum: ['fixed', 'hourly'], default: 'fixed' },
    budget: { type: Number, required: true },
    deadline: { type: Date, required: true },
    skills: [{ type: String }],
    attachments: [{ type: String }],
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['open', 'in-progress', 'completed', 'cancelled', 'disputed'], default: 'open' },
    proposals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' }],
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', default: null },
}, { timestamps: true })

const Project = mongoose.model("Project", ProjectSchema)
export default Project
