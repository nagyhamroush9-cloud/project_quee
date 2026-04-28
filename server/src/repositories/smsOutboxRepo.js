export const SmsOutboxRepo = {
  async enqueue(conn, { toPhone, template, payload }) {
    const [res] = await conn.execute(
      `INSERT INTO sms_outbox (to_phone, template, payload_json, status)
       VALUES (?, ?, ?, 'PENDING')`,
      [toPhone, template, JSON.stringify(payload ?? {})]
    );
    return { id: res.insertId };
  },

  async claimBatch(conn, { limit = 20 }) {
    // Simple claim: select pending rows. (No multi-worker locking for now.)
    const [rows] = await conn.execute(
      `SELECT id, to_phone, template, payload_json
       FROM sms_outbox
       WHERE status = 'PENDING'
       ORDER BY id ASC
       LIMIT ${Number(limit)}`,
      []
    );
    return rows;
  },

  async markSent(conn, { id }) {
    await conn.execute("UPDATE sms_outbox SET status = 'SENT', sent_at = NOW(), last_error = NULL WHERE id = ?", [id]);
  },

  async markFailed(conn, { id, error }) {
    await conn.execute("UPDATE sms_outbox SET status = 'FAILED', last_error = ? WHERE id = ?", [String(error).slice(0, 255), id]);
  }
};

