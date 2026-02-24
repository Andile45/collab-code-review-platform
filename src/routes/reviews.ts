import express from "express";
import { query } from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/checkRole";
import { getIO } from "../services/socket";

const router = express.Router();

router.post("/submissions/:id/approve", authMiddleware, requireRole(["Reviewer"]), async (req, res, next) => {
  try {
    const submissionId = Number(req.params.id);
    const reviewerId = req.user!.id;
    const { note } = req.body;
    await query("INSERT INTO reviews (submission_id, reviewer_id, action, note) VALUES ($1,$2,$3,$4)", [submissionId, reviewerId, "approved", note || null]);
    const r = await query("UPDATE submissions SET status='approved', updated_at=now() WHERE id=$1 RETURNING *", [submissionId]);
    try { getIO().to(`project_${r.rows[0].project_id}`).emit("submissionApproved", r.rows[0]); } catch(e){}
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

router.post("/submissions/:id/request-changes", authMiddleware, requireRole(["Reviewer"]), async (req, res, next) => {
  try {
    const submissionId = Number(req.params.id);
    const reviewerId = req.user!.id;
    const { note } = req.body;
    await query("INSERT INTO reviews (submission_id, reviewer_id, action, note) VALUES ($1,$2,$3,$4)", [submissionId, reviewerId, "changes_requested", note || null]);
    const r = await query("UPDATE submissions SET status='changes_requested', updated_at=now() WHERE id=$1 RETURNING *", [submissionId]);
    try { getIO().to(`project_${r.rows[0].project_id}`).emit("submissionChangesRequested", r.rows[0]); } catch(e){}
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

router.get("/submissions/:id/reviews", authMiddleware, async (req, res, next) => {
  try {
    const submissionId = Number(req.params.id);
    const r = await query(`SELECT r.*, u.name as reviewer_name FROM reviews r LEFT JOIN users u ON r.reviewer_id = u.id WHERE r.submission_id=$1 ORDER BY r.created_at DESC`, [submissionId]);
    res.json(r.rows);
  } catch (err) { next(err); }
});

export default router;
