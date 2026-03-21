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
import { createPrivateKey } from 'node:crypto'
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

/**
 * Same strategy as thredtrain/backend/services/fcmNotifications.js:
 * JSON.parse first; on failure, normalize actual newlines inside private_key to \n escapes, re-parse;
 * then turn literal \n in private_key into real newlines for firebase-admin.
 */
function parseServiceAccountFromEnvThredtrainStyle(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') return null

    let envVarValue = stripBom(rawInput).trim()
    envVarValue = envVarValue.replace(/[\u201c\u201d\u2018\u2019]/g, '"')

    let serviceAccount
    try {
        serviceAccount = JSON.parse(envVarValue)
    } catch {
        const privateKeyMatch = envVarValue.match(/"private_key"\s*:\s*"([\s\S]*?)"\s*,/)
        if (!privateKeyMatch) return null
        const fixedKey = privateKeyMatch[1]
            .replace(/\r\n/g, '\\n')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\n')
        envVarValue = envVarValue.replace(
            /"private_key"\s*:\s*"[\s\S]*?"\s*,/,
            `"private_key":"${fixedKey}",`,
        )
        try {
            serviceAccount = JSON.parse(envVarValue)
        } catch {
            return null
        }
    }

    if (serviceAccount?.private_key) {
        if (serviceAccount.private_key.includes('\\n')) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
        }
        serviceAccount.private_key = serviceAccount.private_key.replace(/\r/g, '')
    }

    return serviceAccount?.type === 'service_account' ? serviceAccount : null
}

/** Detect truncated / broken PEM before Google returns cryptic "Invalid JWT Signature". */
function validateServiceAccountPem(serviceAccount) {
    const pk = serviceAccount?.private_key
    if (!pk || typeof pk !== 'string') return 'missing private_key'
    const pem = pk.replace(/\r/g, '').trim()
    const hasBegin = /BEGIN (RSA )?PRIVATE KEY/.test(pem)
    const hasEnd = /END (RSA )?PRIVATE KEY/.test(pem)
    if (!hasBegin) return 'private_key missing PEM header'
    if (!hasEnd) {
        return (
            'private_key missing PEM footer — value was almost certainly TRUNCATED in the host env UI. ' +
            'Fix: Render → Secret File (see env.example.txt) + GOOGLE_APPLICATION_CREDENTIALS, or FIREBASE_SERVICE_ACCOUNT_BASE64 (full file).'
        )
    }
    // RSA PKCS#8 PEM is typically ~1.6k+ chars; truncated dashboard values are often ~400–900
    if (pem.length < 1200) {
        return `private_key PEM is only ${pem.length} chars (expected usually 1600+). Truncated env var is the usual cause of invalid_grant / Invalid JWT Signature.`
    }
    return null
}

/** Paste from browsers / docs often injects zero-width chars — breaks JWT signature. */
function sanitizePrivateKeyPem(pk) {
    if (!pk || typeof pk !== 'string') return pk
    return pk
        .replace(/\uFEFF/g, '')
        .replace(/[\u200B-\u200D]/g, '')
        .replace(/\u00A0/g, ' ')
        .trim()
}

/** If Node can't parse the PEM, Google will reject the JWT too. */
function verifyPrivateKeyLoads(pem) {
    try {
        createPrivateKey({ key: pem, format: 'pem' })
        return null
    } catch (e) {
        return e?.message || 'invalid PEM'
    }
}

// ─── Initialize Firebase Admin ────────────────────────────────────────────────

