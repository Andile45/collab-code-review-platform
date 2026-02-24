import { Request, Response, NextFunction } from "express";

/**
 * Centralized error-handling middleware.
 * Must be registered LAST with app.use() so that next(err) calls reach it.
 * Logs the full error to the console and returns a sanitized JSON response.
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error("❌ Unhandled error:", err.stack || err);

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : err.message || "Internal Server Error";

  res.status(status).json({ message });
}
