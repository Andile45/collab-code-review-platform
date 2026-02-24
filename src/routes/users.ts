import express from "express";
import { query } from "../config/db";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = express.Router();

/**
 * GET /api/users/me
 * Returns the profile of the currently authenticated user.
 */
router.get("/me", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const r = await query(
      "SELECT id, name, email, role, profile_picture, created_at FROM users WHERE id=$1",
      [userId]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
