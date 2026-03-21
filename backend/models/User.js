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
    // Google / Firebase auth
    googleId:     { type: String, default: null },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    // Push notifications (FCM)
    fcmToken:     { type: String, default: null },
    /**
     * Display / payout reference only — never store full PAN or CVV (PCI).
     * Real charges should use Tap/PayTabs tokenization on the client.
     */
    savedCards: [{
        nickname:   { type: String, default: '' },
        holderName: { type: String, required: true, trim: true },
        brand:      { type: String, enum: ['visa', 'mastercard', 'mada', 'amex', 'other'], default: 'other' },
        last4:      { type: String, required: true },
        expiry:     { type: String, default: '' },
    }],
}, { timestamps: true })

const User = mongoose.model("User", UserSchema)
export default User
