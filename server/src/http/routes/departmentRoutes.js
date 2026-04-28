import { Router } from "express";
import { pool } from "../../config/db.js";
import { DepartmentRepo } from "../../repositories/departmentRepo.js";
import { requireAuth } from "../../middlewares/auth.js";
import { validateParams } from "../../middlewares/validate.js";
import { idParamSchema } from "../schemas.js";
import { DoctorDepartmentRepo } from "../../repositories/doctorDepartmentRepo.js";

export const departmentRoutes = Router();

departmentRoutes.get("/", async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const departments = await DepartmentRepo.list(conn);
    res.json({ departments });
  } catch (e) {
    next(e);
  } finally {
    conn.release();
  }
});

departmentRoutes.get("/me", requireAuth, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    if (req.user?.role === "DOCTOR") {
      const [departments] = await conn.execute(
        `SELECT d.id, d.name
         FROM doctor_departments dd
         JOIN departments d ON d.id = dd.department_id
         WHERE dd.doctor_id = ?
         ORDER BY d.name ASC`,
        [req.user.id]
      );
      if (departments.length) return res.json({ departments });
    }
    const departments = await DepartmentRepo.list(conn);
    res.json({ departments });
  } catch (e) {
    next(e);
  } finally {
    conn.release();
  }
});

departmentRoutes.get("/:departmentId/doctors", requireAuth, validateParams(idParamSchema), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const doctors = await DoctorDepartmentRepo.listDoctorsByDepartment(conn, { departmentId: req.params.departmentId });
    res.json({ doctors });
  } catch (e) {
    next(e);
  } finally {
    conn.release();
  }
});

