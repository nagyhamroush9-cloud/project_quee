import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validateParams } from "../../middlewares/validate.js";
import { pool } from "../../config/db.js";
import { NotificationRepo } from "../../repositories/notificationRepo.js";
import { numericIdParamSchema } from "../schemas.js";

export const notificationRoutes = Router();

notificationRoutes.get("/me", requireAuth, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const notifications = await NotificationRepo.listForUser(conn, { userId: req.user.id, limit: 1000, offset: 0 });
    res.json({ notifications });
  } catch (e) {
    next(e);
  } finally {
    conn.release();
  }
});

notificationRoutes.post("/:id/read", requireAuth, validateParams(numericIdParamSchema), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await NotificationRepo.markRead(conn, { userId: req.user.id, id: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  } finally {
    conn.release();
  }
});

