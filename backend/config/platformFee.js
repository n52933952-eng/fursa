/**
 * Admin dashboard: estimated platform fee = this % × each release (deal) amount.
 * Set in .env: PLATFORM_FEE_PERCENT=10  → 10% of every completed payout.
 * (Actual wallet split is still optional — this value drives reporting/charts.)
 */
const raw = parseFloat(String(process.env.PLATFORM_FEE_PERCENT ?? '10'), 10)
const pct = Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : 10

export const PLATFORM_FEE_PERCENT = pct
export const PLATFORM_FEE_RATE = pct / 100
