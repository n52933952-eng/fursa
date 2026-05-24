/**
 * Smart Price — MENA-focused freelance budget bands (USD).
 * Anchors AI suggestions so prices stay realistic for Fursa clients.
 */

/** @typedef {'small' | 'medium' | 'large'} ProjectSize */

/** Fixed total project budget (USD) */
const FIXED_BANDS = {
    Design: {
        small:  { min: 35,  max: 120,  recommended: 70 },
        medium: { min: 120, max: 400,  recommended: 220 },
        large:  { min: 400, max: 1200, recommended: 650 },
    },
    Development: {
        small:  { min: 60,  max: 200,  recommended: 120 },
        medium: { min: 200, max: 800,  recommended: 450 },
        large:  { min: 800, max: 3500, recommended: 1600 },
    },
    Writing: {
        small:  { min: 15,  max: 60,   recommended: 35 },
        medium: { min: 60,  max: 200,  recommended: 110 },
        large:  { min: 200, max: 600,  recommended: 320 },
    },
    Marketing: {
        small:  { min: 50,  max: 180,  recommended: 100 },
        medium: { min: 180, max: 500,  recommended: 280 },
        large:  { min: 500, max: 1500, recommended: 850 },
    },
    Video: {
        small:  { min: 60,  max: 200,  recommended: 120 },
        medium: { min: 200, max: 700,  recommended: 380 },
        large:  { min: 700, max: 2500, recommended: 1200 },
    },
    Translation: {
        small:  { min: 20,  max: 80,   recommended: 45 },
        medium: { min: 80,  max: 250,  recommended: 140 },
        large:  { min: 250, max: 700,  recommended: 400 },
    },
    Data: {
        small:  { min: 50,  max: 180,  recommended: 100 },
        medium: { min: 180, max: 550,  recommended: 300 },
        large:  { min: 550, max: 1800, recommended: 950 },
    },
    Other: {
        small:  { min: 40,  max: 150,  recommended: 85 },
        medium: { min: 150, max: 500,  recommended: 280 },
        large:  { min: 500, max: 1500, recommended: 800 },
    },
}

/** Hourly rate (USD / hour) */
const HOURLY_BANDS = {
    Design: {
        small:  { min: 8,  max: 15, recommended: 12 },
        medium: { min: 12, max: 25, recommended: 18 },
        large:  { min: 20, max: 40, recommended: 28 },
    },
    Development: {
        small:  { min: 12, max: 22, recommended: 16 },
        medium: { min: 18, max: 35, recommended: 25 },
        large:  { min: 28, max: 55, recommended: 38 },
    },
    Writing: {
        small:  { min: 6,  max: 12, recommended: 9 },
        medium: { min: 10, max: 20, recommended: 14 },
        large:  { min: 15, max: 30, recommended: 22 },
    },
    Marketing: {
        small:  { min: 8,  max: 16, recommended: 12 },
        medium: { min: 12, max: 25, recommended: 18 },
        large:  { min: 20, max: 40, recommended: 28 },
    },
    Video: {
        small:  { min: 10, max: 18, recommended: 14 },
        medium: { min: 15, max: 30, recommended: 22 },
        large:  { min: 25, max: 50, recommended: 35 },
    },
    Translation: {
        small:  { min: 6,  max: 12, recommended: 9 },
        medium: { min: 10, max: 18, recommended: 13 },
        large:  { min: 14, max: 28, recommended: 20 },
    },
    Data: {
        small:  { min: 10, max: 18, recommended: 14 },
        medium: { min: 15, max: 30, recommended: 22 },
        large:  { min: 25, max: 45, recommended: 32 },
    },
    Other: {
        small:  { min: 8,  max: 16, recommended: 12 },
        medium: { min: 12, max: 25, recommended: 18 },
        large:  { min: 20, max: 40, recommended: 28 },
    },
}

const LARGE_SIGNALS = [
    'full app', 'mobile app', 'android', 'ios', 'e-commerce', 'ecommerce', 'website',
    'web app', 'platform', 'dashboard', 'mvp', 'from scratch', 'complete', 'comprehensive',
    'multiple pages', 'multi page', 'integration', 'api', 'backend', 'database', 'saas',
    'متجر', 'تطبيق', 'موقع', 'من الصفر', 'كامل',
]

const SMALL_SIGNALS = [
    'simple', 'quick', 'small', 'one page', 'single page', 'logo only', 'short', 'basic',
    'edit', 'fix', 'minor', 'bug', 'update', 'proofread', '1 page', 'one article',
    'بسيط', 'سريع', 'تعديل', 'إصلاح', 'صفحة واحدة',
]

function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n))
}

/** Round to client-friendly numbers */
export function roundNicePrice(n, budgetType = 'fixed') {
    const x = Number(n)
    if (!Number.isFinite(x) || x <= 0) return budgetType === 'hourly' ? 15 : 100
    if (budgetType === 'hourly') return Math.round(clamp(x, 5, 80))
    if (x < 50) return Math.round(x / 5) * 5
    if (x < 200) return Math.round(x / 10) * 10
    if (x < 1000) return Math.round(x / 25) * 25
    return Math.round(x / 50) * 50
}

