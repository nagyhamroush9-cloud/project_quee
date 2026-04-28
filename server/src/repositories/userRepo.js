export const UserRepo = {
  async findByEmail(conn, email) {
    const [rows] = await conn.execute("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    return rows[0] ?? null;
  },

  async findById(conn, id) {
    const [rows] = await conn.execute("SELECT id, full_name, email, phone, role, date_of_birth, is_disabled FROM users WHERE id = ? LIMIT 1", [id]);
    return rows[0] ?? null;
  },

  async create(conn, { fullName, email, phone, passwordHash, role, dateOfBirth, isDisabled }) {
    const [res] = await conn.execute(
      `INSERT INTO users (full_name, email, phone, password_hash, role, date_of_birth, is_disabled)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fullName, email, phone ?? null, passwordHash, role, dateOfBirth ?? null, isDisabled ? 1 : 0]
    );
    return { id: res.insertId };
  },

  async list(conn, { role, q, limit = 50, offset = 0 }) {
    const where = [];
    const params = [];
    if (role) {
      where.push("role = ?");
      params.push(role);
    }
    if (q) {
      where.push("(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const sql =
      `SELECT id, full_name, email, phone, role, date_of_birth, is_disabled, created_at
       FROM users
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    const [rows] = await conn.execute(sql, params);
    return rows;
  }
};

