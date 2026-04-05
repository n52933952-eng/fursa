import Message from '../models/Message.js'
import Conversation from '../models/Conversation.js'
import { getRecipientSocketId, io } from '../socket/socket.js'
import { pushNewMessage } from '../services/fcm.js'

/** Sender or admin (participant) may delete a message */
export const deleteMessage = async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId)
        if (!message) return res.status(404).json({ error: 'Message not found' })

        const conversation = await Conversation.findById(message.conversationId)
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' })

        const uid = String(req.user._id)
        const participantIds = conversation.participants.map((p) => String(p))
        if (!participantIds.includes(uid)) {
            return res.status(403).json({ error: 'Not a participant in this conversation' })
        }

        const isSender = String(message.senderId) === uid
        const isAdmin = req.user.role === 'admin'
        if (!isSender && !isAdmin) {
            return res.status(403).json({ error: 'You can only delete your own messages' })
        }

        await Message.findByIdAndDelete(message._id)

        if (String(conversation.lastMessage) === String(message._id)) {
            const prev = await Message.findOne({ conversationId: conversation._id }).sort({ createdAt: -1 })
            await Conversation.findByIdAndUpdate(conversation._id, {
                lastMessage: prev?._id || null,
            })
        }

        const payload = { messageId: String(message._id), conversationId: String(conversation._id) }
        for (const pid of conversation.participants) {
            const sid = getRecipientSocketId(pid)
            if (sid) io.to(sid).emit('messageDeleted', payload)
        }

        res.status(200).json({ ok: true, ...payload })
    } catch (error) {
        console.error('[deleteMessage]', error?.message || error)
        res.status(500).json({ error: 'Failed to delete message' })
    }
}

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
        }
        // Always FCM too — app closed/background often still has a socket briefly; user expects a tray notification.
        pushNewMessage(
            recipientId,
            req.user.username,
            text || '📎 Attachment',
            conversation._id,
        ).catch((e) => console.error('[FCM] pushNewMessage', e?.message || e))

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
            .populate('participants', 'username profilePic role email rating isBanned')
            .populate('lastMessage')
            .sort({ updatedAt: -1 })
        res.status(200).json(conversations)
    } catch (error) {
        res.status(500).json({ error: "Failed to get conversations" })
    }
}
