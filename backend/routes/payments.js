import express from 'express'
import {
    tapCreateCharge,
    tapReturn,
    tapWebhook,
    paytabsCreatePayment,
    paytabsReturn,
    paytabsCallback,
} from '../controllers/payments.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

/** @fileoverview Tap and PayTabs wallet top-up payment routes. */

/** Create Tap hosted payment charge. */
router.post('/tap/create-charge', verifyToken, tapCreateCharge)
/** Tap redirect after customer completes payment. */
router.get('/tap/return', tapReturn)
/** Tap server webhook for payment confirmation. */
router.post('/tap/webhook', express.json({ type: '*/*' }), tapWebhook)

/** Create PayTabs hosted payment page. */
router.post('/paytabs/create-payment', verifyToken, paytabsCreatePayment)
/** PayTabs browser return after payment. */
router.post('/paytabs/return', express.urlencoded({ extended: true }), paytabsReturn)
/** PayTabs server callback for payment status. */
router.post(
    '/paytabs/callback',
    express.json({ type: '*/*' }),
    express.urlencoded({ extended: true }),
    paytabsCallback
)

export default router
