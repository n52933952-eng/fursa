import { GoogleGenerativeAI } from '@google/generative-ai'
import Project from '../models/Project.js'

// ── Gemini client (lazy) + common env mistakes ────────────────────────────────
/** Copy/paste typo: lowercase L instead of I at start of Google API keys */
function normalizeGeminiApiKey(raw) {
    if (raw == null || typeof raw !== 'string') return ''
    const t = raw.trim()
    if (t.startsWith('AlzaSy')) return `AIzaSy${t.slice(6)}`
    return t
}

/** Default model; override with GEMINI_MODEL if Google returns 404 (e.g. gemini-2.0-flash) */
function resolvedGeminiModel() {
    return (process.env.GEMINI_MODEL || 'gemini-1.5-flash').trim()
}

let _geminiClient = null
function getGeminiClient() {
    const key = normalizeGeminiApiKey(process.env.GEMINI_API_KEY)
    if (!key) return null
    if (!_geminiClient) _geminiClient = new GoogleGenerativeAI(key)
    return _geminiClient
}

function friendlyGeminiError(err) {
    const msg = String(err?.message || err || '')
    if (/MISSING_GEMINI_KEY|missing.*gemini/i.test(msg)) {
        return 'AI is not configured: set GEMINI_API_KEY on the server (Google AI Studio, starts with AIza).'
    }
    if (/API key not valid|API_KEY_INVALID|invalid api key|401|403/i.test(msg)) {
        return 'Gemini API key is invalid. Copy it again from Google AI Studio — it must start with AIza (not Alza).'
    }
    if (/404|not found|is not found for api version/i.test(msg)) {
        return `Gemini model not available. Set env GEMINI_MODEL to a model your key can use (e.g. gemini-2.0-flash). Current: ${resolvedGeminiModel()}`
    }
    if (/429|quota|resource exhausted|rate limit/i.test(msg)) {
        return 'Gemini quota exceeded or rate limited. Try again later or check Google AI Studio limits.'
    }
    return 'AI request failed. Please try again.'
}

function getModel() {
    const client = getGeminiClient()
    if (!client) {
        const e = new Error('MISSING_GEMINI_KEY')
        e.code = 'MISSING_GEMINI_KEY'
        throw e
    }
    return client.getGenerativeModel({ model: resolvedGeminiModel() })
}

// Helper: safely parse JSON from AI text (handles markdown code fences)
function parseJSON(text, fallback = null) {
    try {
        // Strip markdown code blocks if present
        const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        // Extract first JSON object or array
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
        if (!project) return res.status(404).json({ error: "Project not found" })

        const User = (await import('../models/User.js')).default
        const freelancers = await User.find({ role: 'freelancer', isBanned: false })
            .select('username skills rating totalProjects bio')

        const model = getModel()
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

        const result = await model.generateContent(prompt)
        const text   = result.response.text()
        const ids    = parseJSON(text, [])
        const matched = Array.isArray(ids)
            ? freelancers.filter(f => ids.includes(f._id.toString()))
            : freelancers.slice(0, 5)

        res.status(200).json(matched)
    } catch (error) {
        console.error('[AI matchFreelancers]', error?.message || error)
        res.status(500).json({ error: "AI matchmaking failed" })
    }
}

// ── AI Writing Assistant — generate project description from keywords ──────────
export const generateDescription = async (req, res) => {
    try {
        const { keywords, category } = req.body

        if (!keywords && !category) {
            return res.status(400).json({ error: "Please provide keywords or category" })
        }

        const model = getModel()
        const prompt = `
Write a professional freelancing project description for a project in the "${category || 'General'}" category.
Keywords/Title: ${keywords || category}

Respond in this exact format:
EN: [Write 3-4 clear, professional sentences in English describing the project, what the client needs, and what skills are required]
AR: [اكتب 3-4 جمل واضحة واحترافية باللغة العربية تصف المشروع وما يحتاجه العميل والمهارات المطلوبة]
        `.trim()

        const result = await model.generateContent(prompt)
        const text   = result.response.text()

        res.status(200).json({ description: text })
    } catch (error) {
        console.error('[AI generateDescription]', error?.message || error)
        const status = error?.code === 'MISSING_GEMINI_KEY' ? 503 : 502
        res.status(status).json({ error: friendlyGeminiError(error) })
    }
}

