import express from "express";
import { query, withTransaction } from "../config/db";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { requireProjectMember, requireProjectRole } from "../middleware/projectAuth";
import { body, validationResult } from "express-validator";

const router = express.Router();

/**
 * POST /api/projects
 * Creates a new project and adds the creator as a Reviewer member.
 * Uses a database transaction to ensure both inserts succeed or both fail.
 */
router.post(
  "/",
  authMiddleware,
  body("name").trim().isLength({ min: 1 }).withMessage("Project name is required"),
  body("description").optional().trim(),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description } = req.body;
      const ownerId = req.user!.id;

      // Use a transaction so the project + membership are created atomically
      const project = await withTransaction(async (client) => {
        const projectResult = await client.query(
          "INSERT INTO projects (name, description, owner_id) VALUES ($1,$2,$3) RETURNING *",
          [name, description || null, ownerId]
        );
        const newProject = projectResult.rows[0];

        await client.query(
          "INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3)",
          [newProject.id, ownerId, "Reviewer"]
        );

        return newProject;
      });

      res.status(201).json(project);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/projects
 * Returns all projects with the owner's name.
 */
router.get("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const r = await query(
      `SELECT p.*, u.name AS owner_name
       FROM projects p
       LEFT JOIN users u ON p.owner_id = u.id
       ORDER BY p.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/projects/:id/members
 * Adds a member to a project.
 * Only existing project members with the "Reviewer" project-level role can add members.
 */
router.post(
  "/:id/members",
  authMiddleware,
  requireProjectMember,
  requireProjectRole(["Reviewer"]),
  body("userId").isInt({ min: 1 }).withMessage("Valid userId is required"),
  body("role").optional().isIn(["Reviewer", "Submitter"]).withMessage("Role must be Reviewer or Submitter"),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const projectId = Number(req.params.id);
      const { userId, role } = req.body;

      // Verify the target user exists
      const userExists = await query("SELECT id FROM users WHERE id=$1", [userId]);
      if (userExists.rowCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      await query(
        "INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
        [projectId, userId, role || "Reviewer"]
      );

      res.status(201).json({ message: "Member added" });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/projects/:id/members/:userId
 * Removes a member from a project.
 * Only project-level Reviewers can remove members.
 */
router.delete(
  "/:id/members/:userId",
  authMiddleware,
  requireProjectMember,
  requireProjectRole(["Reviewer"]),
  async (req: AuthRequest, res, next) => {
    try {
      const projectId = Number(req.params.id);
      const userId = Number(req.params.userId);

      // Prevent removing yourself if you are the owner
      const project = await query("SELECT owner_id FROM projects WHERE id=$1", [projectId]);
      if (project.rowCount && project.rows[0].owner_id === userId) {
        return res.status(400).json({ message: "Cannot remove the project owner" });
      }

      await query(
        "DELETE FROM project_members WHERE project_id=$1 AND user_id=$2",
        [projectId, userId]
      );

      res.json({ message: "Member removed" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
