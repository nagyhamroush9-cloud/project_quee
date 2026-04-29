export const UserRepo = {
  async findByEmail(conn, email) {
    const [rows] = await conn.execute("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    return rows[0] ?? null;
  },

  async findById(conn, id) {
    try {
      const [rows] = await conn.execute(
        `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.date_of_birth, u.is_disabled, u.has_special_needs,
                u.department_id, d.name AS department_name
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE u.id = ? LIMIT 1`,
        [id]
      );
      const user = rows[0] ?? null;
      if (!user) return null;
      if (user.department_id) {
        user.department = { id: user.department_id, name: user.department_name };
      } else if (user.role === "DOCTOR") {
        const [departments] = await conn.execute(
          `SELECT d.id, d.name
           FROM doctor_departments dd
           JOIN departments d ON d.id = dd.department_id
           WHERE dd.doctor_id = ?
           ORDER BY d.name ASC
           LIMIT 1`,
          [user.id]
        );
        if (departments.length) {
          user.department = departments[0];
          user.department_id = departments[0].id;
          user.department_name = departments[0].name;
        }
      }
      return user;
    } catch (err) {
      if (String(err?.message).includes("Unknown column") || String(err?.message).includes("ER_BAD_FIELD_ERROR")) {
        const [rows] = await conn.execute(
          "SELECT id, full_name, email, phone, role, date_of_birth, is_disabled, has_special_needs FROM users WHERE id = ? LIMIT 1",
          [id]
        );
        return rows[0] ?? null;
      }
      throw err;
    }
  },

  async create(conn, { fullName, email, phone, passwordHash, role, dateOfBirth, isDisabled, hasSpecialNeeds, departmentId }) {
    const [res] = await conn.execute(
      `INSERT INTO users (full_name, email, phone, password_hash, role, date_of_birth, is_disabled, has_special_needs, department_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName,
        email,
        phone ?? null,
        passwordHash,
        role,
        dateOfBirth ?? null,
        isDisabled ? 1 : 0,
        hasSpecialNeeds ? 1 : 0,
        departmentId ?? null
      ]
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
    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    const sql =
      `SELECT id, full_name, email, phone, role, date_of_birth, is_disabled, created_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`;
    const [rows] = await conn.execute(sql, params);
    return rows;
  }
};

