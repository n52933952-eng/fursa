import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import { emitToAdmins } from '../socket/socket.js'
import { isWalletSandbox, SANDBOX_DEPOSIT_MAX, walletMetaForClient } from '../config/walletMode.js'

export const getWallet = async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ userId: req.user._id })
        if (!wallet) return res.status(404).json({ error: "Wallet not found" })
        const doc = wallet.toObject()
        res.status(200).json({ ...doc, ...walletMetaForClient() })
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
        const amount = Number(req.body?.amount)
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ error: "Invalid amount" })
        }

        if (!isWalletSandbox()) {
            return res.status(403).json({
                error:
                    'Wallet top-up is disabled in live mode. Use your payment provider checkout, then credit the wallet from the server webhook.',
                code: 'DEPOSIT_REQUIRES_PAYMENT_PROVIDER',
                ...walletMetaForClient(),
            })
        }

        if (amount > SANDBOX_DEPOSIT_MAX) {
            return res.status(400).json({
                error: `Sandbox deposit max is $${SANDBOX_DEPOSIT_MAX.toLocaleString()} per request`,
                sandboxDepositMax: SANDBOX_DEPOSIT_MAX,
            })
        }

        await Wallet.findOneAndUpdate(
            { userId: req.user._id },
            { $inc: { balance: amount } },
            { upsert: true }
        )
        const depositTx = await new Transaction({
            toUserId: req.user._id,
            amount,
            type: 'deposit',
            description: 'Sandbox wallet top-up (test money — not a real payment)',
        }).save()
        emitToAdmins('adminUpdate', { type: 'newTransaction', data: depositTx })
        res.status(200).json({ message: "Deposit successful", sandbox: true })
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
