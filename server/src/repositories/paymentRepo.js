export const PaymentRepo = {
  async create(conn, { appointmentId, patientId, provider, amountCents, currency, status, externalRef }) {
    const [res] = await conn.execute(
      `INSERT INTO payments (appointment_id, patient_id, provider, amount_cents, currency, status, external_ref)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [appointmentId ?? null, patientId, provider, amountCents, currency, status, externalRef ?? null]
    );
    return { id: res.insertId };
  },

  async listForPatient(conn, { patientId, limit = 50, offset = 0 }) {
    const [rows] = await conn.execute(
      `SELECT p.*, a.scheduled_at
       FROM payments p
       LEFT JOIN appointments a ON a.id = p.appointment_id
       WHERE p.patient_id = ?
       ORDER BY p.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [patientId]
    );
    return rows;
  }
};

