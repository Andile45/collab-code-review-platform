import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { query } from "../config/db";

/**
 * Middleware that verifies the authenticated user is a member of the project.
 * The project ID is extracted from `req.params.projectId` or `req.params.id`.
 *
 * Returns 403 if the user is not a member of the project.
 *
 * @example
 * router.get("/:id/submissions", authMiddleware, requireProjectMember, handler);
 */
export const requireProjectMember = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const projectId = Number(req.params.projectId || req.params.id);
        const userId = req.user!.id;

        if (isNaN(projectId)) {
            return res.status(400).json({ message: "Invalid project ID" });
        }

        const result = await query(
            "SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2",
            [projectId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(403).json({ message: "You are not a member of this project" });
        }

        // Attach the user's project-level role for downstream middleware/handlers
        (req as any).projectRole = result.rows[0].role;
        next();
    } catch (err) {
        next(err);
    }
};

/**
 * Middleware factory that checks the user's project-level role (from project_members table).
 * Must be used AFTER requireProjectMember, which attaches `req.projectRole`.
 *
 * This is different from `requireRole()` which checks the global JWT role.
 * This checks the per-project role from the project_members table.
 *
 * @param roles  Array of allowed project-level roles (e.g. ["Reviewer"])
 *
 * @example
 * router.post(
 *   "/:id/approve",
 *   authMiddleware,
 *   requireProjectMember,
 *   requireProjectRole(["Reviewer"]),
 *   handler
 * );
 */
export const requireProjectRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const projectRole = (req as any).projectRole;

        if (!projectRole || !roles.includes(projectRole)) {
            return res.status(403).json({
                message: `Access denied — requires project-level role: ${roles.join(" or ")}`,
            });
        }
        next();
    };
};
