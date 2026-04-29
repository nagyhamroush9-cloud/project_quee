import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateQuery } from "../../middlewares/validate.js";
import { pool, withTx } from "../../config/db.js";
import { UserRepo } from "../../repositories/userRepo.js";
import { DoctorDepartmentRepo } from "../../repositories/doctorDepartmentRepo.js";
import { AuditRepo } from "../../repositories/auditRepo.js";
import bcrypt from "bcryptjs";
import { badRequest } from "../../utils/httpError.js";
import { analyticsQuerySchema } from "../schemas.js";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireRole("ADMIN"));

adminRoutes.get("/users", async (req, res, next) => {
  console.log("GET /admin/users called with query:", req.query);
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

adminRoutes.get("/analytics/queue", validateQuery(analyticsQuerySchema), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const days = Number(req.query.days ?? 14);
    const [rows] = await conn.execute(
      `SELECT DATE(created_at) AS day,
              COUNT(*) AS patients,
              AVG(TIMESTAMPDIFF(SECOND, created_at, called_at)) AS avgWaitToCallSeconds,
              AVG(TIMESTAMPDIFF(SECOND, called_at, served_at)) AS avgWaitToServeSeconds
       FROM queue_entries
       WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`,
      [days]
    );
    res.json({
      patientsPerDay: rows.map((row) => ({ day: row.day, count: Number(row.patients ?? 0) })),
      avgWaitToCallPerDay: rows.map((row) => ({ day: row.day, avgSeconds: Number(row.avgWaitToCallSeconds ?? 0) })),
      avgWaitToServePerDay: rows.map((row) => ({ day: row.day, avgSeconds: Number(row.avgWaitToServeSeconds ?? 0) }))
    });
  } catch (e) {
    next(e);
  } finally {
    conn.release();
  }
});

adminRoutes.post("/users", async (req, res, next) => {
  try {
    const { fullName, email, phone, password, role, departmentId, dateOfBirth, isDisabled, hasSpecialNeeds } = req.body ?? {};
    if (!fullName || !email || !password || !role) throw badRequest("Missing fields");
    if (!["ADMIN", "RECEPTIONIST", "DOCTOR", "PATIENT"].includes(role)) throw badRequest("Invalid role");
    const created = await withTx(async (conn) => {
      const existing = await UserRepo.findByEmail(conn, email);
      if (existing) throw badRequest("Email already exists");
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await UserRepo.create(conn, {
        fullName,
        email,
        phone,
        passwordHash,
        role,
        dateOfBirth: dateOfBirth ?? null,
        isDisabled: Boolean(isDisabled),
        hasSpecialNeeds: Boolean(hasSpecialNeeds),
        departmentId: departmentId ? Number(departmentId) : undefined
      });
      if (role === "DOCTOR" && departmentId) {
        await DoctorDepartmentRepo.replaceDoctorDepartments(conn, { doctorId: user.id, departmentIds: [Number(departmentId)] });
      }
      return user;
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

adminRoutes.get("/audit", async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const rows = await AuditRepo.list(conn, { limit, offset });
    res.json({ rows });
  } catch (e) {
    next(e);
  } finally {
    conn.release();
  }
});

