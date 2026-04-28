import { pool, withTx } from "../config/db.js";
import { SmsOutboxRepo } from "../repositories/smsOutboxRepo.js";

export const SmsService = {
  async enqueue({ toPhone, template, payload }) {
    return withTx(async (conn) => {
      return SmsOutboxRepo.enqueue(conn, { toPhone, template, payload });
    });
  },

  async processOutboxOnce({ limit = 10 } = {}) {
    const conn = await pool.getConnection();
    try {
      const batch = await SmsOutboxRepo.claimBatch(conn, { limit });
      for (const row of batch) {
        try {
          // Provider integration placeholder:
          // In production: call Twilio/Vonage/etc using row.to_phone + rendered content.
          await SmsOutboxRepo.markSent(conn, { id: row.id });
        } catch (e) {
          await SmsOutboxRepo.markFailed(conn, { id: row.id, error: e?.message || "send_failed" });
        }
      }
      return { processed: batch.length };
    } finally {
      conn.release();
    }
  }
};

