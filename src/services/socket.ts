import { Server as HTTPServer } from "http";
import { Server as IOServer } from "socket.io";

let io: IOServer | null = null;

export function initSocket(server: HTTPServer) {
  io = new IOServer(server, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
    console.log("socket connected:", socket.id);

    socket.on("joinProject", (projectId: string) => {
      socket.join(`project_${projectId}`);
    });

    socket.on("leaveProject", (projectId: string) => {
      socket.leave(`project_${projectId}`);
    });

    socket.on("disconnect", () => {});
  });
  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
