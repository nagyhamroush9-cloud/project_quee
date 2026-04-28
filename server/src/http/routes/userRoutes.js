import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateQuery } from "../../middlewares/validate.js";
import { patientDirectoryQuerySchema } from "../schemas.js";
import { pool } from "../../config/db.js";

export const userRoutes = Router();

// Lightweight patient directory for receptionists/doctors (used by queue UI)
userRoutes.get(
  "/patients",
  requireAuth,
  requireRole("RECEPTIONIST", "DOCTOR", "ADMIN"),
  validateQuery(patientDirectoryQuerySchema),
  async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
      const { limit, offset, q } = req.query;

      const params = [];
      const where = ["role = 'PATIENT'"];
      if (q) {
        where.push("(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)");
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }

      const [patients] = await conn.execute(
        `SELECT id, full_name, email, phone, date_of_birth, is_disabled, created_at
         FROM users
         WHERE ${where.join(" AND ")}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const [[{ total }]] = await conn.execute(
        `SELECT COUNT(*) AS total FROM users WHERE ${where.join(" AND ")}`,
        params
      );

      res.json({ patients, total });
    } catch (e) {
      next(e);
    } finally {
      conn.release();
    }
  }
);

// Update own profile
userRoutes.put(
  "/me",
  requireAuth,
  async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
      const { fullName, phone, dateOfBirth, isDisabled } = req.body;
      const userId = req.user.id;

      await conn.execute(
        `UPDATE users SET full_name = ?, phone = ?, date_of_birth = ?, is_disabled = ? WHERE id = ?`,
        [fullName, phone, dateOfBirth, isDisabled ? 1 : 0, userId]
      );

      const [rows] = await conn.execute(
        `SELECT id, full_name, email, phone, role, date_of_birth, is_disabled, created_at FROM users WHERE id = ?`,
        [userId]
      );

      res.json({ user: rows[0] });
    } catch (e) {
      next(e);
    } finally {
      conn.release();
    }
  }
);

