import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

import User from './models/User.js'

async function seed() {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    const existing = await User.findOne({ email: 'admin@fursa.com' })
    if (existing) {
        console.log('Admin already exists:', existing.email)
        process.exit(0)
    }

    const hashed = await bcrypt.hash('pass123', 10)
    const admin = new User({
        username: 'admin',
        email: 'admin@fursa.com',
        password: hashed,
        role: 'admin',
        isVerified: true,
    })
    await admin.save()
    console.log('✅ Admin created successfully!')
    console.log('   Email:    admin@fursa.com')
    console.log('   Password: pass123')
    process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
