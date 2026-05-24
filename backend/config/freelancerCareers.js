/** Career labels freelancers pick — used in profile + client search. */
export const FREELANCER_CAREERS = [
    'Full Stack',
    'IT',
    'Writing',
    'Design',
    'Development',
    'Mobile',
    'Marketing',
    'Video',
    'Translation',
    'Data',
    'Other',
]

/** Map common search words → stored career value */
const CAREER_ALIASES = {
    'full stack': 'Full Stack',
    'fullstack': 'Full Stack',
    'full-stack': 'Full Stack',
    'stack': 'Full Stack',
    it: 'IT',
    'information technology': 'IT',
    write: 'Writing',
    writing: 'Writing',
    writer: 'Writing',
    dev: 'Development',
    developer: 'Development',
    development: 'Development',
    design: 'Design',
    designer: 'Design',
    mobile: 'Mobile',
    marketing: 'Marketing',
    video: 'Video',
    translation: 'Translation',
    translator: 'Translation',
    data: 'Data',
}

export function sanitizeCareer(raw) {
    if (raw == null || String(raw).trim() === '') return ''
    const t = String(raw).trim()
    const hit = FREELANCER_CAREERS.find((c) => c.toLowerCase() === t.toLowerCase())
    return hit || ''
}

/** Extra career strings to match when client searches (e.g. "full stack" → Full Stack). */
export function careerPatternsFromQuery(query) {
    const q = String(query || '').trim().toLowerCase()
    if (!q) return []
    const out = new Set()
    if (CAREER_ALIASES[q]) out.add(CAREER_ALIASES[q])
    for (const [alias, career] of Object.entries(CAREER_ALIASES)) {
        if (q.includes(alias) || alias.includes(q)) out.add(career)
    }
    for (const c of FREELANCER_CAREERS) {
        const cl = c.toLowerCase()
        if (cl.includes(q) || q.includes(cl)) out.add(c)
    }
    return [...out]
}

/** Split a display name / username into searchable name parts. */
export function namePartsFromUser(u) {
    const parts = []
    if (u?.firstName) parts.push(String(u.firstName).trim())
    if (u?.lastName) parts.push(String(u.lastName).trim())
    if (u?.username) {
        parts.push(...String(u.username).split(/[\s_]+/))
    }
    return parts.filter(Boolean).map((p) => p.toLowerCase())
}
