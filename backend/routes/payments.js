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

router.post('/tap/create-charge', verifyToken, tapCreateCharge)
router.get('/tap/return', tapReturn)
router.post('/tap/webhook', express.json({ type: '*/*' }), tapWebhook)

router.post('/paytabs/create-payment', verifyToken, paytabsCreatePayment)
router.post('/paytabs/return', express.urlencoded({ extended: true }), paytabsReturn)
router.post(
    '/paytabs/callback',
    express.json({ type: '*/*' }),
    express.urlencoded({ extended: true }),
    paytabsCallback
)

export default router
