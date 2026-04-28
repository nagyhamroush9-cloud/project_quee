import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody, validateParams } from "../../middlewares/validate.js";
import { createAppointmentSchema, bookAppointmentSchema, numericIdParamSchema } from "../schemas.js";
import { withTx, pool } from "../../config/db.js";
import { SmsService } from "../../services/smsService.js";
import { badRequest, notFound } from "../../utils/httpError.js";
import { DoctorDepartmentRepo } from "../../repositories/doctorDepartmentRepo.js";
import { CapacityRepo } from "../../repositories/capacityRepo.js";
import { AppointmentRepo } from "../../repositories/appointmentRepo.js";

export const appointmentRoutes = Router();

appointmentRoutes.post("/", requireAuth, requireRole("PATIENT"), validateBody(createAppointmentSchema), async (req, res, next) => {
  try {
    const { departmentId, doctorId, scheduledAt, notes } = req.body;
    const created = await withTx(async (conn) => {
      if (doctorId) {
        const docs = await DoctorDepartmentRepo.listDoctorsByDepartment(conn, { departmentId });
        const ok = docs.some((d) => Number(d.id) === Number(doctorId));
        if (!ok) throw badRequest("Doctor is not available for this department");
      }
      return AppointmentRepo.create(conn, {
        patientId: req.user.id,
        doctorId: doctorId ?? null,
        departmentId,
        scheduledAt,
        notes
      });
    });
    res.json({ appointmentId: created.id });
  } catch (e) {
    next(e);
  }
});

// Auto-book appointment for new patients
appointmentRoutes.post("/book", requireAuth, requireRole("PATIENT"), validateBody(bookAppointmentSchema), async (req, res, next) => {
  try {
    const { departmentId, notes } = req.body;
    const created = await withTx(async (conn) => {
      // Get capacity for department
      const capacity = await CapacityRepo.get(conn, { departmentId });
      const patientsPerHour = capacity?.patients_per_hour ?? 12;
      const avgMinutes = 60 / patientsPerHour;

      // Find next available slot (simple: next hour)
      const now = new Date();
      const nextSlot = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      nextSlot.setMinutes(0, 0, 0); // Round to hour

      return AppointmentRepo.create(conn, {
        patientId: req.user.id,
        doctorId: null,
        departmentId,
        scheduledAt: nextSlot,
        notes: notes || "Auto-booked via registration"
      });
    });

    // Send SMS notification
    const conn = await pool.getConnection();
    try {
      const [user] = await conn.execute("SELECT full_name, phone FROM users WHERE id = ?", [req.user.id]);
      const [department] = await conn.execute("SELECT name FROM departments WHERE id = ?", [departmentId]);
      if (user.length && department.length && user[0].phone) {
        await SmsService.enqueue({
          toPhone: user[0].phone,
          template: "appointment_booked",
          payload: {
            patientName: user[0].full_name,
            departmentName: department[0].name,
            scheduledAt: created.scheduled_at.toLocaleString("ar-EG", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })
          }
        });
      }

      // Notify doctors in the department
      const [doctors] = await conn.execute(
        "SELECT u.phone FROM users u JOIN doctor_departments dd ON u.id = dd.doctor_id WHERE dd.department_id = ? AND u.role = 'DOCTOR'",
        [departmentId]
      );
      for (const doctor of doctors) {
        if (doctor.phone) {
          await SmsService.enqueue({
            toPhone: doctor.phone,
            template: "new_appointment",
            payload: {
              patientName: user[0].full_name,
              departmentName: department[0].name,
              scheduledAt: created.scheduled_at.toLocaleString("ar-EG", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })
            }
          });
        }
      }
    } finally {
      conn.release();
    }

    res.json({ appointmentId: created.id, scheduledAt: created.scheduled_at });
  } catch (e) {
    next(e);
  }
});

appointmentRoutes.get("/me", requireAuth, requireRole("PATIENT"), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const appointments = await AppointmentRepo.listForPatient(conn, { patientId: req.user.id, limit: 1000, offset: 0 });
    res.json({ appointments });
  } catch (e) {
    next(e);
  } finally {
    conn.release();
  }
});

appointmentRoutes.get("/doctor/today", requireAuth, requireRole("DOCTOR"), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const [appointments] = await conn.execute(
      `SELECT a.id, a.scheduled_at, a.status, a.notes, u.full_name AS patient_name, d.name AS department_name
       FROM appointments a
       JOIN users u ON a.patient_id = u.id
       JOIN departments d ON a.department_id = d.id
       JOIN doctor_departments dd ON d.id = dd.department_id
       WHERE dd.doctor_id = ? AND a.scheduled_at >= ? AND a.scheduled_at < ?
       ORDER BY a.scheduled_at ASC`,
      [req.user.id, startOfDay, endOfDay]
    );
    res.json({ appointments });
  } catch (e) {
    next(e);
  } finally {
    conn.release();
  }
});

appointmentRoutes.get("/:id", requireAuth, validateParams(numericIdParamSchema), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const appt = await AppointmentRepo.findById(conn, req.params.id);
    if (!appt) throw notFound("Appointment not found");
    res.json({ appointment: appt });
  } catch (e) {
    next(e);
  } finally {
    conn.release();
  }
});

