export const AuditRepo = {
  async add(conn, { actorUserId, action, entityType, entityId, before, after }) {
    await conn.execute(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        actorUserId ?? null,
        action,
        entityType,
        entityId ?? null,
        before ? JSON.stringify(before) : null,
        after ? JSON.stringify(after) : null
      ]
    );
  },

  async list(conn, { limit = 100, offset = 0 }) {
    const [rows] = await conn.execute(
      `SELECT id, actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at
       FROM audit_log
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit, 10), parseInt(offset, 10)]
    );
    return rows;
  }
};

