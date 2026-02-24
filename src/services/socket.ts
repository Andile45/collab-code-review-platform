import { Server as HTTPServer } from "http";
import { Server as IOServer } from "socket.io";

let io: IOServer | null = null;

/**
 * Initialize the Socket.IO server attached to the HTTP server.
 * CORS origin is read from the CORS_ORIGIN env var (defaults to localhost:3000).
 *
 * Clients can join/leave project rooms to receive real-time events
 * such as submissionCreated, submissionApproved, commentCreated, etc.
 */
export function initSocket(server: HTTPServer): IOServer {
  const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";

  io = new IOServer(server, {
    cors: { origin: corsOrigin },
  });

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    socket.on("joinProject", (projectId: string) => {
      socket.join(`project_${projectId}`);
      console.log(`Socket ${socket.id} joined project_${projectId}`);
    });

    socket.on("leaveProject", (projectId: string) => {
      socket.leave(`project_${projectId}`);
      console.log(`Socket ${socket.id} left project_${projectId}`);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected:", socket.id);
    });
  });

  return io;
}

/**
 * Get the initialized Socket.IO server instance.
 * Throws if called before initSocket().
 */
export function getIO(): IOServer {
  if (!io) throw new Error("Socket.io not initialized — call initSocket() first");
  return io;
}

/**
 * Safely emit an event to a project room.
 * Logs errors instead of silently swallowing them.
 *
 * @param projectId  The project ID whose room to emit to
 * @param event      The event name (e.g. "submissionCreated")
 * @param data       The payload to send
 */
export function emitToProject(projectId: number | string, event: string, data: any): void {
  try {
    getIO().to(`project_${projectId}`).emit(event, data);
  } catch (error) {
    console.error(`⚠️ Failed to emit "${event}" to project_${projectId}:`, error);
  }
}
