/**
 * Application entry point.
 * Loads environment variables, configures Express middleware & routes,
 * initializes Socket.IO, and starts the HTTP server.
 */
import dotenv from "dotenv";
dotenv.config(); // Load .env ONCE — before any other imports that use process.env

import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import projectRoutes from "./routes/projects";
import submissionRoutes from "./routes/submissions";
import commentRoutes from "./routes/comments";
import reviewRoutes from "./routes/reviews";
import notificationRoutes from "./routes/notifications";
import { errorHandler } from "./middleware/errorHandler";
import { globalLimiter } from "./middleware/rateLimiter";
import { initSocket } from "./services/socket";
import { pool, testDbConnection } from "./config/db";

// --------------- App Setup ---------------
const app = express();

// Security headers (XSS protection, clickjacking prevention, etc.)
app.use(helmet());

// Request logging — "dev" format in development, "combined" in production
const logFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(morgan(logFormat));

// CORS — restrict to configured origin in production
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: corsOrigin }));

// Body parsing with size limit to prevent abuse (default: 10kb)
app.use(express.json({ limit: "10kb" }));

// Global rate limiter — 100 requests per minute per IP
app.use(globalLimiter);

// --------------- API Routes ---------------
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api", commentRoutes);
app.use("/api", reviewRoutes);
app.use("/api", notificationRoutes);

// --------------- Health Check ---------------
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ status: "db error" });
  }
});

// --------------- Error Handler (must be last) ---------------
app.use(errorHandler);

// --------------- Start Server ---------------
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
const io = initSocket(server);

(async () => {
  await testDbConnection();
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
})();
