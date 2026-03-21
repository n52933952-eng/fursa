/**
 * Firebase Cloud Messaging (FCM) — Push Notifications for Fursa
 * Firebase project: mern-382a3
 *
 * Sends real mobile push notifications when the app is in background/closed.
 * Events covered:
 *   💬 New message
 *   📋 New proposal received
 *   ✅ Proposal accepted
 *   💸 Payment released
 *   🔔 General notification
 */

import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import User from '../models/User.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

let isInitialized = false

// ─── Initialize Firebase Admin ────────────────────────────────────────────────

export function initializeFCM() {
    try {
        let serviceAccount

        // Try env variable first (for Render deployment)
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim()
            try {
                serviceAccount = JSON.parse(raw)
            } catch {
                // Try fixing newlines in private_key
                const match = raw.match(/"private_key"\s*:\s*"([\s\S]*?)"\s*,/)
                if (match) {
                    const fixed = match[1].replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\r/g, '\\n')
                    raw = raw.replace(/"private_key"\s*:\s*"[\s\S]*?"\s*,/, `"private_key":"${fixed}",`)
                    serviceAccount = JSON.parse(raw)
                }
            }
        } else {
            // Fall back to local file
            const filePath = join(__dirname, '..', 'firebase-service-account.json')
            if (!existsSync(filePath)) {
                console.warn('⚠️  [FCM] Push disabled — no firebase-service-account.json and no FIREBASE_SERVICE_ACCOUNT env var')
                return
            }
            serviceAccount = JSON.parse(readFileSync(filePath, 'utf8'))
        }

        // Fix private key newlines
        if (serviceAccount?.private_key) {
            serviceAccount.private_key = serviceAccount.private_key
                .replace(/\\n/g, '\n')
                .replace(/\r/g, '')
        }

        if (!admin.apps.length) {
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
        }

        isInitialized = true
        console.log('✅ [FCM] Firebase Admin initialized — push notifications ready')

    } catch (err) {
        console.error('❌ [FCM] Initialization failed:', err.message)
        isInitialized = false
    }
}

// ─── Core send helper ─────────────────────────────────────────────────────────

function toMongoUserId(userId) {
    if (userId == null) return null
    if (typeof userId === 'object' && userId._id != null) return String(userId._id)
    return String(userId)
}

async function sendToUser(userId, { title, body, data = {} }) {
    if (!isInitialized) return { success: false, error: 'FCM not initialized' }
    const uid = toMongoUserId(userId)
    if (!uid) return { success: false, error: 'Invalid user id' }

    try {
        const user = await User.findById(uid).select('fcmToken')
        if (!user?.fcmToken) return { success: false, error: 'No FCM token' }

        const titleStr = String(title || 'Fursa').slice(0, 200)
        const bodyStr = String(body || '').slice(0, 500)
        const dataPayload = {
            title: titleStr,
            body: bodyStr,
            ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? '')])),
        }

        // notification: system tray on Android/iOS when app is background / killed
        // data: deep-link fields for the client (must be strings)
        const message = {
            token: user.fcmToken,
            notification: {
                title: titleStr,
                body: bodyStr,
            },
            data: dataPayload,
            android: {
                priority: 'high',
                ttl: 60 * 60 * 1000,
                notification: {
                    channelId: 'fursa_default',
                    sound: 'default',
                    defaultSound: true,
                    defaultVibrateTimings: true,
                },
            },
            apns: {
                headers: { 'apns-priority': '10' },
                payload: {
                    aps: {
                        alert: { title: titleStr, body: bodyStr },
                        sound: 'default',
                    },
                },
            },
        }

        const response = await admin.messaging().send(message)
        return { success: true, messageId: response }

    } catch (err) {
        if (err.code === 'messaging/registration-token-not-registered' ||
            err.code === 'messaging/invalid-registration-token') {
            await User.findByIdAndUpdate(uid, { fcmToken: null })
        }
        console.error('❌ [FCM] sendToUser:', err.message)
        return { success: false, error: err.message }
    }
}

// ─── Specific notification senders ───────────────────────────────────────────

/** New chat message */
export async function pushNewMessage(recipientId, senderName, messagePreview, conversationId) {
    return sendToUser(recipientId, {
        title: `💬 ${senderName}`,
        body:  messagePreview?.slice(0, 100) || 'New message',
        data:  { type: 'new_message', conversationId: String(conversationId || '') },
    })
}

/** New proposal submitted on client's project */
export async function pushNewProposal(clientId, freelancerName, projectTitle, projectId) {
    return sendToUser(clientId, {
        title: '📋 New Bid Received',
        body:  `${freelancerName} placed a bid on "${projectTitle}"`,
        data:  { type: 'new_proposal', projectId: String(projectId) },
    })
}

/** Freelancer's proposal was accepted */
export async function pushProposalAccepted(freelancerId, projectTitle, projectId) {
    return sendToUser(freelancerId, {
        title: '🎉 Bid Accepted!',
        body:  `Your bid on "${projectTitle}" was accepted. Project is now in progress.`,
        data:  { type: 'proposal_accepted', projectId: String(projectId) },
    })
}

/** Payment released to freelancer */
export async function pushPaymentReleased(freelancerId, amount, projectTitle) {
    return sendToUser(freelancerId, {
        title: '💸 Payment Released!',
        body:  `$${amount} has been sent to your wallet for "${projectTitle}"`,
        data:  { type: 'payment_released' },
    })
}

/** Freelancer marked project complete — notify client and admin */
export async function pushProjectComplete(clientId, freelancerName, projectTitle, projectId) {
    return sendToUser(clientId, {
        title: '✅ Project Marked Complete',
        body:  `${freelancerName} submitted "${projectTitle}" for review`,
        data:  { type: 'project_complete', projectId: String(projectId) },
    })
}

/** General notification (for anything else) */
export async function pushGeneral(userId, title, body, data = {}) {
    return sendToUser(userId, { title, body, data })
}

export const isFCMReady = () => isInitialized
