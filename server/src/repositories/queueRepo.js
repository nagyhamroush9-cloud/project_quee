export const QueueRepo = {
  async listByDepartment(conn, { departmentId }) {
    const [rows] = await conn.execute(
      `SELECT q.*, p.full_name AS patient_name, p.phone AS patient_phone,
              (
                SELECT t.level
                FROM triage_assessments t
                WHERE t.queue_entry_id = q.id
                ORDER BY t.created_at DESC, t.id DESC
                LIMIT 1
              ) AS triageLevel
       FROM queue_entries q
       JOIN users p ON p.id = q.patient_id
       WHERE q.department_id = ? AND q.status IN ('WAITING','CALLED')
       ORDER BY q.position ASC, q.created_at ASC`,
      [departmentId]
    );
    return rows;
  },

  async getNextTicketForDepartment(conn, { departmentId }) {
    const [rows] = await conn.execute(
      `SELECT COALESCE(MAX(ticket_number), 0) AS max_ticket
       FROM queue_entries
       WHERE department_id = ? FOR UPDATE`,
      [departmentId]
    );
    return Number(rows[0]?.max_ticket ?? 0) + 1;
  },

  async insertEntry(conn, { appointmentId, patientId, receptionistId, departmentId, priority, ticketNumber, position }) {
    const [res] = await conn.execute(
      `INSERT INTO queue_entries
       (appointment_id, patient_id, receptionist_id, department_id, priority, ticket_number, position)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [appointmentId ?? null, patientId, receptionistId ?? null, departmentId, priority, ticketNumber, position]
    );
    return { id: res.insertId };
  },

  async lockWaitingRows(conn, { departmentId }) {
    const [rows] = await conn.execute(
      `SELECT id, patient_id, appointment_id, priority, position
       FROM queue_entries
       WHERE department_id = ? AND status = 'WAITING'
       ORDER BY position ASC
       FOR UPDATE`,
      [departmentId]
    );
    return rows;
  },

  async getEntryById(conn, { id }) {
    const [rows] = await conn.execute("SELECT * FROM queue_entries WHERE id = ? LIMIT 1", [id]);
    return rows[0] ?? null;
  },

  async setCheckedIn(conn, { id }) {
    await conn.execute("UPDATE queue_entries SET checked_in_at = NOW() WHERE id = ? AND checked_in_at IS NULL", [id]);
  },

  async listDepartmentMetrics(conn, { departmentId }) {
    const [[counts]] = await conn.execute(
      `SELECT
        SUM(status='WAITING') AS waiting,
        SUM(status='CALLED') AS called,
        SUM(status='SERVED') AS served,
        SUM(status='CANCELLED') AS cancelled
       FROM queue_entries
       WHERE department_id = ? AND created_at >= CURRENT_DATE`,
      [departmentId]
    );

    const [[avgWaitToCall]] = await conn.execute(
      `SELECT AVG(TIMESTAMPDIFF(SECOND, created_at, called_at)) AS avgSeconds
       FROM queue_entries
       WHERE department_id = ? AND called_at IS NOT NULL AND created_at >= CURRENT_DATE`,
      [departmentId]
    );

    const [[avgCallToServe]] = await conn.execute(
      `SELECT AVG(TIMESTAMPDIFF(SECOND, called_at, served_at)) AS avgSeconds
       FROM queue_entries
       WHERE department_id = ? AND called_at IS NOT NULL AND served_at IS NOT NULL AND created_at >= CURRENT_DATE`,
      [departmentId]
    );

    return {
      counts,
      avgWaitToCallSeconds: Number(avgWaitToCall?.avgSeconds ?? 0),
      avgCallToServeSeconds: Number(avgCallToServe?.avgSeconds ?? 0)
    };
  },

  async updatePositions(conn, updates) {
    // updates: [{id, position}]
    for (const u of updates) {
      await conn.execute("UPDATE queue_entries SET position = ? WHERE id = ?", [u.position, u.id]);
    }
  },

  async markCalled(conn, { id }) {
    await conn.execute(
      "UPDATE queue_entries SET status = 'CALLED', called_at = NOW() WHERE id = ? AND status = 'WAITING'",
      [id]
    );
  },

  async markServed(conn, { id }) {
    await conn.execute(
      "UPDATE queue_entries SET status = 'SERVED', served_at = NOW() WHERE id = ? AND status IN ('WAITING','CALLED')",
      [id]
    );
  },

  async cancel(conn, { id }) {
    await conn.execute("UPDATE queue_entries SET status = 'CANCELLED' WHERE id = ?", [id]);
  }
};

