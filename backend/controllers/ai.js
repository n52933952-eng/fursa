import Project from '../models/Project.js'

/**
 * All AI features use Groq only (OpenAI-compatible API).
 * Set GROQ_API_KEY on the server: https://console.groq.com
 * Optional: GROQ_MODEL (default llama-3.3-70b-versatile)
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

function requireGroqKey() {
    const key = process.env.GROQ_API_KEY?.trim()
    if (!key) {
        const e = new Error('GROQ_API_KEY is not set on the server.')
        e.code = 'NO_GROQ_KEY'
        throw e
    }
    return key
}

function resolvedGroqModel() {
    return (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim()
}

/** @param {{ role: string, content: string }[]} messages */
async function groqChatCompletion(messages) {
    const key = requireGroqKey()
    const model = resolvedGroqModel()
    const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
            model,
            messages,
            max_tokens: 2048,
            temperature: 0.65,
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
export const suggestPrice = async (req, res) => {
    try {
        const { category, description, skills } = req.body

        if (!category) {
            return res.status(400).json({ error: 'Please provide a category' })
        }

        const similar = await Project.find({
            category,
            status: 'completed',
        })
            .select('budget')
            .limit(20)

        const avgBudget =
            similar.length > 0
                ? Math.round(similar.reduce((sum, p) => sum + (p.budget || 0), 0) / similar.length)
                : null

        const prompt = `
You are a pricing expert for a freelancing marketplace in the Arab region.

Project details:
- Category: ${category}
- Description: ${description || 'Not provided'}
- Skills needed: ${Array.isArray(skills) && skills.length > 0 ? skills.join(', ') : 'Not specified'}
- Historical average from similar completed projects: ${avgBudget ? '$' + avgBudget : 'No data available'}

Suggest a realistic price range in USD. Return ONLY valid JSON (no markdown, no explanation):
{"min": 100, "max": 500, "recommended": 250, "reason": "Short 1-sentence explanation"}
        `.trim()

        const text = await groqChatCompletion([{ role: 'user', content: prompt }])
        const pricing = parseJSON(text)

        if (!pricing || typeof pricing.recommended !== 'number') {
            const fallbacks = {
                Design: { min: 100, max: 800, recommended: 300, reason: 'Based on typical design project rates' },
                Development: { min: 200, max: 2000, recommended: 700, reason: 'Based on typical development project rates' },
                Writing: { min: 50, max: 400, recommended: 150, reason: 'Based on typical writing project rates' },
                Marketing: { min: 100, max: 600, recommended: 250, reason: 'Based on typical marketing project rates' },
                Video: { min: 150, max: 1000, recommended: 400, reason: 'Based on typical video project rates' },
                Translation: { min: 50, max: 300, recommended: 120, reason: 'Based on typical translation project rates' },
            }
            return res.status(200).json(
                fallbacks[category] || { min: 100, max: 1000, recommended: 350, reason: 'Estimated based on market rates' },
            )
        }

        res.status(200).json(pricing)
    } catch (error) {
        console.error('[AI suggestPrice]', error?.message || error)
        const status = error?.code === 'NO_GROQ_KEY' ? 503 : 502
        res.status(status).json({ error: friendlyAiError(error) })
    }
}

// ── Skill Extraction — suggest skills from bio/portfolio description ───────────
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

/** POST body: { messages: [{ role: 'user'|'assistant', content: string }] } */
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
