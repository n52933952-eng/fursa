import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['client', 'freelancer', 'admin'], default: 'client' },
    profilePic: { type: String, default: '' },
    bio: { type: String, default: '' },
    skills: [{ type: String }],
    portfolio: [{ type: String }],
    country: { type: String, default: '' },
    language: { type: String, enum: ['ar', 'en'], default: 'ar' },
    isVerified: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalProjects: { type: Number, default: 0 },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
}, { timestamps: true })

const User = mongoose.model("User", UserSchema)
export default User
