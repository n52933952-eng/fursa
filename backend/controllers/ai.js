import Project from '../models/Project.js'
import {
    detectProjectSize,
    historicalBudgetStats,
    buildPricingAnchor,
    normalizePricing,
    anchorFallback,
} from '../config/smartPricing.js'

/** @fileoverview AI matchmaking, writing, pricing, skills, and chat assistant. */

/**
 * All AI features use Groq only (OpenAI-compatible API).
 * Set GROQ_API_KEY on the server: https://console.groq.com
 * Optional: GROQ_MODEL (default llama-3.3-70b-versatile)
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

/** Throw if GROQ_API_KEY is missing from env. */
function requireGroqKey() {
    const key = process.env.GROQ_API_KEY?.trim()
    if (!key) {
        const e = new Error('GROQ_API_KEY is not set on the server.')
        e.code = 'NO_GROQ_KEY'
        throw e
    }
    return key
}

/** Return configured Groq model name or default. */
function resolvedGroqModel() {
    return (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim()
}

/** Send chat messages to Groq and return assistant text. */
async function groqChatCompletion(messages, options = {}) {
    const key = requireGroqKey()
    const model = resolvedGroqModel()
    const temperature = typeof options.temperature === 'number' ? options.temperature : 0.65
    const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
            model,
            messages,
            max_tokens: options.max_tokens ?? 2048,
            temperature,
        }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        const err = data?.error?.message || `Groq HTTP ${res.status}`
        throw new Error(err)
    }
    const text = data?.choices?.[0]?.message?.content
    if (!text || typeof text !== 'string') throw new Error('Empty AI response')
    return text.trim()
}

/** Map AI errors to user-friendly messages. */
function friendlyAiError(err) {
    const msg = String(err?.message || err || '')
    if (/NO_GROQ_KEY|GROQ_API_KEY is not set/i.test(msg)) {
        return 'AI is not configured. Set GROQ_API_KEY on the server (console.groq.com).'
    }
    if (/401|403|invalid.*api|unauthorized/i.test(msg)) {
        return 'Groq API key is invalid. Check GROQ_API_KEY on the server.'
    }
    if (/429|rate limit/i.test(msg)) {
        return 'AI rate limit reached. Try again in a moment.'
    }
    return msg.length > 200 ? 'AI request failed. Please try again.' : msg
}

// Helper: safely parse JSON from AI text (handles markdown code fences)
/** Extract and parse JSON from AI response text. */
function parseJSON(text, fallback = null) {
    try {
        const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const objMatch = clean.match(/\{[\s\S]*\}/)
        const arrMatch = clean.match(/\[[\s\S]*\]/)
        if (objMatch) return JSON.parse(objMatch[0])
        if (arrMatch) return JSON.parse(arrMatch[0])
        return JSON.parse(clean)
    } catch {
        return fallback
    }
}

// ── AI Matchmaking — recommend best freelancers for a project ─────────────────
/** Recommend best freelancers for a project using AI. */
export const matchFreelancers = async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId)
        if (!project) return res.status(404).json({ error: 'Project not found' })

        const User = (await import('../models/User.js')).default
        const freelancers = await User.find({ role: 'freelancer', isBanned: false })
            .select('username skills rating totalProjects bio')

        const prompt = `
You are a freelancing platform AI assistant.

Project details:
- Title: ${project.title}
- Description: ${project.description}
- Required Skills: ${(project.skills || []).join(', ')}
- Budget: $${project.budget}

Freelancers available:
${JSON.stringify(freelancers.map(f => ({ id: f._id, username: f.username, skills: f.skills, rating: f.rating })))}

Return ONLY a JSON array of the top 5 freelancer IDs (most suitable first):
["id1","id2","id3","id4","id5"]
        `.trim()

        const text = await groqChatCompletion([{ role: 'user', content: prompt }])
        const ids = parseJSON(text, [])
        const matched = Array.isArray(ids)
            ? freelancers.filter(f => ids.includes(f._id.toString()))
            : freelancers.slice(0, 5)

        res.status(200).json(matched)
    } catch (error) {
        console.error('[AI matchFreelancers]', error?.message || error)
        const status = error?.code === 'NO_GROQ_KEY' ? 503 : 502
        res.status(status).json({ error: friendlyAiError(error) })
    }
}

// ── AI Writing Assistant — generate project description from keywords ─────────
/** Generate bilingual project description from keywords. */
export const generateDescription = async (req, res) => {
    try {
        const { keywords, category } = req.body

        if (!keywords && !category) {
            return res.status(400).json({ error: 'Please provide keywords or category' })
        }

        const prompt = `
Write a professional freelancing project description for a project in the "${category || 'General'}" category.
Keywords/Title: ${keywords || category}

Respond in this exact format:
EN: [Write 3-4 clear, professional sentences in English describing the project, what the client needs, and what skills are required]
AR: [اكتب 3-4 جمل واضحة واحترافية باللغة العربية تصف المشروع وما يحتاجه العميل والمهارات المطلوبة]
        `.trim()

        const text = await groqChatCompletion([{ role: 'user', content: prompt }])
        res.status(200).json({ description: text })
    } catch (error) {
        console.error('[AI generateDescription]', error?.message || error)
        const status = error?.code === 'NO_GROQ_KEY' ? 503 : 502
        res.status(status).json({ error: friendlyAiError(error) })
    }
}