// ── Smart Pricing — suggest budget based on category and historical data ───────
export const suggestPrice = async (req, res) => {
    try {
        const { category, description, skills } = req.body

        if (!category) {
            return res.status(400).json({ error: "Please provide a category" })
        }

        // Get historical data from completed projects
        const similar = await Project.find({
            category,
            status: 'completed',
        }).select('budget').limit(20)

        const avgBudget = similar.length > 0
            ? Math.round(similar.reduce((sum, p) => sum + (p.budget || 0), 0) / similar.length)
            : null

        const model = getModel()
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

        const result = await model.generateContent(prompt)
        const text   = result.response.text()
        const pricing = parseJSON(text)

        if (!pricing || typeof pricing.recommended !== 'number') {
            // Fallback pricing based on category
            const fallbacks = {
                'Design':      { min: 100, max: 800,  recommended: 300,  reason: 'Based on typical design project rates' },
                'Development': { min: 200, max: 2000, recommended: 700,  reason: 'Based on typical development project rates' },
                'Writing':     { min: 50,  max: 400,  recommended: 150,  reason: 'Based on typical writing project rates' },
                'Marketing':   { min: 100, max: 600,  recommended: 250,  reason: 'Based on typical marketing project rates' },
                'Video':       { min: 150, max: 1000, recommended: 400,  reason: 'Based on typical video project rates' },
                'Translation': { min: 50,  max: 300,  recommended: 120,  reason: 'Based on typical translation project rates' },
            }
            return res.status(200).json(
                fallbacks[category] || { min: 100, max: 1000, recommended: 350, reason: 'Estimated based on market rates' }
            )
        }

        res.status(200).json(pricing)
    } catch (error) {
        console.error('[AI suggestPrice]', error?.message || error)
        const status = error?.code === 'MISSING_GEMINI_KEY' ? 503 : 502
        res.status(status).json({ error: friendlyGeminiError(error) })
    }
}

// ── Skill Extraction — suggest skills from bio/portfolio description ────────────
export const extractSkills = async (req, res) => {
    try {
        const { bio, portfolioText } = req.body

        if (!bio && !portfolioText) {
            return res.status(400).json({ error: "Please provide bio or portfolio text" })
        }

        const model = getModel()
        const prompt = `
Analyze this freelancer's bio and extract relevant professional skills.

Bio: ${bio || ''}
Portfolio: ${portfolioText || ''}

Return ONLY a JSON array of skill strings (max 10 skills, no markdown):
["Skill1", "Skill2", "Skill3"]
        `.trim()

        const result = await model.generateContent(prompt)
        const text   = result.response.text()
        const skills = parseJSON(text, [])

        res.status(200).json({ skills: Array.isArray(skills) ? skills : [] })
    } catch (error) {
        console.error('[AI extractSkills]', error?.message || error)
        const status = error?.code === 'MISSING_GEMINI_KEY' ? 503 : 502
        res.status(status).json({ error: friendlyGeminiError(error) })
    }
}

// ── In-app AI assistant (OpenAI GPT when OPENAI_API_KEY is set, else Gemini) ──

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

async function openaiChatCompletion(messages) {
    const key = process.env.OPENAI_API_KEY
    if (!key) return null
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: CHAT_SYSTEM }, ...messages],
            max_tokens: 1200,
            temperature: 0.65,
        }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        const err = data?.error?.message || `OpenAI HTTP ${res.status}`
        throw new Error(err)
    }
    const text = data?.choices?.[0]?.message?.content
    if (!text || typeof text !== 'string') throw new Error('Empty AI response')
    return text.trim()
}

async function geminiChatCompletion(messages) {
    const client = getGeminiClient()
    if (!client) throw new Error('No AI provider configured')
    const model = client.getGenerativeModel({
        model: resolvedGeminiModel(),
        systemInstruction: CHAT_SYSTEM,
    })
    const last = messages[messages.length - 1]
    const history = []
    for (let i = 0; i < messages.length - 1; i++) {
        const m = messages[i]
        if (m.role === 'user') history.push({ role: 'user', parts: [{ text: m.content }] })
        else history.push({ role: 'model', parts: [{ text: m.content }] })
    }
    const chat = model.startChat({ history })
    const result = await chat.sendMessage(last.content)
    const text = result.response.text()
    if (!text || !String(text).trim()) throw new Error('Empty AI response')
    return String(text).trim()
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

        let reply
        if (process.env.OPENAI_API_KEY) {
            try {
                reply = await openaiChatCompletion(messages)
            } catch (e) {
                console.error('[AI chat OpenAI]', e?.message || e)
                if (normalizeGeminiApiKey(process.env.GEMINI_API_KEY)) {
                    reply = await geminiChatCompletion(messages)
                } else {
                    return res.status(502).json({ error: e?.message || 'AI chat failed' })
                }
            }
        } else if (normalizeGeminiApiKey(process.env.GEMINI_API_KEY)) {
            reply = await geminiChatCompletion(messages)
        } else {
            return res.status(503).json({
                error: 'AI chat is not configured. Set OPENAI_API_KEY or GEMINI_API_KEY on the server.',
            })
        }

        res.status(200).json({ reply })
    } catch (error) {
        console.error('[AI chatAssistant]', error?.message || error)
        res.status(500).json({ error: error?.message || 'AI chat failed. Please try again.' })
    }
}
