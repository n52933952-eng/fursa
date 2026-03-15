import { GoogleGenerativeAI } from '@google/generative-ai'
import User from '../models/User.js'
import Project from '../models/Project.js'
import Transaction from '../models/Transaction.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// AI Matchmaking — recommend best freelancers for a project
export const matchFreelancers = async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId)
        if (!project) return res.status(404).json({ error: "Project not found" })

        const freelancers = await User.find({ role: 'freelancer', isBanned: false })
            .select('username skills rating totalProjects successRate bio')

        const model = genAI.getGenerativeModel({ model: "gemini-pro" })
        const prompt = `
            You are a freelancing platform AI. Given this project:
            Title: ${project.title}
            Description: ${project.description}
            Required Skills: ${project.skills.join(', ')}
            Budget: $${project.budget}

            Rank these freelancers by best match (return top 5 IDs only as JSON array):
            ${JSON.stringify(freelancers.map(f => ({ id: f._id, skills: f.skills, rating: f.rating })))}

            Return ONLY a JSON array of the top 5 freelancer IDs like: ["id1","id2","id3","id4","id5"]
        `
        const result = await model.generateContent(prompt)
        const text = result.response.text()
        const ids = JSON.parse(text.match(/\[.*\]/s)[0])
        const matched = freelancers.filter(f => ids.includes(f._id.toString()))
        res.status(200).json(matched)
    } catch (error) {
        res.status(500).json({ error: "AI matchmaking failed" })
    }
}

// AI Writing Assistant — generate project description from keywords
export const generateDescription = async (req, res) => {
    try {
        const { keywords, category } = req.body
        const model = genAI.getGenerativeModel({ model: "gemini-pro" })
        const prompt = `
            Write a professional freelancing project description in both Arabic and English.
            Category: ${category}
            Keywords: ${keywords}
            Format: 
            EN: [English description 3-4 sentences]
            AR: [Arabic description 3-4 sentences]
        `
        const result = await model.generateContent(prompt)
        const text = result.response.text()
        res.status(200).json({ description: text })
    } catch (error) {
        res.status(500).json({ error: "AI writing assistant failed" })
    }
}

// Smart Pricing — suggest budget based on category and historical data
export const suggestPrice = async (req, res) => {
    try {
        const { category, description, skills } = req.body

        // Get historical data from completed projects
        const similar = await Project.find({
            category,
            status: 'completed',
            skills: { $in: skills }
        }).select('budget').limit(20)

        const avgBudget = similar.length > 0
            ? Math.round(similar.reduce((sum, p) => sum + p.budget, 0) / similar.length)
            : null

        const model = genAI.getGenerativeModel({ model: "gemini-pro" })
        const prompt = `
            Suggest a fair price range for this freelancing project:
            Category: ${category}
            Description: ${description}
            Skills needed: ${skills?.join(', ')}
            Historical average from similar projects: ${avgBudget ? '$' + avgBudget : 'No data'}

            Return JSON: { "min": number, "max": number, "recommended": number, "reason": "short explanation" }
        `
        const result = await model.generateContent(prompt)
        const text = result.response.text()
        const pricing = JSON.parse(text.match(/\{.*\}/s)[0])
        res.status(200).json(pricing)
    } catch (error) {
        res.status(500).json({ error: "Price suggestion failed" })
    }
}

// Skill Extraction — suggest skills from bio/portfolio description
export const extractSkills = async (req, res) => {
    try {
        const { bio, portfolioText } = req.body
        const model = genAI.getGenerativeModel({ model: "gemini-pro" })
        const prompt = `
            Analyze this freelancer's bio and portfolio and extract relevant professional skills.
            Bio: ${bio}
            Portfolio: ${portfolioText}

            Return ONLY a JSON array of skill strings. Example: ["React", "Node.js", "UI Design"]
            Return maximum 10 most relevant skills.
        `
        const result = await model.generateContent(prompt)
        const text = result.response.text()
        const skills = JSON.parse(text.match(/\[.*\]/s)[0])
        res.status(200).json({ skills })
    } catch (error) {
        res.status(500).json({ error: "Skill extraction failed" })
    }
}
