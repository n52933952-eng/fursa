/**
 * PayTabs — Hosted Payment Page (payment/request).
 * Env: PAYTABS_PROFILE_ID, PAYTABS_SERVER_KEY (Authorization header, no Bearer)
 * Optional: PAYTABS_API_BASE (default https://secure-jordan.paytabs.com), PAYTABS_CURRENCY (default JOD)
 */

const DEFAULT_BASE_JORDAN = 'https://secure-jordan.paytabs.com'

function apiBase() {
    return (process.env.PAYTABS_API_BASE || DEFAULT_BASE_JORDAN).replace(/\/$/, '')
}

function headers() {
    const key = process.env.PAYTABS_SERVER_KEY
    if (!key) throw new Error('PAYTABS_SERVER_KEY missing')
    return {
        Authorization: key.trim(),
        'Content-Type': 'application/json',
    }
}

export async function createPaytabsPaymentPage({
    amount,
    currency,
    cartId,
    user,
    callbackUrl,
    returnUrl,
}) {
    const profileRaw = process.env.PAYTABS_PROFILE_ID
    if (!profileRaw) throw new Error('PAYTABS_PROFILE_ID missing')
    const profile_id = Number(profileRaw)
    if (!Number.isFinite(profile_id)) throw new Error('PAYTABS_PROFILE_ID must be a number')

    const uname = user.username || 'Customer'
    const parts = String(uname).trim().split(/\s+/)
    const first = parts[0] || 'Customer'
    const last = parts.slice(1).join(' ') || 'User'
    const email = user.email || 'customer@fursa.app'

    const body = {
        profile_id,
        tran_type: 'sale',
        tran_class: 'ecom',
        cart_id: String(cartId).slice(0, 64),
        cart_description: 'Fursa wallet top-up',
        cart_currency: currency || process.env.PAYTABS_CURRENCY || 'JOD',
        cart_amount: Number(amount),
        callback: callbackUrl,
        return: returnUrl,
        customer_details: {
            name: `${first} ${last}`.slice(0, 120),
            email,
            phone: '+962000000000',
            street1: 'N/A',
            city: 'Amman',
            state: 'JO',
            country: 'JO',
            zip: '11118',
            ip: '127.0.0.1',
        },
    }

    const url = `${apiBase()}/payment/request`
    const r = await fetch(url, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
        const msg =
            data?.message ||
            data?.errors ||
            data?.result ||
            (typeof data === 'string' ? data : JSON.stringify(data))
        throw new Error(String(msg))
    }
    const redirectUrl = data.redirect_url
    if (!redirectUrl) throw new Error('PayTabs did not return redirect_url')
    return { redirectUrl, tranRef: data.tran_ref, raw: data }
}

export function isPaytabsPaymentSuccessful(body) {
    const pr = body?.payment_result
    if (!pr) return false
    if (pr.response_status === 'A') return true
    const msg = String(pr.response_message || '').toLowerCase()
    if (msg.includes('authorised') || msg.includes('authorized')) return true
    return false
}
