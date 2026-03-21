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

/**
 * Render / .env mistakes that break JSON.parse:
 * - Pasting the whole line `FIREBASE_SERVICE_ACCOUNT={...}` as the value
 * - Two JSON objects concatenated
 * - UTF-8 BOM at start
 * - Outer single quotes
 * Extract first `{ ... }` balance and normalize private_key newlines.
 */
function stripBom(s) {
    return s.replace(/^\uFEFF/, '')
}

function extractFirstJsonObject(s) {
    const start = s.indexOf('{')
    if (start < 0) return null
    let depth = 0
    for (let i = start; i < s.length; i++) {
        const c = s[i]
        if (c === '{') depth++
        else if (c === '}') {
            depth--
            if (depth === 0) return s.slice(start, i + 1)
        }
    }
    return null
}

function normalizePrivateKeyInRawJson(raw) {
    const match = raw.match(/"private_key"\s*:\s*"([\s\S]*?)"\s*,/)
    if (!match) return raw
    const fixed = match[1].replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\r/g, '\\n')
    return raw.replace(/"private_key"\s*:\s*"[\s\S]*?"\s*,/, `"private_key":"${fixed}",`)
}

function parseServiceAccountFromEnv(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') return null

    let raw = stripBom(rawInput).trim()
    // Smart quotes / BOM-like chars from copy-paste
    raw = raw.replace(/[\u201c\u201d\u2018\u2019]/g, '"')

    // Outer quotes from some hosts ( ' {...} ' )
    if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"') && raw.length > 2)) {
        raw = raw.slice(1, -1).trim()
    }

    // Accidentally pasted "KEY=value" style into the value field
    const eqIdx = raw.indexOf('={')
    if (eqIdx !== -1 && /^[A-Z0-9_]+$/i.test(raw.slice(0, eqIdx).trim())) {
        raw = raw.slice(eqIdx + 1).trim()
    }

    // Missing outer { } — e.g. pasted from file starting at "type": not {
    if (!raw.startsWith('{') && /"type"\s*:\s*"service_account"/i.test(raw)) {
        raw = raw.replace(/\s+$/, '')
        if (!raw.endsWith('}')) raw += '}'
        raw = `{${raw}`
    }

    function parseJsonWithKeyFix(str) {
        try {
            return JSON.parse(str)
        } catch {
            const fixedKey = normalizePrivateKeyInRawJson(str)
            if (fixedKey === str) throw new Error('bad json')
            return JSON.parse(fixedKey)
        }
    }

    try {
        return parseJsonWithKeyFix(raw)
    } catch {
        const extracted = extractFirstJsonObject(raw)
        if (extracted) {
            try {
                return parseJsonWithKeyFix(extracted)
            } catch {
                /* fall through */
            }
        }
    }

    return null
}

// ─── Initialize Firebase Admin ────────────────────────────────────────────────

export function initializeFCM() {
    try {
        let serviceAccount

        // 1) Base64 (best for Render — avoids quote/newline truncation in the dashboard)
        const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim()
        if (b64) {
            try {
                const decoded = Buffer.from(b64, 'base64').toString('utf8')
                serviceAccount = parseServiceAccountFromEnv(decoded) || JSON.parse(decoded)
            } catch (e) {
                console.error('❌ [FCM] FIREBASE_SERVICE_ACCOUNT_BASE64 decode/parse failed:', e.message)
                return
            }
            if (!serviceAccount?.private_key || !serviceAccount?.client_email) {
                console.error('❌ [FCM] FIREBASE_SERVICE_ACCOUNT_BASE64 decoded but missing private_key / client_email')
                return
            }
        } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            // 2) Raw JSON string (single-line JSON is safest on Render)
            serviceAccount = parseServiceAccountFromEnv(process.env.FIREBASE_SERVICE_ACCOUNT)
            if (!serviceAccount) {
                console.error(
                    '❌ [FCM] FIREBASE_SERVICE_ACCOUNT is not valid JSON. Fix: (A) paste one-line JSON {...} only, or (B) set FIREBASE_SERVICE_ACCOUNT_BASE64 (base64 of the file). See backend/env.example.txt',
                )
                return
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
