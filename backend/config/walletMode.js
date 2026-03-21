/**
 * Wallet top-up mode
 * ------------------
 * WALLET_SANDBOX=true  → POST /wallet/deposit adds fake balance (dev / demo / until a Jordan PSP is wired).
 * WALLET_SANDBOX=false → deposit is blocked; you must credit the wallet from a payment webhook (PayTabs, Tap, HyperPay, etc.).
 *
 * If unset: sandbox in non-production, live in production (so Render prod is safe by default).
 */
export function isWalletSandbox() {
    const v = process.env.WALLET_SANDBOX
    if (v === 'true' || v === '1') return true
    if (v === 'false' || v === '0') return false
    return process.env.NODE_ENV !== 'production'
}

const rawMax = parseInt(process.env.SANDBOX_DEPOSIT_MAX || '50000', 10)
export const SANDBOX_DEPOSIT_MAX = Number.isFinite(rawMax) && rawMax > 0 ? Math.min(rawMax, 500000) : 50000

/** Shown in API for app copy / future checkout integration */
export const JORDAN_PAYMENT_PROVIDERS = [
    { id: 'tap', name: 'Tap Payments', region: 'MENA / Jordan cards' },
    { id: 'hyperpay', name: 'HyperPay', region: 'Jordan' },
    { id: 'paytabs', name: 'PayTabs', region: 'MENA' },
]

export function walletMetaForClient() {
    const tapEnabled = !!process.env.TAP_SECRET_KEY
    const paytabsEnabled = !!(
        process.env.PAYTABS_PROFILE_ID &&
        process.env.PAYTABS_SERVER_KEY
    )
    return {
        sandboxMode: isWalletSandbox(),
        sandboxDepositMax: SANDBOX_DEPOSIT_MAX,
        suggestedProviders: JORDAN_PAYMENT_PROVIDERS,
        tapEnabled,
        paytabsEnabled,
        liveDepositNote:
            'Use PayTabs or Tap: app opens secure checkout; wallet updates after payment succeeds.',
    }
}
