import Message from '../models/Message.js'
import Conversation from '../models/Conversation.js'
import { getRecipientSocketId, io } from '../socket/socket.js'
import { pushNewMessage } from '../services/fcm.js'

export const sendMessage = async (req, res) => {
    try {
        const { recipientId, text, file, fileType } = req.body
        const senderId = req.user._id

        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, recipientId] }
        })

        if (!conversation) {
            conversation = new Conversation({ participants: [senderId, recipientId] })
            await conversation.save()
        }

        const message = new Message({
            conversationId: conversation._id,
            senderId,
            text: text || '',
            file: file || '',
            fileType: fileType || ''
        })
        await message.save()
        await Conversation.findByIdAndUpdate(conversation._id, { lastMessage: message._id })

        const recipientSocketId = getRecipientSocketId(recipientId)
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("newMessage", message)
        } else {
            // Recipient is offline — send push notification
            pushNewMessage(
                recipientId,
                req.user.username,
                text || '📎 Attachment',
                conversation._id
            )
        }

        res.status(201).json(message)
    } catch (error) {
        res.status(500).json({ error: "Failed to send message" })
    }
}

export const getMessages = async (req, res) => {
    try {
        const { userId } = req.params
        const conversation = await Conversation.findOne({
            participants: { $all: [req.user._id, userId] }
        })
        if (!conversation) return res.status(200).json([])

        const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 })
        res.status(200).json(messages)
    } catch (error) {
        res.status(500).json({ error: "Failed to get messages" })
    }
}

export const getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: { $in: [req.user._id] }
        })
            .populate('participants', 'username profilePic')
            .populate('lastMessage')
            .sort({ updatedAt: -1 })
        res.status(200).json(conversations)
    } catch (error) {
        res.status(500).json({ error: "Failed to get conversations" })
    }
}
