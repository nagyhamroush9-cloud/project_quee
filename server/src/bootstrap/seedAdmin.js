import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { env } from "../config/env.js";

export async function seedAdmin() {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
    if (rows[0]) return;
    const passwordHash = await bcrypt.hash(env.seedAdmin.password, 12);
    await conn.execute(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES (?, ?, ?, ?, 'ADMIN')`,
      ["System Admin", env.seedAdmin.email, null, passwordHash]
    );
  } finally {
    conn.release();
  }
}

