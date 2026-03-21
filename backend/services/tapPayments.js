/**
 * Tap Payments — create charge (hosted payment) + retrieve status.
 * Env: TAP_SECRET_KEY (sk_test_… / sk_live_…)
 * Docs: https://developers.tap.company/reference/create-a-charge
 */

const TAP_API = 'https://api.tap.company/v2/charges'

function headers() {
    const key = process.env.TAP_SECRET_KEY
    if (!key) throw new Error('TAP_SECRET_KEY missing')
    return {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
    }
}

/**
 * @param {{ amount: number, currency: string, user: { _id: any, username?: string, email?: string }, returnPath?: string }}
 */
export async function createTapCharge({ amount, currency, user, returnPath = '/api/payments/tap/return' }) {
    const publicBase = process.env.PUBLIC_API_URL?.replace(/\/$/, '')
    if (!publicBase) throw new Error('PUBLIC_API_URL is required for Tap redirect')

    const redirectUrl = `${publicBase}${returnPath.startsWith('/') ? '' : '/'}${returnPath}`
    const postUrl = `${publicBase}/api/payments/tap/webhook`

    const uname = user.username || 'Customer'
    const parts = String(uname).trim().split(/\s+/)
    const first = parts[0] || 'Customer'
    const last = parts.slice(1).join(' ') || 'User'

    const body = {
        amount: Number(amount),
        currency: currency || process.env.TAP_CURRENCY || 'USD',
        customer_initiated: true,
        threeDSecure: true,
        description: 'Fursa wallet top-up',
        metadata: { userId: String(user._id) },
        customer: {
            first_name: first,
            last_name: last,
            email: user.email || 'customer@fursa.app',
        },
        source: { id: 'src_all' },
        redirect: { url: redirectUrl },
        post: { url: postUrl },
    }

    const r = await fetch(TAP_API, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
    })
    const data = await r.json()
    if (!r.ok) {
        const msg = data?.errors?.[0]?.description || data?.message || JSON.stringify(data)
        throw new Error(msg)
    }
    const redirect = data.transaction?.url || data.url
    return { chargeId: data.id, redirectUrl: redirect, raw: data }
}

export async function retrieveTapCharge(chargeId) {
    const r = await fetch(`${TAP_API}/${chargeId}`, { headers: headers() })
    const data = await r.json()
    if (!r.ok) {
        const msg = data?.errors?.[0]?.description || data?.message || 'Retrieve failed'
        throw new Error(msg)
    }
    return data
}
