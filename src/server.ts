import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import projectRoutes from "./routes/projects";
import submissionRoutes from "./routes/submissions";
import commentRoutes from "./routes/comments";
import reviewRoutes from "./routes/reviews";
import notificationRoutes from "./routes/notifications";
import { errorHandler } from "./middleware/errorHandler";
import { initSocket } from "./services/socket";
import { pool, testDbConnection } from "./config/db";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api", commentRoutes);
app.use("/api", reviewRoutes);
app.use("/api", notificationRoutes);

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ status: "db error" });
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
const io = initSocket(server);

(async () => {
  await testDbConnection();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();
