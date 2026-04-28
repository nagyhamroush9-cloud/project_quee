import bcrypt from "bcryptjs";
import { pool, withTx } from "../config/db.js";
import { env } from "../config/env.js";
import { DoctorDepartmentRepo } from "../repositories/doctorDepartmentRepo.js";

function doctorPassword() {
  return process.env.SEED_DOCTOR_PASSWORD || "Doctor@12345";
}

export async function seedDoctors() {
  if (env.nodeEnv === "production") return;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute("SELECT id FROM users WHERE role = 'DOCTOR' LIMIT 1");
    if (rows[0]) return;
  } finally {
    conn.release();
  }

  const passHash = await bcrypt.hash(doctorPassword(), 12);

  // Create 4 demo doctors and map to departments 1-4.
  await withTx(async (c) => {
    const doctors = [
      { full_name: "Dr. Ali Hassan", email: "doctor1@hqms.local" },
      { full_name: "Dr. Sara Omar", email: "doctor2@hqms.local" },
      { full_name: "Dr. Youssef Adel", email: "doctor3@hqms.local" },
      { full_name: "Dr. Mona Ibrahim", email: "doctor4@hqms.local" }
    ];

    const ids = [];
    for (const d of doctors) {
      const [res] = await c.execute(
        `INSERT INTO users (full_name, email, phone, password_hash, role, is_disabled)
         VALUES (?, ?, ?, ?, 'DOCTOR', 0)`,
        [d.full_name, d.email, null, passHash]
      );
      ids.push(res.insertId);
    }

    await DoctorDepartmentRepo.replaceDoctorDepartments(c, { doctorId: ids[0], departmentIds: [1, 2] });
    await DoctorDepartmentRepo.replaceDoctorDepartments(c, { doctorId: ids[1], departmentIds: [2, 3] });
    await DoctorDepartmentRepo.replaceDoctorDepartments(c, { doctorId: ids[2], departmentIds: [3, 4] });
    await DoctorDepartmentRepo.replaceDoctorDepartments(c, { doctorId: ids[3], departmentIds: [1, 4] });
  });
}

