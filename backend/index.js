import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { server, app } from './socket/socket.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

import authRoute from './routes/auth.js'
import userRoute from './routes/user.js'
import projectRoute from './routes/project.js'
import proposalRoute from './routes/proposal.js'
import serviceRoute from './routes/service.js'
import messageRoute from './routes/message.js'
import milestoneRoute from './routes/milestone.js'
import walletRoute from './routes/wallet.js'
import reviewRoute from './routes/review.js'
import disputeRoute from './routes/dispute.js'
import adminRoute from './routes/admin.js'
import notificationRoute from './routes/notification.js'
import deliverableRoute from './routes/deliverable.js'
import aiRoute from './routes/ai.js'
import invoiceRoute from './routes/invoice.js'
import contractRoute from './routes/contract.js'


app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: (origin, callback) => {
        // Allow: web dashboard (CLIENT_URL), local dev, and mobile apps (no origin header)
        const allowed = [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174']
        if (!origin || allowed.includes(origin)) return callback(null, true)
        callback(null, true) // allow all for mobile API access
    },
    credentials: true
}))

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("DB connected"))
    .catch((error) => console.log(error))

app.use("/api/auth", authRoute)
app.use("/api/user", userRoute)
app.use("/api/project", projectRoute)
app.use("/api/proposal", proposalRoute)
app.use("/api/service", serviceRoute)
app.use("/api/message", messageRoute)
app.use("/api/milestone", milestoneRoute)
app.use("/api/wallet", walletRoute)
app.use("/api/review", reviewRoute)
app.use("/api/dispute", disputeRoute)
app.use("/api/admin", adminRoute)
app.use("/api/notification", notificationRoute)
app.use("/api/deliverable", deliverableRoute)
app.use("/api/ai", aiRoute)
app.use("/api/invoice", invoiceRoute)
app.use("/api/contract", contractRoute)
app.use("/uploads", express.static("uploads"))

// Serve frontend — go up one level from backend/ to find frontent/dist
import fs from 'fs'
const frontendDist = path.join(__dirname, '..', 'frontent', 'dist')
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist))
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendDist, 'index.html'))
    })
} else {
    app.get('/', (req, res) => res.json({ message: 'Fursa API is running 🚀', version: '1.0.0' }))
}

server.listen(process.env.PORT || 5000, () => {
    console.log(`server is running on port ${process.env.PORT || 5000}`)
})
