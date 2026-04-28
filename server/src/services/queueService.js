import { withTx, pool } from "../config/db.js";
import { QueueRepo } from "../repositories/queueRepo.js";
import { DepartmentRepo } from "../repositories/departmentRepo.js";
import { UserRepo } from "../repositories/userRepo.js";
import { NotificationRepo } from "../repositories/notificationRepo.js";
import { AppointmentRepo } from "../repositories/appointmentRepo.js";
import { badRequest, notFound } from "../utils/httpError.js";
import { TriageRepo } from "../repositories/triageRepo.js";
import { CapacityRepo } from "../repositories/capacityRepo.js";
import { SmsService } from "./smsService.js";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AuditService } from "./auditService.js";

const PRIORITY_RANK = {
  EMERGENCY: 1,
  ELDERLY: 2,
  DISABLED: 3,
  NORMAL: 4
};

const TRIAGE_RANK = {
  CRITICAL: 1,
  HIGH: 2,
  MED: 3,
  LOW: 4,
  NON_URGENT: 5
};

function triageWeight(level) {
  const map = { CRITICAL: 0.4, HIGH: 0.6, MED: 1, LOW: 1.2, NON_URGENT: 1.4 };
  return map[level] ?? 1;
}

function signCheckinCode(queueEntryId) {
  // short-lived token for QR/SMS links
  return jwt.sign({ qe: queueEntryId }, env.jwt.secret, { expiresIn: "12h" });
}

function computeAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

async function inferPriority(conn, { patientId, requestedPriority }) {
  if (requestedPriority && requestedPriority !== "AUTO") return requestedPriority;
  const patient = await UserRepo.findById(conn, patientId);
  if (!patient) throw notFound("Patient not found");
  const age = computeAge(patient.date_of_birth);
  if (patient.has_special_needs) return "EMERGENCY";
  if (patient.is_disabled) return "DISABLED";
  if (age !== null && age >= 65) return "ELDERLY";
  return "NORMAL";
}

async function reorderWaitingQueue(conn, { departmentId }) {
  const waiting = await QueueRepo.lockWaitingRows(conn, { departmentId });
  const triageById = new Map();
  for (const row of waiting) {
    const latest = await TriageRepo.getLatestForQueueEntry(conn, { queueEntryId: row.id });
    if (latest?.level) triageById.set(row.id, latest.level);
  }
  // stable sort: by priority rank, then current position (arrival order)
  const sorted = [...waiting].sort((a, b) => {
    const ta = TRIAGE_RANK[triageById.get(a.id)] ?? 999;
    const tb = TRIAGE_RANK[triageById.get(b.id)] ?? 999;
    if (ta !== tb) return ta - tb;
    const pa = PRIORITY_RANK[a.priority] ?? 999;
    const pb = PRIORITY_RANK[b.priority] ?? 999;
    if (pa !== pb) return pa - pb;
    return a.position - b.position;
  });
  const updates = sorted.map((row, idx) => ({ id: row.id, position: idx + 1 }));
  await QueueRepo.updatePositions(conn, updates);
}

