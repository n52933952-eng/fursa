import mongoose from 'mongoose'

const ServiceSchema = new mongoose.Schema({
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    deliveryTime: { type: Number, required: true },
    images: [{ type: String }],
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
    orders: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
}, { timestamps: true })

const Service = mongoose.model("Service", ServiceSchema)
export default Service
