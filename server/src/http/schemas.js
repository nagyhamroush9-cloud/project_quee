import { z } from "zod";

const zIntFromString = z.preprocess((v) => {
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return v;
}, z.number().int());

export const registerSchema = z.object({
  fullName: z.string().min(2).max(190),
  email: z.string().email().max(190),
  phone: z.string().min(6).max(50).optional(),
  password: z.string().min(8).max(100),
  role: z.enum(["RECEPTIONIST", "DOCTOR", "PATIENT"]),
  dateOfBirth: z.string().date().optional(),
  isDisabled: z.boolean().optional(),
  hasSpecialNeeds: z.boolean().optional(),
  departmentId: z.number().int().positive().optional()
}).refine((value) => !["PATIENT", "DOCTOR"].includes(value.role) || value.departmentId !== undefined, {
  message: "departmentId is required for patient and doctor registration",
  path: ["departmentId"]
});

export const loginSchema = z.object({
  email: z.string().email().max(190),
  password: z.string().min(1).max(100)
});

export const createAppointmentSchema = z.object({
  departmentId: z.number().int().positive(),
  doctorId: z.number().int().positive().optional(),
  scheduledAt: z.string().datetime(),
  notes: z.string().max(5000).optional()
});

export const bookAppointmentSchema = z.object({
  departmentId: z.number().int().positive(),
  notes: z.string().max(5000).optional()
});

export const queueWalkInSchema = z.object({
  patientId: z.number().int().positive(),
  departmentId: z.number().int().positive(),
  priority: z.enum(["AUTO", "EMERGENCY", "ELDERLY", "DISABLED", "NORMAL"]).optional()
});

export const patientJoinQueueSchema = z.object({
  departmentId: z.number().int().positive()
});

export const queueCheckInSchema = z.object({
  appointmentId: z.number().int().positive(),
  priority: z.enum(["AUTO", "EMERGENCY", "ELDERLY", "DISABLED", "NORMAL"]).optional()
});

export const callNextSchema = z.object({
  departmentId: z.number().int().positive()
});

export const completeSchema = z.object({
  queueEntryId: z.number().int().positive()
});

export const mockPaySchema = z.object({
  appointmentId: z.number().int().positive(),
  amountCents: z.number().int().positive(),
  currency: z.string().min(3).max(3).optional()
});

export const mockErPaySchema = z.object({
  amountCents: z.number().int().positive(),
  currency: z.string().min(3).max(3).optional()
});

export const paginationQuerySchema = z.object({
  limit: zIntFromString.optional().default(50).pipe(z.number().int().min(1).max(100)),
  offset: zIntFromString.optional().default(0).pipe(z.number().int().min(0).max(100000))
});

export const adminUsersQuerySchema = paginationQuerySchema.extend({
  role: z.enum(["ADMIN", "RECEPTIONIST", "DOCTOR", "PATIENT"]).optional(),
  q: z.string().trim().min(1).max(190).optional()
});

export const idParamSchema = z.object({
  departmentId: zIntFromString.pipe(z.number().int().positive())
});

export const numericIdParamSchema = z.object({
  id: zIntFromString.pipe(z.number().int().positive())
});

export const analyticsQuerySchema = z.object({
  days: zIntFromString.optional().default(7).pipe(z.number().int().min(1).max(90))
});

export const patientDirectoryQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(190).optional()
});

export const patientQueueSearchQuerySchema = z.object({
  patientId: zIntFromString.optional().pipe(z.number().int().positive().optional()),
  q: z.string().trim().min(1).max(190).optional(),
  limit: zIntFromString.optional().default(10).pipe(z.number().int().min(1).max(25))
});

export const setDoctorDepartmentsSchema = z.object({
  departmentIds: z.array(z.number().int().positive()).min(1).max(20)
});

export const erCheckinSchema = z.object({
  code: z.string().min(10).max(500).optional(),
  queueEntryId: z.number().int().positive().optional()
}).refine((v) => Boolean(v.code || v.queueEntryId), { message: "Provide code or queueEntryId" });

export const triageAssignSchema = z.object({
  queueEntryId: z.number().int().positive(),
  level: z.enum(["CRITICAL", "HIGH", "MED", "LOW", "NON_URGENT"]),
  notes: z.string().max(5000).optional()
});

export const departmentCapacitySchema = z.object({
  patientsPerHour: z.number().int().min(1).max(120),
  maxWaiting: z.number().int().min(1).max(5000)
});

export const auditListQuerySchema = paginationQuerySchema.extend({});

export const adminAppointmentsQuerySchema = z.object({
  departmentId: z.string().optional()
});

