import mongoose from 'mongoose'

const MilestoneSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    amount: { type: Number, required: true },
    dueDate: { type: Date },
    status: { type: String, enum: ['pending', 'in-progress', 'review', 'completed', 'released'], default: 'pending' },
    order: { type: Number, default: 0 },
}, { timestamps: true })

const Milestone = mongoose.model("Milestone", MilestoneSchema)
export default Milestone
