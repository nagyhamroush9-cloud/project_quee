export const TriageRepo = {
  async create(conn, { queueEntryId, level, notes, assessedByUserId }) {
    const [res] = await conn.execute(
      `INSERT INTO triage_assessments (queue_entry_id, level, notes, assessed_by_user_id)
       VALUES (?, ?, ?, ?)`,
      [queueEntryId, level, notes ?? null, assessedByUserId]
    );
    return { id: res.insertId };
  },

  async getLatestForQueueEntry(conn, { queueEntryId }) {
    const [rows] = await conn.execute(
      `SELECT id, queue_entry_id, level, notes, assessed_by_user_id, created_at
       FROM triage_assessments
       WHERE queue_entry_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [queueEntryId]
    );
    return rows[0] ?? null;
  }
};

