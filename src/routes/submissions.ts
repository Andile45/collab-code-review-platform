import express from "express";
import { query } from "../config/db";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { requireProjectMember, requireProjectRole } from "../middleware/projectAuth";
import { body, param, validationResult } from "express-validator";
import { emitToProject } from "../services/socket";
import { SubmissionStatus } from "../types/models";

const router = express.Router();

/** Allowed submission status values. */
const ALLOWED_STATUSES: SubmissionStatus[] = ["pending", "in_review", "approved", "changes_requested"];

/**
 * POST /api/submissions
 * Creates a new code submission within a project.
 * The user must be a member of the target project.
 */
router.post(
  "/",
  authMiddleware,
  body("project_id").isInt({ min: 1 }).withMessage("Valid project_id is required"),
  body("title").trim().isLength({ min: 1 }).withMessage("Title is required"),
  body("content").trim().isLength({ min: 1 }).withMessage("Content is required"),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { project_id, title, content } = req.body;
      const userId = req.user!.id;

      // Verify the user is a member of this project
      const membership = await query(
        "SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2",
        [project_id, userId]
      );
      if (membership.rowCount === 0) {
        return res.status(403).json({ message: "You are not a member of this project" });
      }

      const r = await query(
        "INSERT INTO submissions (project_id, user_id, title, content) VALUES($1,$2,$3,$4) RETURNING *",
        [project_id, userId, title, content]
      );

      emitToProject(project_id, "submissionCreated", r.rows[0]);

      res.status(201).json(r.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/submissions/project/:id
 * Returns all submissions for a given project.
 * The user must be a member of the project to view its submissions.
 *
 * Supports pagination via ?page=1&limit=20 query parameters.
 */
router.get("/project/:id", authMiddleware, requireProjectMember, async (req: AuthRequest, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    // Get total count for pagination metadata
    const countResult = await query(
      "SELECT COUNT(*) FROM submissions WHERE project_id=$1",
      [projectId]
    );
    const totalCount = parseInt(countResult.rows[0].count);

    const r = await query(
      `SELECT s.*, u.name AS author_name
       FROM submissions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.project_id = $1
       ORDER BY s.created_at DESC
       LIMIT $2 OFFSET $3`,
      [projectId, limit, offset]
    );

    res.json({
      data: r.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/submissions/:id/status
 * Updates a submission's status.
 * Only project-level Reviewers can change submission status.
 */
router.patch(
  "/:id/status",
  authMiddleware,
  body("status").isIn(ALLOWED_STATUSES).withMessage(`Status must be one of: ${ALLOWED_STATUSES.join(", ")}`),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const id = Number(req.params.id);
      const { status } = req.body;

      // Look up the submission to get its project_id
      const sub = await query("SELECT project_id FROM submissions WHERE id=$1", [id]);
      if (sub.rowCount === 0) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Verify the user is a Reviewer in the submission's project
      const membership = await query(
        "SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2",
        [sub.rows[0].project_id, req.user!.id]
      );
      if (membership.rowCount === 0 || membership.rows[0].role !== "Reviewer") {
        return res.status(403).json({ message: "Only project Reviewers can change submission status" });
      }

      const r = await query(
        "UPDATE submissions SET status=$1, updated_at=now() WHERE id=$2 RETURNING *",
        [status, id]
      );

      emitToProject(r.rows[0].project_id, "submissionUpdated", r.rows[0]);

      res.json(r.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/submissions/:id
 * Deletes a submission. Only the original submitter can delete their own submission.
 */
router.delete("/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    // Ownership check — only the submitter who created it can delete
    const submission = await query("SELECT user_id FROM submissions WHERE id=$1", [id]);
    if (submission.rowCount === 0) {
      return res.status(404).json({ message: "Submission not found" });
    }
    if (submission.rows[0].user_id !== userId) {
      return res.status(403).json({ message: "You can only delete your own submissions" });
    }

    await query("DELETE FROM submissions WHERE id=$1", [id]);
    res.json({ message: "Submission deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
