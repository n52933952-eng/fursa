import mongoose from 'mongoose'

const DeliverableSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', default: null },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number },
    version: { type: Number, default: 1 },
    note: { type: String, default: '' },
}, { timestamps: true })

const Deliverable = mongoose.model("Deliverable", DeliverableSchema)
export default Deliverable
