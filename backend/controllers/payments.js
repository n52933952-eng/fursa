import { randomBytes } from 'crypto'
import PaymentIntent from '../models/PaymentIntent.js'
import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import { emitToAdmins } from '../socket/socket.js'
import { createTapCharge, retrieveTapCharge } from '../services/tapPayments.js'
import { createPaytabsPaymentPage, isPaytabsPaymentSuccessful } from '../services/paytabs.js'

const MAX_TOPUP = parseInt(process.env.WALLET_TOPUP_MAX || '50000', 10) || 50000

/** e.g. fursa://payment/success — set MOBILE_DEEP_LINK=fursa:// in .env */
function deepLink(subPath) {
    const raw = (process.env.MOBILE_DEEP_LINK || 'fursa://').trim()
    const path = String(subPath).replace(/^\//, '')
    if (raw.endsWith('://')) return `${raw}${path}`
    return `${raw.replace(/\/$/, '')}/${path}`
}

async function creditWallet(userId, amount, description) {
    await Wallet.findOneAndUpdate({ userId }, { $inc: { balance: amount } }, { upsert: true })
    const tx = await new Transaction({
        toUserId: userId,
        amount,
        type: 'deposit',
        status: 'completed',
        description: description || 'Wallet top-up',
    }).save()
    emitToAdmins('adminUpdate', { type: 'newTransaction', data: tx })
}

function validateAmount(amount) {
    const n = Number(amount)
    if (!Number.isFinite(n) || n < 1 || n > MAX_TOPUP) {
        return { ok: false, error: `Amount must be between 1 and ${MAX_TOPUP}` }
    }
    return { ok: true, value: n }
}

// ─── Tap ───────────────────────────────────────────────────────────────────

export const tapCreateCharge = async (req, res) => {
    try {
        const { amount } = req.body || {}
        const v = validateAmount(amount)
        if (!v.ok) return res.status(400).json({ error: v.error })

        if (!process.env.TAP_SECRET_KEY) {
            return res.status(503).json({ error: 'Tap is not configured (set TAP_SECRET_KEY)' })
        }
        if (!process.env.PUBLIC_API_URL) {
            return res.status(503).json({ error: 'PUBLIC_API_URL is required' })
        }

        const currency = process.env.TAP_CURRENCY || 'USD'
        const { chargeId, redirectUrl } = await createTapCharge({
            amount: v.value,
            currency,
            user: req.user,
        })

        if (!redirectUrl) {
            return res.status(502).json({ error: 'Tap did not return a payment URL' })
        }

        await PaymentIntent.create({
            userId: req.user._id,
            provider: 'tap',
            externalId: chargeId,
            amount: v.value,
            currency,
            status: 'pending',
        })

        res.status(200).json({ chargeId, redirectUrl, currency })
    } catch (e) {
        console.error('[tapCreateCharge]', e)
        res.status(502).json({ error: e.message || 'Tap create charge failed' })
    }
}

/** After 3DS / hosted page — Tap redirects here with tap_id */
export const tapReturn = async (req, res) => {
    const tapId = req.query.tap_id
    if (!tapId) return res.redirect(deepLink('payment/fail?reason=no_tap_id'))

    let charge
    try {
        charge = await retrieveTapCharge(tapId)
    } catch (e) {
        console.error('[tapReturn] retrieve', e)
        return res.redirect(deepLink('payment/fail?reason=retrieve'))
    }

    const metaUid = charge.metadata?.userId
    const ok =
        charge.status === 'CAPTURED' ||
        charge.status === 'AUTHORIZED' ||
        charge.response?.code === '000'

    if (!ok) {
        return res.redirect(deepLink('payment/fail?reason=not_paid'))
    }

    const intent = await PaymentIntent.findOne({
        provider: 'tap',
        externalId: tapId,
        status: 'pending',
    })

    if (!intent) {
        const done = await PaymentIntent.findOne({
            provider: 'tap',
            externalId: tapId,
            status: 'completed',
        })
        if (done) return res.redirect(deepLink('payment/success'))
        return res.redirect(deepLink('payment/fail?reason=unknown_charge'))
    }

    if (metaUid && String(intent.userId) !== String(metaUid)) {
        console.warn('[tapReturn] userId mismatch')
        return res.redirect(deepLink('payment/fail?reason=mismatch'))
    }

    const payAmount = Number(charge.amount) || intent.amount

    const claimed = await PaymentIntent.findOneAndUpdate(
        { _id: intent._id, status: 'pending' },
        { status: 'completed' },
        { new: true }
    )
    if (claimed) await creditWallet(intent.userId, payAmount, 'Wallet top-up (Tap)')

    res.redirect(deepLink('payment/success'))
}

/**
 * Tap server webhook (optional idempotency). Verify signature in production using Tap docs.
 */
export const tapWebhook = async (req, res) => {
    try {
        const body = req.body
        const id = body?.id
        if (!id) return res.status(400).send('ok')

        const intent = await PaymentIntent.findOne({
            provider: 'tap',
            externalId: id,
            status: 'pending',
        })
        if (!intent) return res.status(200).send('ok')

        const status = body?.status
        if (status !== 'CAPTURED' && body?.response?.code !== '000') {
            return res.status(200).send('ok')
        }

        const metaUid = body?.metadata?.userId
        if (metaUid && String(intent.userId) !== String(metaUid)) return res.status(200).send('ok')

        const payAmount = Number(body.amount) || intent.amount
        const claimed = await PaymentIntent.findOneAndUpdate(
            { _id: intent._id, status: 'pending' },
            { status: 'completed' },
            { new: true }
        )
        if (claimed) await creditWallet(intent.userId, payAmount, 'Wallet top-up (Tap webhook)')
        res.status(200).send('ok')
    } catch (e) {
        console.error('[tapWebhook]', e)
        res.status(500).send('err')
    }
}

// ─── PayTabs (Hosted Payment Page) ──────────────────────────────────────────

async function tryCompletePaytabsFromPayload(body) {
    const cartId = body?.cart_id != null ? String(body.cart_id) : ''
    if (!cartId) return { credited: false, reason: 'no_cart' }

    const pr = body?.payment_result
    if (pr?.response_status && pr.response_status !== 'A') {
        await PaymentIntent.updateMany(
            { provider: 'paytabs', externalId: cartId, status: 'pending' },
            { status: 'failed' }
        )
        return { credited: false, reason: 'declined' }
    }

    if (!isPaytabsPaymentSuccessful(body)) {
        return { credited: false, reason: 'not_authorized' }
    }

    const intent = await PaymentIntent.findOne({
        provider: 'paytabs',
        externalId: cartId,
        status: 'pending',
    })

    if (!intent) {
        const done = await PaymentIntent.findOne({
            provider: 'paytabs',
            externalId: cartId,
            status: 'completed',
        })
        return { credited: false, reason: done ? 'already_done' : 'unknown_cart' }
    }

    const payAmount = Number(body.cart_amount) || intent.amount
    const claimed = await PaymentIntent.findOneAndUpdate(
        { _id: intent._id, status: 'pending' },
        { status: 'completed' },
        { new: true }
    )
    if (claimed) await creditWallet(intent.userId, payAmount, 'Wallet top-up (PayTabs)')
    return { credited: !!claimed, reason: claimed ? 'ok' : 'race' }
}

export const paytabsCreatePayment = async (req, res) => {
    try {
        const { amount } = req.body || {}
        const v = validateAmount(amount)
        if (!v.ok) return res.status(400).json({ error: v.error })

        if (!process.env.PAYTABS_PROFILE_ID || !process.env.PAYTABS_SERVER_KEY) {
            return res.status(503).json({
                error: 'PayTabs is not configured (set PAYTABS_PROFILE_ID / PAYTABS_SERVER_KEY)',
            })
        }
        const publicBase = process.env.PUBLIC_API_URL?.replace(/\/$/, '')
        if (!publicBase) {
            return res.status(503).json({
                error: 'PUBLIC_API_URL is required (PayTabs return/callback URLs)',
            })
        }

        const currency = process.env.PAYTABS_CURRENCY || 'JOD'
        const cartId = `fursa_${randomBytes(16).toString('hex')}`

        const callbackUrl = `${publicBase}/api/payments/paytabs/callback`
        const returnUrl = `${publicBase}/api/payments/paytabs/return`

        const { redirectUrl } = await createPaytabsPaymentPage({
            amount: v.value,
            currency,
            cartId,
            user: req.user,
            callbackUrl,
            returnUrl,
        })

        await PaymentIntent.create({
            userId: req.user._id,
            provider: 'paytabs',
            externalId: cartId,
            amount: v.value,
            currency,
            status: 'pending',
        })

        res.status(200).json({ cartId, redirectUrl, currency })
    } catch (e) {
        console.error('[paytabsCreatePayment]', e)
        res.status(502).json({ error: e.message || 'PayTabs payment request failed' })
    }
}

export const paytabsReturn = async (req, res) => {
    try {
        await tryCompletePaytabsFromPayload(req.body)
    } catch (e) {
        console.error('[paytabsReturn]', e)
    }
    const ok = isPaytabsPaymentSuccessful(req.body)
    res.redirect(ok ? deepLink('payment/success') : deepLink('payment/fail?reason=paytabs'))
}

export const paytabsCallback = async (req, res) => {
    try {
        await tryCompletePaytabsFromPayload(req.body)
        res.status(200).send('OK')
    } catch (e) {
        console.error('[paytabsCallback]', e)
        res.status(500).send('ERR')
    }
}
