import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.js";
import { callNextSchema, completeSchema, erCheckinSchema, idParamSchema, patientJoinQueueSchema, patientQueueSearchQuerySchema, queueCheckInSchema, queueWalkInSchema, triageAssignSchema } from "../schemas.js";
import { QueueService } from "../../services/queueService.js";
import { emitDepartmentQueue } from "../../realtime/emitters.js";

export const queueRoutes = Router();

queueRoutes.get("/department/:departmentId", requireAuth, validateParams(idParamSchema), async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    const result = await QueueService.getDepartmentQueue({ departmentId });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Patient can view their own queue status + estimated wait time
queueRoutes.get("/me/status", requireAuth, requireRole("PATIENT"), async (req, res, next) => {
  try {
    const result = await QueueService.searchPatientQueue({ patientId: req.user.id });
    res.json({ result: result.results?.[0] ?? null });
  } catch (e) {
    next(e);
  }
});

queueRoutes.post("/er/checkin", requireAuth, requireRole("PATIENT"), validateBody(erCheckinSchema), async (req, res, next) => {
  try {
    const { code, queueEntryId } = req.body;
    const result = await QueueService.erCheckin({ patientId: req.user.id, code, queueEntryId });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Patient creates their own ER queue ticket
queueRoutes.post("/me/join", requireAuth, requireRole("PATIENT"), validateBody(patientJoinQueueSchema), async (req, res, next) => {
  try {
    const created = await QueueService.patientJoinErQueue({ patientId: req.user.id, departmentId: req.body.departmentId });
    await emitDepartmentQueue(req.body.departmentId);
    res.json({ created });
  } catch (e) {
    next(e);
  }
});

queueRoutes.post("/er/triage", requireAuth, requireRole("RECEPTIONIST", "DOCTOR", "ADMIN"), validateBody(triageAssignSchema), async (req, res, next) => {
  try {
    const result = await QueueService.assignTriage({
      actorUserId: req.user.id,
      queueEntryId: req.body.queueEntryId,
      level: req.body.level,
      notes: req.body.notes
    });
    if (result?.departmentId) await emitDepartmentQueue(result.departmentId);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Search patient + queue status + estimated wait time (reception/admin/doctor)
queueRoutes.get(
  "/patient-search",
  requireAuth,
  requireRole("RECEPTIONIST", "ADMIN", "DOCTOR"),
  validateQuery(patientQueueSearchQuerySchema),
  async (req, res, next) => {
    try {
      const { patientId, q, limit } = req.query;
      const result = await QueueService.searchPatientQueue({ patientId, q, limit });
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

queueRoutes.post("/walkin", requireAuth, requireRole("RECEPTIONIST", "ADMIN"), validateBody(queueWalkInSchema), async (req, res, next) => {
  try {
    const created = await QueueService.addWalkIn({
      receptionistId: req.user.id,
      patientId: req.body.patientId,
      departmentId: req.body.departmentId,
      priority: req.body.priority ?? "AUTO"
    });
    await emitDepartmentQueue(req.body.departmentId);
    res.json({ created });
  } catch (e) {
    next(e);
  }
});

queueRoutes.post("/checkin", requireAuth, requireRole("RECEPTIONIST", "ADMIN"), validateBody(queueCheckInSchema), async (req, res, next) => {
  try {
    const created = await QueueService.checkInAppointment({
      receptionistId: req.user.id,
      appointmentId: req.body.appointmentId,
      priority: req.body.priority ?? "AUTO"
    });
    await emitDepartmentQueue(created.departmentId);
    res.json({ created });
  } catch (e) {
    next(e);
  }
});

queueRoutes.post("/call-next", requireAuth, requireRole("DOCTOR", "ADMIN"), validateBody(callNextSchema), async (req, res, next) => {
  try {
    const result = await QueueService.callNext({ doctorId: req.user.id, departmentId: req.body.departmentId });
    await emitDepartmentQueue(req.body.departmentId);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

queueRoutes.post("/complete", requireAuth, requireRole("DOCTOR", "ADMIN"), validateBody(completeSchema), async (req, res, next) => {
  try {
    const result = await QueueService.completeAppointment({ queueEntryId: req.body.queueEntryId });
    if (result?.departmentId) await emitDepartmentQueue(result.departmentId);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

queueRoutes.get("/department/:departmentId/metrics", requireAuth, requireRole("RECEPTIONIST", "DOCTOR", "ADMIN"), validateParams(idParamSchema), async (req, res, next) => {
  const conn = await (await import("../../config/db.js")).pool.getConnection();
  try {
    const { QueueRepo } = await import("../../repositories/queueRepo.js");
    const metrics = await QueueRepo.listDepartmentMetrics(conn, { departmentId: req.params.departmentId });
    res.json({ metrics });
  } catch (e) {
    next(e);
  } finally {
    conn.release();
  }
});