export function initializeFCM() {
    try {
        let serviceAccount

        // 0) GOOGLE_APPLICATION_CREDENTIALS — Google’s usual meaning is a FILE PATH, but many hosts let you paste JSON here.
        //    We support BOTH: value starts with "{" → inline JSON; else → read file from path (thredtrain-style).
        const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
        if (gac) {
            if (gac.startsWith('{')) {
                serviceAccount =
                    parseServiceAccountFromEnvThredtrainStyle(gac) ?? parseServiceAccountFromEnv(gac)
                if (!serviceAccount) {
                    try {
                        serviceAccount = JSON.parse(gac)
                    } catch {
                        /* fall through */
                    }
                }
                if (!serviceAccount?.private_key || !serviceAccount?.client_email) {
                    console.error(
                        '❌ [FCM] GOOGLE_APPLICATION_CREDENTIALS looks like JSON but parse failed or missing private_key/client_email.',
                    )
                    return
                }
                console.log(
                    '🔍 [FCM] Loaded credentials from GOOGLE_APPLICATION_CREDENTIALS (inline JSON) project_id:',
                    serviceAccount.project_id,
                )
            } else if (existsSync(gac)) {
                try {
                    const fileContent = readFileSync(gac, 'utf8')
                    if (!fileContent?.trim()) {
                        console.error(`❌ [FCM] GOOGLE_APPLICATION_CREDENTIALS file is empty: ${gac}`)
                        return
                    }
                    serviceAccount = JSON.parse(fileContent)
                    console.log(
                        `🔍 [FCM] Loaded JSON from file GOOGLE_APPLICATION_CREDENTIALS=${gac} project_id:`,
                        serviceAccount?.project_id,
                    )
                } catch (e) {
                    console.error(`❌ [FCM] Cannot read/parse GOOGLE_APPLICATION_CREDENTIALS file ${gac}:`, e.message)
                    return
                }
            } else {
                console.warn(
                    `⚠️  [FCM] GOOGLE_APPLICATION_CREDENTIALS is not a file path that exists on disk: ${gac.slice(0, 80)}…`,
                )
            }
        }

        // 1) Base64
        const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim()
        if (!serviceAccount && b64) {
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
        }

        // 2) Raw env JSON (thredtrain-style parse first)
        if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
            const raw = process.env.FIREBASE_SERVICE_ACCOUNT
            const rawLen = raw.length
            console.log(`🔍 [FCM] FIREBASE_SERVICE_ACCOUNT length: ${rawLen}`)
            if (rawLen > 0) {
                const preview = raw.slice(0, 100).replace(/\s+/g, ' ')
                console.log(`🔍 [FCM] FIREBASE_SERVICE_ACCOUNT preview: ${preview}${rawLen > 100 ? '…' : ''}`)
            }
            serviceAccount =
                parseServiceAccountFromEnvThredtrainStyle(raw) ?? parseServiceAccountFromEnv(raw)
            if (!serviceAccount) {
                console.error(
                    '❌ [FCM] FIREBASE_SERVICE_ACCOUNT is not valid JSON. Fix: Secret file + GOOGLE_APPLICATION_CREDENTIALS, or FIREBASE_SERVICE_ACCOUNT_BASE64. See backend/env.example.txt',
                )
                return
            }
            console.log('🔍 [FCM] Parsed OK — project_id:', serviceAccount.project_id)
        }

        // 3) Local backend/firebase-service-account.json (thredtrain: ../ from services/)
        if (!serviceAccount) {
            const filePath = join(__dirname, '..', 'firebase-service-account.json')
            if (!existsSync(filePath)) {
                console.warn('⚠️  [FCM] Push disabled — no credentials (GAC / env / firebase-service-account.json)')
                return
            }
            try {
                serviceAccount = JSON.parse(readFileSync(filePath, 'utf8'))
                console.log('🔍 [FCM] Loaded local firebase-service-account.json project_id:', serviceAccount?.project_id)
            } catch (e) {
                console.error('❌ [FCM] Failed to parse firebase-service-account.json:', e.message)
                return
            }
        }

        // Fix private key newlines + strip invisible chars (common paste / dashboard glitches)
        if (serviceAccount?.private_key) {
            serviceAccount.private_key = sanitizePrivateKeyPem(
                String(serviceAccount.private_key).replace(/\\n/g, '\n').replace(/\r/g, ''),
            )
        }

        const pemError = validateServiceAccountPem(serviceAccount)
        if (pemError) {
            console.error('❌ [FCM]', pemError)
            return
        }

        const pemLen = String(serviceAccount.private_key).replace(/\r/g, '').trim().length
        console.log(`🔍 [FCM] private_key PEM length: ${pemLen} chars`)

        const loadErr = verifyPrivateKeyLoads(serviceAccount.private_key)
        if (loadErr) {
            console.error(
                '❌ [FCM] private_key fails OpenSSL/Node parse — PEM is corrupt or truncated (not just Google):',
                loadErr,
            )
            console.error(
                '   → Use Render Secret File + GOOGLE_APPLICATION_CREDENTIALS, or FIREBASE_SERVICE_ACCOUNT_BASE64 from the original .json file (do not retype).',
            )
            return
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
        if (String(err.message).includes('Invalid JWT Signature')) {
            console.error(
                '   [FCM hint] Usually: revoked/old key in GCP, or env JSON truncated/corrupt. Fix: new Admin SDK JSON + Render Secret File (GOOGLE_APPLICATION_CREDENTIALS) or FIREBASE_SERVICE_ACCOUNT_BASE64.',
            )
        }
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
