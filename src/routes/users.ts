import express from "express";
import { query } from "../config/db";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const r = await query("SELECT id, name, email, role, profile_picture, created_at FROM users WHERE id=$1", [userId]);
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

export default router;
