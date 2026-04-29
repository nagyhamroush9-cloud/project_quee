export const MessageRepo = {
    async create(conn, { senderId, receiverId, content }) {
        const [res] = await conn.execute(
            `INSERT INTO messages (sender_id, receiver_id, content)
       VALUES (?, ?, ?)`,
            [senderId, receiverId, content]
        );
        return { id: res.insertId };
    },

    async listConversation(conn, { userId1, userId2, limit = 50, offset = 0 }) {
        const [rows] = await conn.execute(
            `SELECT m.id, m.sender_id, m.receiver_id, m.content, m.is_read, m.created_at,
              u.full_name as sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
            [userId1, userId2, userId2, userId1]
        );
        return rows.reverse(); // Reverse to show oldest first
    },

    async listForUser(conn, { userId, limit = 50, offset = 0 }) {
        const [rows] = await conn.execute(
            `SELECT m.id, m.sender_id, m.receiver_id, m.content, m.is_read, m.created_at,
              u.full_name as sender_name, ru.full_name as receiver_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       JOIN users ru ON ru.id = m.receiver_id
       WHERE m.sender_id = ? OR m.receiver_id = ?
       ORDER BY m.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
            [userId, userId]
        );
        return rows;
    },

    async markRead(conn, { userId, messageId }) {
        await conn.execute(
            "UPDATE messages SET is_read = 1 WHERE id = ? AND receiver_id = ?",
            [messageId, userId]
        );
    },

    async getUnreadCount(conn, { userId }) {
        const [rows] = await conn.execute(
            "SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0",
            [userId]
        );
        return rows[0]?.count || 0;
    }
};