import express from "express";
import { query } from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/checkRole";
import { getIO } from "../services/socket";

const router = express.Router();

router.post("/", authMiddleware, requireRole(["Submitter","Reviewer"]), async (req, res, next) => {
  try {
    const { project_id, title, content } = req.body;
    const user_id = req.user!.id;
    const r = await query("INSERT INTO submissions (project_id, user_id, title, content) VALUES($1,$2,$3,$4) RETURNING *", [project_id, user_id, title, content]);

    try { getIO().to(`project_${project_id}`).emit("submissionCreated", r.rows[0]); } catch (e) {}

    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

router.get("/project/:id", authMiddleware, async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const r = await query(`SELECT s.*, u.name as author_name FROM submissions s LEFT JOIN users u ON s.user_id = u.id WHERE s.project_id = $1 ORDER BY s.created_at DESC`, [projectId]);
    res.json(r.rows);
  } catch (err) { next(err); }
});

router.patch("/:id/status", authMiddleware, requireRole(["Reviewer"]), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const allowed = ["pending", "in_review", "approved", "changes_requested"];
    if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status" });
    const r = await query("UPDATE submissions SET status=$1, updated_at=now() WHERE id=$2 RETURNING *", [status, id]);
    try { getIO().to(`project_${r.rows[0].project_id}`).emit("submissionUpdated", r.rows[0]); } catch(e){}
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

router.delete("/:id", authMiddleware, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    // only owner or submitter may delete — simple check
    await query("DELETE FROM submissions WHERE id=$1", [id]);
    res.json({ message: "deleted" });
  } catch (err) { next(err); }
});

export default router;
