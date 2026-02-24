import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../utils/jwt";

/**
 * Decoded JWT payload shape attached to authenticated requests.
 */
export interface JwtPayload {
  id: number;
  email: string;
  role: "Reviewer" | "Submitter";
}

/**
 * Extended Express Request that includes the authenticated user's data.
 */
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * Middleware that verifies the JWT in the Authorization header.
 * On success, attaches the decoded user payload to `req.user`.
 * Returns 401 if the token is missing or invalid.
 */
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized — no token provided" });
  }

  const token = header.replace("Bearer ", "");
  try {
    const decoded = verifyJwt<JwtPayload>(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized — invalid or expired token" });
  }
};
