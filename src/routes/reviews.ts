import express from "express";
import { query, withTransaction } from "../config/db";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { body, validationResult } from "express-validator";
import { emitToProject } from "../services/socket";

const router = express.Router();

/**
 * Helper: verify a submission exists and the user is a project-level Reviewer.
 * Returns { projectId, submissionId } on success, or sends an error and returns null.
 */
async function verifyProjectReviewer(
  submissionId: number,
  userId: number,
  res: express.Response
): Promise<{ projectId: number } | null> {
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
  if (membership.rowCount === 0 || membership.rows[0].role !== "Reviewer") {
    res.status(403).json({ message: "Only project Reviewers can perform this action" });
    return null;
  }

  return { projectId };
}

/**
 * POST /api/submissions/:id/approve
 * Approves a submission. Only project-level Reviewers can approve.
 * Creates a review record and updates the submission status in a transaction.
 */
router.post(
  "/submissions/:id/approve",
  authMiddleware,
  body("note").optional().trim(),
  async (req: AuthRequest, res, next) => {
    try {
      const submissionId = Number(req.params.id);
      const reviewerId = req.user!.id;
      const { note } = req.body;

      // Verify user is a project-level Reviewer
      const check = await verifyProjectReviewer(submissionId, reviewerId, res);
      if (!check) return;

      // Use a transaction to ensure the review + status update are atomic
      const submission = await withTransaction(async (client) => {
        await client.query(
          "INSERT INTO reviews (submission_id, reviewer_id, action, note) VALUES ($1,$2,$3,$4)",
          [submissionId, reviewerId, "approved", note || null]
        );

        const r = await client.query(
          "UPDATE submissions SET status='approved', updated_at=now() WHERE id=$1 RETURNING *",
          [submissionId]
        );

        return r.rows[0];
      });

      emitToProject(check.projectId, "submissionApproved", submission);

      res.json(submission);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/submissions/:id/request-changes
 * Requests changes on a submission. Only project-level Reviewers can do this.
 * Creates a review record and updates the submission status in a transaction.
 */
router.post(
  "/submissions/:id/request-changes",
  authMiddleware,
  body("note").optional().trim(),
  async (req: AuthRequest, res, next) => {
    try {
      const submissionId = Number(req.params.id);
      const reviewerId = req.user!.id;
      const { note } = req.body;

      // Verify user is a project-level Reviewer
      const check = await verifyProjectReviewer(submissionId, reviewerId, res);
      if (!check) return;

      // Use a transaction to ensure the review + status update are atomic
      const submission = await withTransaction(async (client) => {
        await client.query(
          "INSERT INTO reviews (submission_id, reviewer_id, action, note) VALUES ($1,$2,$3,$4)",
          [submissionId, reviewerId, "changes_requested", note || null]
        );

        const r = await client.query(
          "UPDATE submissions SET status='changes_requested', updated_at=now() WHERE id=$1 RETURNING *",
          [submissionId]
        );

        return r.rows[0];
      });

      emitToProject(check.projectId, "submissionChangesRequested", submission);

      res.json(submission);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/submissions/:id/reviews
 * Returns all reviews for a given submission.
 * User must be a member of the submission's project.
 *
 * Supports pagination via ?page=1&limit=20 query parameters.
 */
router.get("/submissions/:id/reviews", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const submissionId = Number(req.params.id);
    const userId = req.user!.id;

    // Verify submission exists and user is a project member
    const sub = await query("SELECT project_id FROM submissions WHERE id=$1", [submissionId]);
    if (sub.rowCount === 0) {
      return res.status(404).json({ message: "Submission not found" });
    }

    const membership = await query(
      "SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2",
      [sub.rows[0].project_id, userId]
    );
    if (membership.rowCount === 0) {
      return res.status(403).json({ message: "You are not a member of this project" });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const countResult = await query(
      "SELECT COUNT(*) FROM reviews WHERE submission_id=$1",
      [submissionId]
    );
    const totalCount = parseInt(countResult.rows[0].count);

    const r = await query(
      `SELECT r.*, u.name AS reviewer_name
       FROM reviews r
       LEFT JOIN users u ON r.reviewer_id = u.id
       WHERE r.submission_id = $1
       ORDER BY r.created_at DESC
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

export default router;