/** Guess project size from title, description, skills */
export function detectProjectSize(title, description, skills) {
    const text = `${title || ''} ${description || ''}`.toLowerCase()
    const skillCount = Array.isArray(skills) ? skills.length : 0
    let score = 0

    if (text.length > 350) score += 1
    if (text.length > 700) score += 2
    if (skillCount >= 2) score += 1
    if (skillCount >= 4) score += 2

    for (const s of LARGE_SIGNALS) {
        if (text.includes(s)) score += 2
    }
    for (const s of SMALL_SIGNALS) {
        if (text.includes(s)) score -= 2
    }

    if (score <= 0) return 'small'
    if (score <= 3) return 'medium'
    return 'large'
}

function percentile(sorted, p) {
    if (!sorted.length) return null
    const idx = (sorted.length - 1) * p
    const lo = Math.floor(idx)
    const hi = Math.ceil(idx)
    if (lo === hi) return sorted[lo]
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

/** Stats from platform projects; filters crazy outliers */
export function historicalBudgetStats(projects, budgetType = 'fixed') {
    const raw = projects
        .map((p) => Number(p.budget))
        .filter((n) => Number.isFinite(n) && n > 0)

    if (raw.length === 0) return null

    const cap = budgetType === 'hourly' ? 120 : 15000
    const filtered = raw.filter((n) => n <= cap)
    const budgets = filtered.length >= 3 ? filtered : raw.filter((n) => n <= cap * 2)
    if (!budgets.length) return null

    const sorted = [...budgets].sort((a, b) => a - b)
    const q1 = percentile(sorted, 0.25)
    const q3 = percentile(sorted, 0.75)
    const iqr = q3 - q1
    const lo = q1 - 1.5 * iqr
    const hi = q3 + 1.5 * iqr
    const trimmed = sorted.filter((n) => n >= lo && n <= hi)
    const use = trimmed.length >= 2 ? trimmed : sorted

    const median = percentile(use, 0.5)
    const avg = Math.round(use.reduce((s, n) => s + n, 0) / use.length)
    return {
        count: use.length,
        min: use[0],
        max: use[use.length - 1],
        median: Math.round(median),
        average: avg,
    }
}

/** Market anchor before AI — blends category band + optional platform history */
export function buildPricingAnchor({ category, budgetType, size, historical }) {
    const cat = category && (FIXED_BANDS[category] || FIXED_BANDS.Other)
        ? category
        : 'Other'
    const bands = budgetType === 'hourly' ? HOURLY_BANDS : FIXED_BANDS
    const band = bands[cat]?.[size] || bands.Other.medium

    let recommended = band.recommended
    if (historical?.median) {
        // Platform data when we have enough samples; otherwise trust market band
        const weight = historical.count >= 5 ? 0.45 : historical.count >= 2 ? 0.25 : 0
        recommended = Math.round(band.recommended * (1 - weight) + historical.median * weight)
    }

    recommended = clamp(recommended, band.min, band.max)

    return {
        min: band.min,
        max: band.max,
        recommended,
        size,
        budgetType,
        category: cat,
    }
}

/** Clamp AI output to realistic range */
export function normalizePricing(raw, anchor, budgetType = 'fixed') {
    const floor = budgetType === 'hourly'
        ? Math.max(5, Math.round(anchor.min * 0.9))
        : Math.max(15, Math.round(anchor.min * 0.85))
    const ceil = budgetType === 'hourly'
        ? Math.min(100, Math.round(anchor.max * 1.1))
        : Math.round(anchor.max * 1.15)

    let min = roundNicePrice(Number(raw?.min) || anchor.min, budgetType)
    let max = roundNicePrice(Number(raw?.max) || anchor.max, budgetType)
    let recommended = roundNicePrice(Number(raw?.recommended) || anchor.recommended, budgetType)

    min = clamp(min, floor, ceil)
    max = clamp(max, min, ceil)
    recommended = clamp(recommended, min, max)

    if (max - min < (budgetType === 'hourly' ? 3 : 20)) {
        max = roundNicePrice(min + (budgetType === 'hourly' ? 5 : 40), budgetType)
        recommended = clamp(recommended, min, max)
    }

    const reason = typeof raw?.reason === 'string' && raw.reason.trim()
        ? raw.reason.trim().slice(0, 220)
        : defaultReason(anchor, budgetType)

    return { min, max, recommended, reason }
}

function defaultReason(anchor, budgetType) {
    const unit = budgetType === 'hourly' ? '/hr' : ' total'
    const sizeLabel = anchor.size === 'small' ? 'small' : anchor.size === 'large' ? 'large' : 'medium'
    return `Typical ${sizeLabel} ${anchor.category} project in the MENA freelance market (~$${anchor.recommended}${unit}).`
}

export function anchorFallback(anchor, budgetType) {
    const min = roundNicePrice(anchor.min, budgetType)
    const max = roundNicePrice(anchor.max, budgetType)
    const recommended = roundNicePrice(anchor.recommended, budgetType)
    return {
        min,
        max,
        recommended: clamp(recommended, min, max),
        reason: defaultReason(anchor, budgetType),
    }
}
