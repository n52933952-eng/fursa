import mongoose from 'mongoose'

const WalletSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0 },
    escrow: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
}, { timestamps: true })

const Wallet = mongoose.model("Wallet", WalletSchema)
export default Wallet
