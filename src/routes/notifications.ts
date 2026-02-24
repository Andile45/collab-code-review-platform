import express from "express";
import { query } from "../config/db";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = express.Router();

/**
 * GET /api/users/:id/notifications
 * Returns all notifications for the authenticated user.
 * Users can only access their OWN notifications.
 */
router.get("/users/:id/notifications", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const requestedUserId = Number(req.params.id);
    const authenticatedUserId = req.user!.id;

    // Ownership check — users can only view their own notifications
    if (requestedUserId !== authenticatedUserId) {
      return res.status(403).json({ message: "You can only view your own notifications" });
    }

    const r = await query(
      "SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC",
      [requestedUserId]
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Marks a notification as read. Users can only mark their OWN notifications.
 */
router.patch("/notifications/:id/read", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const notificationId = Number(req.params.id);
    const userId = req.user!.id;

    // Ownership check — ensure the notification belongs to the authenticated user
    const existing = await query("SELECT user_id FROM notifications WHERE id=$1", [notificationId]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }
    if (existing.rows[0].user_id !== userId) {
      return res.status(403).json({ message: "You can only update your own notifications" });
    }

    const r = await query(
      "UPDATE notifications SET is_read=true WHERE id=$1 RETURNING *",
      [notificationId]
    );
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
