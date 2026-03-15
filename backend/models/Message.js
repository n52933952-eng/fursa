import mongoose from 'mongoose'

const MessageSchema = new mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    file: { type: String, default: '' },
    fileType: { type: String, default: '' },
    seen: { type: Boolean, default: false },
}, { timestamps: true })

const Message = mongoose.model("Message", MessageSchema)
export default Message
