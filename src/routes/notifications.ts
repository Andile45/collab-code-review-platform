import express from "express";
import { query } from "../config/db";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.get("/users/:id/notifications", authMiddleware, async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const r = await query("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC", [userId]);
    res.json(r.rows);
  } catch (err) { next(err); }
});

router.patch("/notifications/:id/read", authMiddleware, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const r = await query("UPDATE notifications SET is_read=true WHERE id=$1 RETURNING *", [id]);
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

export default router;
