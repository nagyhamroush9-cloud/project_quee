export const CapacityRepo = {
  async upsert(conn, { departmentId, patientsPerHour, maxWaiting, updatedBy }) {
    await conn.execute(
      `INSERT INTO department_capacity (department_id, patients_per_hour, max_waiting, updated_by)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         patients_per_hour = VALUES(patients_per_hour),
         max_waiting = VALUES(max_waiting),
         updated_by = VALUES(updated_by)`,
      [departmentId, patientsPerHour, maxWaiting, updatedBy ?? null]
    );
  },

  async getByDepartment(conn, { departmentId }) {
    const [rows] = await conn.execute(
      `SELECT department_id, patients_per_hour, max_waiting, updated_by, updated_at
       FROM department_capacity
       WHERE department_id = ? LIMIT 1`,
      [departmentId]
    );
    return rows[0] ?? null;
  }
};