// ── Smart Pricing — suggest budget based on category and historical data ───────
/** Suggest project budget range from category and history. */
export const suggestPrice = async (req, res) => {
    try {
        const { category, description, skills, title, budgetType: rawBudgetType } = req.body

        if (!category) {
            return res.status(400).json({ error: 'Please provide a category' })
        }

        const budgetType = rawBudgetType === 'hourly' ? 'hourly' : 'fixed'
        const descText = String(description || '').trim()
        const titleText = String(title || '').trim()
        const size = detectProjectSize(titleText, descText, skills)

        const similar = await Project.find({
            category,
            status: { $in: ['completed', 'open', 'in-progress'] },
            budgetType,
            budget: { $gt: 0 },
        })
            .select('budget budgetType')
            .sort({ createdAt: -1 })
            .limit(40)

        const historical = historicalBudgetStats(similar, budgetType)
        const anchor = buildPricingAnchor({ category, budgetType, size, historical })

        const unitLabel = budgetType === 'hourly' ? 'USD per hour' : 'USD total fixed price'
        const histLine = historical
            ? `Platform data (${historical.count} projects): median $${historical.median}, typical range $${historical.min}–$${historical.max}`
            : 'Not enough platform history — use MENA freelance market rates below'

        const prompt = `
You are a pricing expert for Fursa, a freelancing marketplace in the Middle East / Arab region.
Prices must be realistic for clients in Saudi Arabia, UAE, Egypt, Jordan, etc. — NOT US/Western agency rates.
Use ${unitLabel}.

Project:
- Category: ${category}
- Title: ${titleText || 'Not provided'}
- Description: ${descText || 'Not provided'}
- Skills: ${Array.isArray(skills) && skills.length > 0 ? skills.join(', ') : 'Not specified'}
- Estimated scope: ${size} (${size === 'small' ? 'quick/simple task' : size === 'large' ? 'complex/multi-part' : 'standard job'})

${histLine}

STRICT bounds you MUST respect (do not exceed):
- min: ${anchor.min}
- max: ${anchor.max}
- recommended should be near: ${anchor.recommended}

Rules:
- Small/simple tasks → lower end of range
- Large/complex tasks → upper-mid range (rarely hit max)
- Writing/translation are usually cheaper than full development
- Return integers only

Return ONLY valid JSON (no markdown):
{"min": number, "max": number, "recommended": number, "reason": "One short sentence in plain English"}
        `.trim()

        const text = await groqChatCompletion(
            [{ role: 'user', content: prompt }],
            { temperature: 0.2, max_tokens: 512 },
        )
        const pricing = parseJSON(text)
        const normalized = normalizePricing(pricing, anchor, budgetType)

        if (!pricing || typeof pricing.recommended !== 'number') {
            return res.status(200).json(anchorFallback(anchor, budgetType))
        }

        res.status(200).json(normalized)
    } catch (error) {
        console.error('[AI suggestPrice]', error?.message || error)
        const status = error?.code === 'NO_GROQ_KEY' ? 503 : 502
        res.status(status).json({ error: friendlyAiError(error) })
    }
}

// ── Skill Extraction — suggest skills from bio/portfolio description ───────────
/** Extract skill tags from bio or portfolio text. */
export const extractSkills = async (req, res) => {
    try {
        const { bio, portfolioText } = req.body

        if (!bio && !portfolioText) {
            return res.status(400).json({ error: 'Please provide bio or portfolio text' })
        }

        const prompt = `
Analyze this freelancer's bio and extract relevant professional skills.

Bio: ${bio || ''}
Portfolio: ${portfolioText || ''}

Return ONLY a JSON array of skill strings (max 10 skills, no markdown):
["Skill1", "Skill2", "Skill3"]
        `.trim()

        const text = await groqChatCompletion([{ role: 'user', content: prompt }])
        const skills = parseJSON(text, [])

        res.status(200).json({ skills: Array.isArray(skills) ? skills : [] })
    } catch (error) {
        console.error('[AI extractSkills]', error?.message || error)
        const status = error?.code === 'NO_GROQ_KEY' ? 503 : 502
        res.status(status).json({ error: friendlyAiError(error) })
    }
}

// ── In-app AI assistant (chat) ────────────────────────────────────────────────

const CHAT_SYSTEM = `You are Fursa Assistant, a helpful AI for the Fursa freelancing marketplace (clients and freelancers in the MENA region).
Answer clearly and concisely. You may help with: posting projects, bidding, pricing ideas, skills, contracts, and general freelancing tips.
If asked for medical, legal, or financial advice beyond general tips, suggest consulting a professional.
Support both English and Arabic when the user writes in Arabic.`

const MAX_CHAT_MESSAGES = 24
const MAX_CHAT_MESSAGE_CHARS = 6000

/** Validate and normalize chat message array from request body. */
function normalizeChatMessages(raw) {
    if (!Array.isArray(raw) || raw.length === 0) return null
    if (raw.length > MAX_CHAT_MESSAGES) return null
    const out = []
    for (const m of raw) {
        if (!m || typeof m !== 'object') return null
        const role = m.role
        const content = typeof m.content === 'string' ? m.content.trim() : ''
        if (!content || content.length > MAX_CHAT_MESSAGE_CHARS) return null
        if (role !== 'user' && role !== 'assistant') return null
        out.push({ role, content })
    }
    if (out.length === 0 || out[out.length - 1].role !== 'user') return null
    return out
}

/** In-app AI chat assistant for freelancing help. */
export const chatAssistant = async (req, res) => {
    try {
        const messages = normalizeChatMessages(req.body?.messages)
        if (!messages) {
            return res.status(400).json({
                error: 'Invalid messages: send a non-empty array ending with a user message (max 24 turns, 6000 chars each).',
            })
        }

        const reply = await groqChatCompletion([{ role: 'system', content: CHAT_SYSTEM }, ...messages])
        res.status(200).json({ reply })
    } catch (error) {
        console.error('[AI chatAssistant]', error?.message || error)
        const status = error?.code === 'NO_GROQ_KEY' ? 503 : 502
        res.status(status).json({ error: friendlyAiError(error) })
    }
}
