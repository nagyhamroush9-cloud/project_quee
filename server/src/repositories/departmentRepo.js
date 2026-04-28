export const DepartmentRepo = {
  async list(conn) {
    const [rows] = await conn.execute("SELECT id, name FROM departments ORDER BY name ASC");
    return rows;
  },

  async findById(conn, id) {
    const [rows] = await conn.execute("SELECT id, name FROM departments WHERE id = ? LIMIT 1", [id]);
    return rows[0] ?? null;
  }
};

