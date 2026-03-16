import { GoogleGenerativeAI } from '@google/generative-ai'
import Project from '../models/Project.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Use the current stable model — "gemini-pro" was deprecated
const MODEL = 'gemini-1.5-flash'

// Helper: safely get model
function getModel() {
    return genAI.getGenerativeModel({ model: MODEL })
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
        res.status(500).json({ error: "AI writing assistant failed. Please try again." })
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
        res.status(500).json({ error: "Price suggestion failed. Please try again." })
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
        res.status(500).json({ error: "Skill extraction failed. Please try again." })
    }
}
