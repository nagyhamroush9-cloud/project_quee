export const DoctorDepartmentRepo = {
  async listDoctorsByDepartment(conn, { departmentId }) {
    const [rows] = await conn.execute(
      `SELECT u.id, u.full_name, u.email, u.phone
       FROM doctor_departments dd
       JOIN users u ON u.id = dd.doctor_id
       WHERE dd.department_id = ? AND u.role = 'DOCTOR' AND u.is_disabled = 0
       ORDER BY u.full_name ASC`,
      [departmentId]
    );
    return rows;
  },

  async replaceDoctorDepartments(conn, { doctorId, departmentIds }) {
    await conn.execute("DELETE FROM doctor_departments WHERE doctor_id = ?", [doctorId]);
    for (const depId of departmentIds) {
      await conn.execute(
        "INSERT IGNORE INTO doctor_departments (doctor_id, department_id) VALUES (?, ?)",
        [doctorId, depId]
      );
    }
  }
};

