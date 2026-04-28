export const AppointmentRepo = {
  async create(conn, { patientId, doctorId, departmentId, scheduledAt, notes }) {
    const [res] = await conn.execute(
      `INSERT INTO appointments (patient_id, doctor_id, department_id, scheduled_at, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [patientId, doctorId ?? null, departmentId, scheduledAt, notes ?? null]
    );
    return { id: res.insertId };
  },

  async findById(conn, id) {
    const [rows] = await conn.execute(
      `SELECT a.*, d.name AS department_name,
              p.full_name AS patient_name, p.phone AS patient_phone,
              doc.full_name AS doctor_name
       FROM appointments a
       JOIN departments d ON d.id = a.department_id
       JOIN users p ON p.id = a.patient_id
       LEFT JOIN users doc ON doc.id = a.doctor_id
       WHERE a.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async listForDoctorByDay(conn, { doctorId, dayStart, dayEnd }) {
    const [rows] = await conn.execute(
      `SELECT a.*, d.name AS department_name, p.full_name AS patient_name
       FROM appointments a
       JOIN departments d ON d.id = a.department_id
       JOIN users p ON p.id = a.patient_id
       WHERE a.doctor_id = ? AND a.scheduled_at >= ? AND a.scheduled_at < ?
       ORDER BY a.scheduled_at ASC`,
      [doctorId, dayStart, dayEnd]
    );
    return rows;
  },

  async listForPatient(conn, { patientId, limit = 50, offset = 0 }) {
    const [rows] = await conn.execute(
      `SELECT a.*, d.name AS department_name, doc.full_name AS doctor_name
       FROM appointments a
       JOIN departments d ON d.id = a.department_id
       LEFT JOIN users doc ON doc.id = a.doctor_id
       WHERE a.patient_id = ?
       ORDER BY a.scheduled_at DESC
       LIMIT ? OFFSET ?`,
      [patientId, parseInt(limit, 10), parseInt(offset, 10)]
    );
    return rows;
  },

  async updateStatus(conn, { id, status }) {
    await conn.execute("UPDATE appointments SET status = ? WHERE id = ?", [status, id]);
  }
};

