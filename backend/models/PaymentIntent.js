import mongoose from 'mongoose'

/** Tracks a wallet top-up before the payment provider confirms (e.g. Tap). */
const PaymentIntentSchema = new mongoose.Schema({
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider:   { type: String, enum: ['tap', 'paytabs'], required: true },
    externalId: { type: String, required: true },
    amount:     { type: Number, required: true },
    currency:   { type: String, default: 'USD' },
    status:     { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'pending' },
}, { timestamps: true })

PaymentIntentSchema.index({ provider: 1, externalId: 1 }, { unique: true })

export default mongoose.model('PaymentIntent', PaymentIntentSchema)
