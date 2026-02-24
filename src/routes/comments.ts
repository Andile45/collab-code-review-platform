import express from "express";
import { query } from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/checkRole";
import { getIO } from "../services/socket";

const router = express.Router();

router.post("/submissions/:id/comments", authMiddleware, requireRole(["Reviewer"]), async (req, res, next) => {
  try {
    const submissionId = Number(req.params.id);
    const { line_number, comment_text } = req.body;
    const user_id = req.user!.id;
    const r = await query("INSERT INTO comments (submission_id, user_id, line_number, comment_text) VALUES ($1,$2,$3,$4) RETURNING *", [submissionId, user_id, line_number || null, comment_text]);

    try {
      const sub = await query("SELECT project_id FROM submissions WHERE id=$1", [submissionId]);
      if (sub.rowCount) getIO().to(`project_${sub.rows[0].project_id}`).emit("commentCreated", r.rows[0]);
    } catch (e) {}

    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

router.get("/submissions/:id/comments", authMiddleware, async (req, res, next) => {
  try {
    const submissionId = Number(req.params.id);
    const r = await query(`SELECT c.*, u.name as author_name FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.submission_id = $1 ORDER BY c.created_at ASC`, [submissionId]);
    res.json(r.rows);
  } catch (err) { next(err); }
});

router.patch("/comments/:id", authMiddleware, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { comment_text } = req.body;
    const r = await query("UPDATE comments SET comment_text=$1 WHERE id=$2 RETURNING *", [comment_text, id]);
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

router.delete("/comments/:id", authMiddleware, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await query("DELETE FROM comments WHERE id=$1", [id]);
    res.json({ message: "deleted" });
  } catch (err) { next(err); }
});

export default router;
