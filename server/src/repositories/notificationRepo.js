import { emitUserNotification } from "../realtime/emitters.js";

export const NotificationRepo = {
  async create(conn, { userId, channel, title, body }) {
    const [res] = await conn.execute(
      `INSERT INTO notifications (user_id, channel, title, body)
       VALUES (?, ?, ?, ?)`,
      [userId, channel, title, body]
    );
    const notification = {
      id: res.insertId,
      user_id: userId,
      channel,
      title,
      body,
      is_read: 0,
      created_at: new Date().toISOString()
    };
    try {
      emitUserNotification(userId, notification);
    } catch {
      // Socket.IO might not be ready (startup) - ignore
    }
    return { id: res.insertId };
  },

  async listForUser(conn, { userId, limit = 50, offset = 0 }) {
    const [rows] = await conn.execute(
      `SELECT id, channel, title, body, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [userId]
    );
    return rows;
  },

  async markRead(conn, { userId, id }) {
    await conn.execute("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [id, userId]);
  }
};

