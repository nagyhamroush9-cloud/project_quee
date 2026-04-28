import { pool } from "../config/db.js";
import { QueueRepo } from "../repositories/queueRepo.js";
import { getIO } from "./socket.js";

export async function emitDepartmentQueue(departmentId) {
  let io;
  try {
    io = getIO();
  } catch {
    // Socket server isn't initialized (e.g. during tests).
    return;
  }
  const conn = await pool.getConnection();
  try {
    const entries = await QueueRepo.listByDepartment(conn, { departmentId });
    io.to(`dept:${Number(departmentId)}`).emit("queue:update", { departmentId: Number(departmentId), entries });
  } finally {
    conn.release();
  }
}

export function emitUserNotification(userId, notification) {
  try {
    getIO().to(`user:${Number(userId)}`).emit("notification:new", notification);
  } catch {
    // ignore when socket isn't initialized
  }
}

export function emitNewMessage(senderId, receiverId, message) {
  try {
    const io = getIO();
    const roomId = [senderId, receiverId].sort().join('-');
    io.to(`chat:${roomId}`).emit("message:new", message);
    io.to(`user:${receiverId}`).emit("message:new", message);
  } catch {
    // Socket.IO might not be ready (startup) - ignore
  }
}

