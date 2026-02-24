import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

/**
 * Middleware factory that restricts route access to users with specific roles.
 *
 * @param roles  Array of allowed roles (e.g. ["Reviewer"])
 * @returns Express middleware that returns 403 if the user's role is not in the list
 *
 * @example
 * router.post("/approve", authMiddleware, requireRole(["Reviewer"]), handler);
 */
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ message: "Access denied — insufficient role" });
    }
    next();
  };
};
