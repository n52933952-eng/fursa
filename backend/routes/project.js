import express from 'express'
import {
  createProject, getProjects, getProjectById, getMyProjects, deleteProject,
  getAllProjectsAdmin, markProjectComplete, adminReleaseProjectPayment
} from '../controllers/project.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

/** @fileoverview Project CRUD, browse, completion, and admin release. */

/** Create a new project. */
router.post("/", verifyToken, createProject)
/** Browse open projects with filters. */
router.get("/", verifyToken, getProjects)
/** Admin: list all projects regardless of status. */
router.get("/admin-all", verifyToken, getAllProjectsAdmin)
/** List projects owned by logged-in client. */
router.get("/my", verifyToken, getMyProjects)
/** Get single project by ID. */
router.get("/:id", verifyToken, getProjectById)
/** Freelancer marks project complete for review. */
router.post("/:id/complete", verifyToken, markProjectComplete)
/** Admin releases held payment to freelancer. */
router.post("/:id/admin-release", verifyToken, adminReleaseProjectPayment)
/** Delete a project owned by client. */
router.delete("/:id", verifyToken, deleteProject)

export default router
