import { Router } from "express";
import { validateBody } from "../../middlewares/validate.js";
import { requireAuth } from "../../middlewares/auth.js";
import { registerSchema, loginSchema } from "../schemas.js";
import { AuthService } from "../../services/authService.js";
import { pool } from "../../config/db.js";
import { UserRepo } from "../../repositories/userRepo.js";

export const authRoutes = Router();

authRoutes.post("/register", validateBody(registerSchema), async (req, res, next) => {
  try {
    const result = await AuthService.register(req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

authRoutes.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const result = await AuthService.login(req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

authRoutes.get("/me", requireAuth, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const user = await UserRepo.findById(conn, req.user.id);
    if (user && user.role === 'DOCTOR') {
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
      }
    }
    res.json({ user });
  } catch (e) {
    next(e);
  } finally {
    conn.release();
  }
});

