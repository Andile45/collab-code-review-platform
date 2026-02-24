import express from "express";
import { query } from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/checkRole";

const router = express.Router();

router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const owner_id = req.user!.id;
    const r = await query("INSERT INTO projects (name,description,owner_id) VALUES ($1,$2,$3) RETURNING *", [name, description, owner_id]);
    await query("INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3)", [r.rows[0].id, owner_id, "Reviewer"]);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const r = await query("SELECT p.*, u.name as owner_name FROM projects p LEFT JOIN users u ON p.owner_id = u.id ORDER BY p.created_at DESC");
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/members", authMiddleware, requireRole(["Reviewer"]), async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const { userId, role } = req.body;
    await query("INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [projectId, userId, role || "Reviewer"]);
    res.status(201).json({ message: "member added" });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/members/:userId", authMiddleware, requireRole(["Reviewer"]), async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const userId = Number(req.params.userId);
    await query("DELETE FROM project_members WHERE project_id=$1 AND user_id=$2", [projectId, userId]);
    res.json({ message: "member removed" });
  } catch (err) {
    next(err);
  }
});

export default router;
