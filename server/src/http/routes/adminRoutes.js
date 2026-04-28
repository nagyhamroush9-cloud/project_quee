import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { pool, withTx } from "../../config/db.js";
import { UserRepo } from "../../repositories/userRepo.js";
import bcrypt from "bcryptjs";
import { badRequest } from "../../utils/httpError.js";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireRole("ADMIN"));

adminRoutes.get("/users", async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const users = await UserRepo.list(conn, { role: req.query.role, q: req.query.q, limit, offset });
    const [[{ total }]] = await conn.execute(
      `SELECT COUNT(*) AS total FROM users ${req.query.role ? "WHERE role = ?" : ""}`,
      req.query.role ? [req.query.role] : []
    );
    res.json({ users, total });
  } catch (e) {
    next(e);
  } finally {
    conn.release();
  }
});

adminRoutes.post("/users", async (req, res, next) => {
  try {
    const { fullName, email, phone, password, role } = req.body ?? {};
    if (!fullName || !email || !password || !role) throw badRequest("Missing fields");
    if (!["ADMIN", "RECEPTIONIST", "DOCTOR", "PATIENT"].includes(role)) throw badRequest("Invalid role");
    const created = await withTx(async (conn) => {
      const existing = await UserRepo.findByEmail(conn, email);
      if (existing) throw badRequest("Email already exists");
      const passwordHash = await bcrypt.hash(password, 12);
      return UserRepo.create(conn, { fullName, email, phone, passwordHash, role, dateOfBirth: null, isDisabled: false });
    });
    res.json({ userId: created.id });
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/analytics", async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const [[usersByRole]] = await conn.execute(
      `SELECT
        SUM(role='ADMIN') AS admins,
        SUM(role='RECEPTIONIST') AS receptionists,
        SUM(role='DOCTOR') AS doctors,
        SUM(role='PATIENT') AS patients
      FROM users`
    );
    const [[queueStats]] = await conn.execute(
      `SELECT
        SUM(status='WAITING') AS waiting,
        SUM(status='CALLED') AS called,
        SUM(status='SERVED') AS served
      FROM queue_entries`
    );
    const [[apptStats]] = await conn.execute(
      `SELECT
        SUM(status='BOOKED') AS booked,
        SUM(status='IN_QUEUE') AS in_queue,
        SUM(status='COMPLETED') AS completed
      FROM appointments`
    );
    res.json({ usersByRole, queueStats, apptStats });
  } catch (e) {
    next(e);
  } finally {
    conn.release();
  }
});

