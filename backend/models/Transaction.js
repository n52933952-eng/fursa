import mongoose from 'mongoose'

const TransactionSchema = new mongoose.Schema({
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['deposit', 'withdrawal', 'escrow', 'release', 'refund'], required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', default: null },
    description: { type: String, default: '' },
}, { timestamps: true })

const Transaction = mongoose.model("Transaction", TransactionSchema)
export default Transaction
