import express from 'express'
import {
  createProject, getProjects, getProjectById, getMyProjects, deleteProject,
  getAllProjectsAdmin, markProjectComplete, adminReleaseProjectPayment
} from '../controllers/project.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.post("/", verifyToken, createProject)
router.get("/", verifyToken, getProjects)
router.get("/admin-all", verifyToken, getAllProjectsAdmin)
router.get("/my", verifyToken, getMyProjects)
router.get("/:id", verifyToken, getProjectById)
router.post("/:id/complete", verifyToken, markProjectComplete)
router.post("/:id/admin-release", verifyToken, adminReleaseProjectPayment)
router.delete("/:id", verifyToken, deleteProject)

export default router
