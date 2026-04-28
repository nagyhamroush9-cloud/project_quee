import { Server } from "socket.io";
import { env } from "../config/env.js";
import { socketAuthMiddleware } from "./socketAuth.js";

let ioRef = null;

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true }
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);

    socket.on("dept:join", ({ departmentId }) => {
      if (!departmentId) return;
      socket.join(`dept:${Number(departmentId)}`);
    });

    socket.on("dept:leave", ({ departmentId }) => {
      if (!departmentId) return;
      socket.leave(`dept:${Number(departmentId)}`);
    });

    socket.on("chat:join", ({ otherUserId }) => {
      if (!otherUserId) return;
      const roomId = [socket.user.id, otherUserId].sort().join('-');
      socket.join(`chat:${roomId}`);
    });

    socket.on("chat:leave", ({ otherUserId }) => {
      if (!otherUserId) return;
      const roomId = [socket.user.id, otherUserId].sort().join('-');
      socket.leave(`chat:${roomId}`);
    });
  });

  ioRef = io;
  return io;
}

export function getIO() {
  if (!ioRef) throw new Error("Socket.IO not initialized");
  return ioRef;
}

