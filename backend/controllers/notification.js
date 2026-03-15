import Notification from '../models/Notification.js'

export const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 }).limit(30)
        res.status(200).json(notifications)
    } catch (error) {
        res.status(500).json({ error: "Failed to get notifications" })
    }
}

export const markAllRead = async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.user._id }, { read: true })
        res.status(200).json({ message: "All notifications marked as read" })
    } catch (error) {
        res.status(500).json({ error: "Failed to update notifications" })
    }
}

export const markOneRead = async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { read: true }
        )
        res.status(200).json({ message: "Notification marked as read" })
    } catch (error) {
        res.status(500).json({ error: "Failed to update notification" })
    }
}
