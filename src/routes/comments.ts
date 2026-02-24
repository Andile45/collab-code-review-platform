import express from "express";
import { query } from "../config/db";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { body, validationResult } from "express-validator";
import { emitToProject } from "../services/socket";

const router = express.Router();

/**
 * Helper: get the project_id for a submission and verify the user is a member.
 * Returns the project_id on success, or sends an error response and returns null.
 */
async function verifySubmissionMembership(
  submissionId: number,
  userId: number,
  res: express.Response
): Promise<number | null> {
  const sub = await query("SELECT project_id FROM submissions WHERE id=$1", [submissionId]);
  if (sub.rowCount === 0) {
    res.status(404).json({ message: "Submission not found" });
    return null;
  }

  const projectId = sub.rows[0].project_id;
  const membership = await query(
    "SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2",
    [projectId, userId]
  );
  if (membership.rowCount === 0) {
    res.status(403).json({ message: "You are not a member of this project" });
    return null;
  }

  return projectId;
}

/**
 * POST /api/submissions/:id/comments
 * Adds a review comment to a submission.
 * Only project-level Reviewers can add comments.
 */
router.post(
  "/submissions/:id/comments",
  authMiddleware,
  body("comment_text").trim().isLength({ min: 1 }).withMessage("Comment text is required"),
  body("line_number").optional().isInt({ min: 1 }).withMessage("Line number must be a positive integer"),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const submissionId = Number(req.params.id);
      const userId = req.user!.id;
      const { line_number, comment_text } = req.body;

      // Verify submission exists and user is a project member
      const sub = await query("SELECT project_id FROM submissions WHERE id=$1", [submissionId]);
      if (sub.rowCount === 0) {
        return res.status(404).json({ message: "Submission not found" });
      }
      const projectId = sub.rows[0].project_id;

      // Only project-level Reviewers can comment
      const membership = await query(
        "SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2",
        [projectId, userId]
      );
      if (membership.rowCount === 0 || membership.rows[0].role !== "Reviewer") {
        return res.status(403).json({ message: "Only project Reviewers can add comments" });
      }

      const r = await query(
        "INSERT INTO comments (submission_id, user_id, line_number, comment_text) VALUES ($1,$2,$3,$4) RETURNING *",
        [submissionId, userId, line_number || null, comment_text]
      );

      emitToProject(projectId, "commentCreated", r.rows[0]);

      res.status(201).json(r.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/submissions/:id/comments
 * Returns all comments for a given submission, ordered by creation date.
 * User must be a member of the submission's project.
 *
 * Supports pagination via ?page=1&limit=50 query parameters.
 */
router.get("/submissions/:id/comments", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const submissionId = Number(req.params.id);
    const userId = req.user!.id;

    // Verify submission exists and user is a project member
    const projectId = await verifySubmissionMembership(submissionId, userId, res);
    if (projectId === null) return;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    const countResult = await query(
      "SELECT COUNT(*) FROM comments WHERE submission_id=$1",
      [submissionId]
    );
    const totalCount = parseInt(countResult.rows[0].count);

    const r = await query(
      `SELECT c.*, u.name AS author_name
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.submission_id = $1
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $3`,
      [submissionId, limit, offset]
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
 * PATCH /api/comments/:id
 * Updates a comment's text. Only the original author can edit their own comment.
 */
router.patch(
  "/comments/:id",
  authMiddleware,
  body("comment_text").trim().isLength({ min: 1 }).withMessage("Comment text is required"),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const id = Number(req.params.id);
      const userId = req.user!.id;
      const { comment_text } = req.body;

      // Ownership check — only the comment author can edit
      const existing = await query("SELECT user_id FROM comments WHERE id=$1", [id]);
      if (existing.rowCount === 0) {
        return res.status(404).json({ message: "Comment not found" });
      }
      if (existing.rows[0].user_id !== userId) {
        return res.status(403).json({ message: "You can only edit your own comments" });
      }

      const r = await query(
        "UPDATE comments SET comment_text=$1 WHERE id=$2 RETURNING *",
        [comment_text, id]
      );
      res.json(r.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/comments/:id
 * Deletes a comment. Only the original author can delete their own comment.
 */
router.delete("/comments/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    // Ownership check — only the comment author can delete
    const existing = await query("SELECT user_id FROM comments WHERE id=$1", [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }
    if (existing.rows[0].user_id !== userId) {
      return res.status(403).json({ message: "You can only delete your own comments" });
    }

    await query("DELETE FROM comments WHERE id=$1", [id]);
    res.json({ message: "Comment deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
