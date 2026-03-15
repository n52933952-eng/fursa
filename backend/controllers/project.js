import Project from '../models/Project.js'
import Notification from '../models/Notification.js'
import { getRecipientSocketId, io } from '../socket/socket.js'

export const createProject = async (req, res) => {
    try {
        const { title, description, category, budgetType, budget, deadline, skills } = req.body
        const newProject = new Project({
            title, description, category, budgetType,
            budget, deadline, skills,
            clientId: req.user._id
        })
        await newProject.save()
        res.status(201).json(newProject)
    } catch (error) {
        res.status(500).json({ error: "Failed to create project" })
    }
}

export const getProjects = async (req, res) => {
    try {
        const { category, minBudget, maxBudget, skill, search } = req.query
        let filter = { status: 'open' }

        if (category) filter.category = category
        if (skill) filter.skills = { $in: [skill] }
        if (search) filter.title = { $regex: search, $options: 'i' }
        if (minBudget || maxBudget) {
            filter.budget = {}
            if (minBudget) filter.budget.$gte = parseFloat(minBudget)
            if (maxBudget) filter.budget.$lte = parseFloat(maxBudget)
        }

        const projects = await Project.find(filter)
            .populate('clientId', 'username profilePic rating')
            .sort({ createdAt: -1 })
        res.status(200).json(projects)
    } catch (error) {
        res.status(500).json({ error: "Failed to get projects" })
    }
}

export const getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('clientId', 'username profilePic rating country')
            .populate('proposals')
        if (!project) return res.status(404).json({ error: "Project not found" })
        res.status(200).json(project)
    } catch (error) {
        res.status(500).json({ error: "Failed to get project" })
    }
}

export const getMyProjects = async (req, res) => {
    try {
        const projects = await Project.find({ clientId: req.user._id }).sort({ createdAt: -1 })
        res.status(200).json(projects)
    } catch (error) {
        res.status(500).json({ error: "Failed to get projects" })
    }
}

export const deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
        if (!project) return res.status(404).json({ error: "Project not found" })
        if (project.clientId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: "Not authorized" })
        await Project.findByIdAndDelete(req.params.id)
        res.status(200).json({ message: "Project deleted" })
    } catch (error) {
        res.status(500).json({ error: "Failed to delete project" })
    }
}
