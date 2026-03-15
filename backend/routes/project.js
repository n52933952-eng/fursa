import express from 'express'
import { createProject, getProjects, getProjectById, getMyProjects, deleteProject } from '../controllers/project.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.post("/", verifyToken, createProject)
router.get("/", verifyToken, getProjects)
router.get("/my", verifyToken, getMyProjects)
router.get("/:id", verifyToken, getProjectById)
router.delete("/:id", verifyToken, deleteProject)

export default router
