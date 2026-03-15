import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import { emitToAdmins } from '../socket/socket.js'

export const getWallet = async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ userId: req.user._id })
        if (!wallet) return res.status(404).json({ error: "Wallet not found" })
        res.status(200).json(wallet)
    } catch (error) {
        res.status(500).json({ error: "Failed to get wallet" })
    }
}

export const getTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({
            $or: [{ fromUserId: req.user._id }, { toUserId: req.user._id }]
        }).sort({ createdAt: -1 }).limit(20)
        res.status(200).json(transactions)
    } catch (error) {
        res.status(500).json({ error: "Failed to get transactions" })
    }
}

export const deposit = async (req, res) => {
    try {
        const { amount } = req.body
        await Wallet.findOneAndUpdate(
            { userId: req.user._id },
            { $inc: { balance: amount } },
            { upsert: true }
        )
        const depositTx = await new Transaction({
            toUserId: req.user._id,
            amount,
            type: 'deposit',
            description: 'Wallet deposit'
        }).save()
        emitToAdmins('adminUpdate', { type: 'newTransaction', data: depositTx })
        res.status(200).json({ message: "Deposit successful" })
    } catch (error) {
        res.status(500).json({ error: "Deposit failed" })
    }
}

export const withdraw = async (req, res) => {
    try {
        const { amount } = req.body
        const wallet = await Wallet.findOne({ userId: req.user._id })
        if (!wallet || wallet.balance < amount)
            return res.status(400).json({ error: "Insufficient balance" })

        await Wallet.findOneAndUpdate({ userId: req.user._id }, { $inc: { balance: -amount } })
        const withdrawTx = await new Transaction({
            fromUserId: req.user._id,
            amount,
            type: 'withdrawal',
            description: 'Wallet withdrawal'
        }).save()
        emitToAdmins('adminUpdate', { type: 'newTransaction', data: withdrawTx })
        res.status(200).json({ message: "Withdrawal successful" })
    } catch (error) {
        res.status(500).json({ error: "Withdrawal failed" })
    }
}