export const QueueService = {
  async getDepartmentQueue({ departmentId }) {
    const conn = await pool.getConnection();
    try {
      const dept = await DepartmentRepo.findById(conn, departmentId);
      if (!dept) throw notFound("Department not found");
      const entries = await QueueRepo.listByDepartment(conn, { departmentId });
      return { department: dept, entries };
    } finally {
      conn.release();
    }
  },

  async addWalkIn({ receptionistId, patientId, departmentId, priority }) {
    return withTx(async (conn) => {
      const dept = await DepartmentRepo.findById(conn, departmentId);
      if (!dept) throw notFound("Department not found");

      const finalPriority = await inferPriority(conn, { patientId, requestedPriority: priority });

      // Lock queue rows for department to avoid ticket/position races
      const ticketNumber = await QueueRepo.getNextTicketForDepartment(conn, { departmentId });

      const waiting = await QueueRepo.lockWaitingRows(conn, { departmentId });
      const position = waiting.length + 1;

      const created = await QueueRepo.insertEntry(conn, {
        appointmentId: null,
        patientId,
        receptionistId,
        departmentId,
        priority: finalPriority === "AUTO" ? "NORMAL" : finalPriority,
        ticketNumber,
        position
      });

      await reorderWaitingQueue(conn, { departmentId });

      await AuditService.log({
        actorUserId: receptionistId,
        action: "QUEUE_WALKIN_CREATE",
        entityType: "queue_entry",
        entityId: created.id,
        before: null,
        after: { patientId, departmentId, ticketNumber }
      });

      const checkinCode = signCheckinCode(created.id);
      await NotificationRepo.create(conn, {
        userId: patientId,
        channel: "IN_APP",
        title: "Queue ticket created",
        body: `Your ticket #${ticketNumber} for ${dept.name} has been created.`
      });
      await NotificationRepo.create(conn, {
        userId: patientId,
        channel: "SMS",
        title: "SMS",
        body: `HQMS ER: Ticket #${ticketNumber} for ${dept.name}. Check-in code: ${checkinCode}`
      });

      // Real SMS outbox (provider integration handled by worker)
      const patient = await UserRepo.findById(conn, patientId);
      if (patient?.phone) {
        await SmsService.enqueue({
          toPhone: patient.phone,
          template: "ER_TICKET",
          payload: { ticketNumber, department: dept.name, checkinCode }
        });
      }

      return { id: created.id, ticketNumber, priority: finalPriority, department: dept, checkinCode };
    });
  },

  async patientJoinErQueue({ patientId, departmentId }) {
    return withTx(async (conn) => {
      const dept = await DepartmentRepo.findById(conn, departmentId);
      if (!dept) throw notFound("Department not found");

      // Enforce one active queue entry
      const [[existing]] = await conn.execute(
        `SELECT id FROM queue_entries
         WHERE patient_id = ? AND status IN ('WAITING','CALLED')
         ORDER BY created_at DESC
         LIMIT 1`,
        [patientId]
      );
      if (existing?.id) throw badRequest("You are already in queue");

      const finalPriority = await inferPriority(conn, { patientId, requestedPriority: "AUTO" });
      const ticketNumber = await QueueRepo.getNextTicketForDepartment(conn, { departmentId });
      const waiting = await QueueRepo.lockWaitingRows(conn, { departmentId });
      const position = waiting.length + 1;

      const created = await QueueRepo.insertEntry(conn, {
        appointmentId: null,
        patientId,
        receptionistId: null,
        departmentId,
        priority: finalPriority === "AUTO" ? "NORMAL" : finalPriority,
        ticketNumber,
        position
      });

      await reorderWaitingQueue(conn, { departmentId });

      const checkinCode = signCheckinCode(created.id);
      await NotificationRepo.create(conn, {
        userId: patientId,
        channel: "IN_APP",
        title: "ER ticket created",
        body: `Your ER ticket #${ticketNumber} for ${dept.name} has been created.`
      });

      const patient = await UserRepo.findById(conn, patientId);
      if (patient?.phone) {
        await SmsService.enqueue({
          toPhone: patient.phone,
          template: "ER_TICKET",
          payload: { ticketNumber, department: dept.name, checkinCode }
        });
      }

      return { id: created.id, ticketNumber, department: dept, checkinCode };
    });
  },

  async checkInAppointment({ receptionistId, appointmentId, priority }) {
    return withTx(async (conn) => {
      const appt = await AppointmentRepo.findById(conn, appointmentId);
      if (!appt) throw notFound("Appointment not found");
      if (appt.status === "CANCELLED" || appt.status === "COMPLETED") throw badRequest("Appointment not eligible");

      const finalPriority = await inferPriority(conn, { patientId: appt.patient_id, requestedPriority: priority });

      const ticketNumber = await QueueRepo.getNextTicketForDepartment(conn, { departmentId: appt.department_id });
      const waiting = await QueueRepo.lockWaitingRows(conn, { departmentId: appt.department_id });
      const position = waiting.length + 1;

      const created = await QueueRepo.insertEntry(conn, {
        appointmentId: appt.id,
        patientId: appt.patient_id,
        receptionistId,
        departmentId: appt.department_id,
        priority: finalPriority,
        ticketNumber,
        position
      });

      await AppointmentRepo.updateStatus(conn, { id: appt.id, status: "IN_QUEUE" });
      await reorderWaitingQueue(conn, { departmentId: appt.department_id });

      await NotificationRepo.create(conn, {
        userId: appt.patient_id,
        channel: "IN_APP",
        title: "Checked in",
        body: `You are now in queue for ${appt.department_name}. Ticket #${ticketNumber}.`
      });

      return { id: created.id, ticketNumber, priority: finalPriority, departmentId: appt.department_id };
    });
  },

  async callNext({ doctorId, departmentId }) {
    return withTx(async (conn) => {
      // Lock waiting rows and pick first after reorder
      await reorderWaitingQueue(conn, { departmentId });
      const waiting = await QueueRepo.lockWaitingRows(conn, { departmentId });
      if (waiting.length === 0) throw badRequest("No waiting patients");
      const next = waiting[0];
      await QueueRepo.markCalled(conn, { id: next.id });

      await AuditService.log({
        actorUserId: doctorId,
        action: "QUEUE_CALL_NEXT",
        entityType: "queue_entry",
        entityId: next.id,
        before: { status: "WAITING" },
        after: { status: "CALLED" }
      });

      const dept = await DepartmentRepo.findById(conn, departmentId);
      await NotificationRepo.create(conn, {
        userId: next.patient_id,
        channel: "IN_APP",
        title: "You are being called",
        body: `Please proceed to the doctor. Department: ${dept?.name ?? departmentId}.`
      });

      const patient = await UserRepo.findById(conn, next.patient_id);
      if (patient?.phone) {
        await SmsService.enqueue({
          toPhone: patient.phone,
          template: "ER_CALLED",
          payload: { department: dept?.name ?? String(departmentId), queueEntryId: next.id }
        });
      }

      return { queueEntryId: next.id };
    });
  },

  async erCheckin({ patientId, code, queueEntryId }) {
    return withTx(async (conn) => {
      let qeId = queueEntryId ?? null;
      if (!qeId && code) {
        try {
          const payload = jwt.verify(code, env.jwt.secret);
          qeId = Number(payload?.qe);
        } catch {
          throw badRequest("Invalid check-in code");
        }
      }
      if (!qeId) throw badRequest("Missing queue entry");
      const entry = await QueueRepo.getEntryById(conn, { id: qeId });
      if (!entry) throw notFound("Queue entry not found");
      if (Number(entry.patient_id) !== Number(patientId)) throw badRequest("Not your queue entry");
      if (!["WAITING", "CALLED"].includes(entry.status)) throw badRequest("Not eligible for check-in");

      // If already called, require check-in within 10 minutes
      if (entry.status === "CALLED" && entry.called_at) {
        const [[row]] = await conn.execute(
          "SELECT TIMESTAMPDIFF(MINUTE, called_at, NOW()) AS mins FROM queue_entries WHERE id = ?",
          [qeId]
        );
        if (Number(row?.mins ?? 0) > 10) throw badRequest("Check-in window expired");
      }

      await QueueRepo.setCheckedIn(conn, { id: qeId });
      await AuditService.log({
        actorUserId: patientId,
        action: "ER_CHECKIN",
        entityType: "queue_entry",
        entityId: qeId,
        before: null,
        after: { checkedIn: true }
      });
      return { ok: true };
    });
  },

  async assignTriage({ actorUserId, queueEntryId, level, notes }) {
    return withTx(async (conn) => {
      const entry = await QueueRepo.getEntryById(conn, { id: queueEntryId });
      if (!entry) throw notFound("Queue entry not found");
      if (entry.status !== "WAITING") throw badRequest("Can only triage WAITING entries");
      await TriageRepo.create(conn, { queueEntryId, level, notes, assessedByUserId: actorUserId });
      await AuditService.log({
        actorUserId,
        action: "ER_TRIAGE_ASSIGN",
        entityType: "queue_entry",
        entityId: queueEntryId,
        before: null,
        after: { triageLevel: level }
      });
      await reorderWaitingQueue(conn, { departmentId: entry.department_id });
      return { ok: true, departmentId: entry.department_id };
    });
  },

  async completeAppointment({ queueEntryId }) {
    return withTx(async (conn) => {
      await QueueRepo.markServed(conn, { id: queueEntryId });
      const [rows] = await conn.execute("SELECT appointment_id, department_id FROM queue_entries WHERE id = ? LIMIT 1", [queueEntryId]);
      const apptId = rows[0]?.appointment_id ?? null;
      const departmentId = rows[0]?.department_id ?? null;
      if (apptId) {
        await AppointmentRepo.updateStatus(conn, { id: apptId, status: "COMPLETED" });
      }
      await AuditService.log({
        actorUserId: null,
        action: "QUEUE_COMPLETE",
        entityType: "queue_entry",
        entityId: queueEntryId,
        before: null,
        after: { status: "SERVED" }
      });
      return { ok: true, departmentId };
    });
  },

  async searchPatientQueue({ patientId, q, limit = 10 }) {
    const conn = await pool.getConnection();
    try {
      let patients = [];
      if (patientId) {
        const p = await UserRepo.findById(conn, patientId);
        if (!p || p.role !== "PATIENT") throw notFound("Patient not found");
        patients = [p];
      } else if (q) {
        patients = await UserRepo.searchPatients(conn, { q, limit });
      } else {
        throw badRequest("Provide patientId or q");
      }

      const results = [];
      for (const p of patients) {
        const [queueRows] = await conn.execute(
          `SELECT q.*, d.name AS department_name
           FROM queue_entries q
           JOIN departments d ON d.id = q.department_id
           WHERE q.patient_id = ? AND q.status IN ('WAITING','CALLED')
           ORDER BY q.created_at DESC
           LIMIT 1`,
          [p.id]
        );
        const entry = queueRows[0] ?? null;
        if (!entry) {
          results.push({ patient: p, inQueue: false });
          continue;
        }

        const latestTriage = await TriageRepo.getLatestForQueueEntry(conn, { queueEntryId: entry.id });
        const triageLevel = latestTriage?.level ?? "MED";

        let positionAhead = 0;
        if (entry.status === "WAITING") {
          const [[{ ahead }]] = await conn.execute(
            `SELECT COUNT(*) AS ahead
             FROM queue_entries
             WHERE department_id = ? AND status = 'WAITING' AND position < ?`,
            [entry.department_id, entry.position]
          );
          positionAhead = Number(ahead ?? 0);
        }

        const cap = await CapacityRepo.getByDepartment(conn, { departmentId: entry.department_id });
        const capacitySeconds = cap?.patients_per_hour ? Math.round(3600 / Number(cap.patients_per_hour)) : 0;

        const [[avgService]] = await conn.execute(
          `SELECT AVG(TIMESTAMPDIFF(SECOND, called_at, served_at)) AS avgSeconds
           FROM queue_entries
           WHERE department_id = ?
             AND called_at IS NOT NULL
             AND served_at IS NOT NULL
             AND served_at >= (NOW() - INTERVAL 30 DAY)`,
          [entry.department_id]
        );
        const avgSeconds = Number(avgService?.avgSeconds ?? 0);
        const defaultAvgSeconds = 10 * 60;
        const baseSeconds = avgSeconds > 0 ? avgSeconds : defaultAvgSeconds;
        const perPatientSeconds = (capacitySeconds > 0 ? capacitySeconds : baseSeconds) * triageWeight(triageLevel);

        const estimatedWaitSeconds =
          entry.status === "WAITING" ? Math.max(0, positionAhead * perPatientSeconds) : 0;

        results.push({
          patient: p,
          inQueue: true,
          queue: {
            id: entry.id,
            departmentId: entry.department_id,
            departmentName: entry.department_name,
            status: entry.status,
            ticketNumber: entry.ticket_number,
            position: entry.position,
            priority: entry.priority,
            triageLevel,
            checkedInAt: entry.checked_in_at ?? null,
            createdAt: entry.created_at,
            calledAt: entry.called_at
          },
          stats: {
            positionAhead,
            avgServiceMinutes: Math.round(perPatientSeconds / 60),
            estimatedWaitMinutes: Math.round(estimatedWaitSeconds / 60)
          }
        });
      }

      return { results };
    } finally {
      conn.release();
    }
  }
};

