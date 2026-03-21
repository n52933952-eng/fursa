import { Server } from 'socket.io'
import http from 'http'
import express from 'express'

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
})

const userSocketMap = {}

export const getRecipientSocketId = (recipientId) => {
    if (recipientId == null) return null
    const key = String(recipientId)
    const userData = userSocketMap[key]
    return userData ? userData.socketId : null
}

// Broadcast an event to all connected admin sockets (admin-room)
export const emitToAdmins = (event, data) => {
    io.to('admin-room').emit(event, data)
}

/** Freelancers browsing open projects join this room */
export const emitToFreelancers = (event, data) => {
    io.to('freelancers-room').emit(event, data)
}

/** Per-client room: `client:<userId>` — multi-device + targeted updates */
export const emitToClientRoom = (clientUserId, event, data) => {
    if (clientUserId == null) return
    io.to(`client:${String(clientUserId)}`).emit(event, data)
}

io.on("connection", socket => {
    console.log("socket connected", socket.id)

    const userIdRaw = socket.handshake.query.userId
    const role      = socket.handshake.query.role
    const userIdStr = userIdRaw != null ? String(userIdRaw) : ''
    const userId    = userIdStr && userIdStr !== 'undefined' ? userIdStr : null

    if (userId) {
        userSocketMap[userId] = {
            socketId: socket.id,
            onlineAt: Date.now()
        }
        if (role === 'client') {
            socket.join(`client:${userId}`)
        }
        if (role === 'freelancer') {
            socket.join('freelancers-room')
        }
    }

    // Admins join their own room for targeted broadcasts
    if (role === 'admin') {
        socket.join('admin-room')
    }

    const onlineArray = Object.entries(userSocketMap).map(([id, data]) => ({
        userId: id,
        onlineAt: data.onlineAt
    }))
    io.emit("getOnlineUsers", onlineArray)

    // New message event
    socket.on("sendMessage", (data) => {
        const { recipientId } = data
        const recipientSocketId = getRecipientSocketId(recipientId)
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("newMessage", data)
        }
    })

    // Proposal submitted
    socket.on("newProposal", (data) => {
        const { clientId } = data
        const clientSocketId = getRecipientSocketId(clientId)
        if (clientSocketId) {
            io.to(clientSocketId).emit("proposalReceived", data)
        }
    })

    // Proposal accepted
    socket.on("proposalAccepted", (data) => {
        const { freelancerId } = data
        const freelancerSocketId = getRecipientSocketId(freelancerId)
        if (freelancerSocketId) {
            io.to(freelancerSocketId).emit("proposalAccepted", data)
        }
    })

    // Milestone review requested
    socket.on("milestoneReview", (data) => {
        const { clientId } = data
        const clientSocketId = getRecipientSocketId(clientId)
        if (clientSocketId) {
            io.to(clientSocketId).emit("milestoneReviewRequested", data)
        }
    })

    // Payment released
    socket.on("paymentReleased", (data) => {
        const { freelancerId } = data
        const freelancerSocketId = getRecipientSocketId(freelancerId)
        if (freelancerSocketId) {
            io.to(freelancerSocketId).emit("paymentReleased", data)
        }
    })

    // Notification
    socket.on("sendNotification", (data) => {
        const { recipientId } = data
        const recipientSocketId = getRecipientSocketId(recipientId)
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("newNotification", data)
        }
    })

    socket.on("disconnect", () => {
        console.log("user disconnected", socket.id)
        for (const [id, data] of Object.entries(userSocketMap)) {
            if (data.socketId === socket.id) {
                delete userSocketMap[String(id)]
                break
            }
        }
        const updatedOnlineArray = Object.entries(userSocketMap).map(([id, data]) => ({
            userId: id,
            onlineAt: data.onlineAt
        }))
        io.emit("getOnlineUsers", updatedOnlineArray)
    })
})

export { io, server, app }
