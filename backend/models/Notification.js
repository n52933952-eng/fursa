import mongoose from 'mongoose'

const NotificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['proposal', 'message', 'payment', 'review', 'dispute', 'project', 'system'], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false },
    link: { type: String, default: '' },
}, { timestamps: true })

const Notification = mongoose.model("Notification", NotificationSchema)
export default Notification
