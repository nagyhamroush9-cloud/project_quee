import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { mockErPaySchema, mockPaySchema } from "../schemas.js";
import { withTx, pool } from "../../config/db.js";
import { PaymentRepo } from "../../repositories/paymentRepo.js";
import { AppointmentRepo } from "../../repositories/appointmentRepo.js";
import { badRequest, notFound } from "../../utils/httpError.js";

export const paymentRoutes = Router();

paymentRoutes.get("/me", requireAuth, requireRole("PATIENT"), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const payments = await PaymentRepo.listForPatient(conn, { patientId: req.user.id, limit: 1000, offset: 0 });
    res.json({ payments });
  } catch (e) {
    next(e);
  } finally {
    conn.release();
  }
});

paymentRoutes.post("/mock", requireAuth, requireRole("PATIENT"), validateBody(mockPaySchema), async (req, res, next) => {
  try {
    const { appointmentId, amountCents, currency } = req.body;
    const result = await withTx(async (conn) => {
      const appt = await AppointmentRepo.findById(conn, appointmentId);
      if (!appt) throw notFound("Appointment not found");
      if (Number(appt.patient_id) !== Number(req.user.id)) throw badRequest("Not your appointment");
      const created = await PaymentRepo.create(conn, {
        appointmentId,
        patientId: req.user.id,
        provider: "MOCK",
        amountCents,
        currency: currency ?? "USD",
        status: "PAID",
        externalRef: `MOCK-${Date.now()}`
      });
      return created;
    });
    res.json({ ok: true, paymentId: result.id });
  } catch (e) {
    next(e);
  }
});

// ER mock payment (no appointment required)
paymentRoutes.post("/mock-er", requireAuth, requireRole("PATIENT"), validateBody(mockErPaySchema), async (req, res, next) => {
  try {
    const { amountCents, currency } = req.body;
    const result = await withTx(async (conn) => {
      return PaymentRepo.create(conn, {
        appointmentId: null,
        patientId: req.user.id,
        provider: "MOCK",
        amountCents,
        currency: currency ?? "USD",
        status: "PAID",
        externalRef: `ER-MOCK-${Date.now()}`
      });
    });
    res.json({ ok: true, paymentId: result.id });
  } catch (e) {
    next(e);
  }
});

