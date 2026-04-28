import test from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
import mysql from "mysql2/promise";

let dbReady = false;
let request;
let poolRef;

async function canConnect({ host, port, user, password, database }) {
  const conn = await mysql.createConnection({ host, port, user, password, database, timezone: "Z" });
  await conn.execute("SELECT 1");
  await conn.end();
}

async function ensureDbConnection() {
  const host = process.env.DB_HOST || "localhost";
  const port = Number(process.env.DB_PORT || 3306);
  const database = process.env.DB_NAME || "hqms";

  const candidates = [];
  if (process.env.DB_USER) {
    candidates.push({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || "",
      database
    });
  }

  // Common local defaults (matches README / docker-compose defaults)
  candidates.push({ user: "root", password: process.env.MYSQL_ROOT_PASSWORD || "root", database });
  candidates.push({ user: "hqms", password: "hqms_password", database });

  for (const c of candidates) {
    try {
      await canConnect({ host, port, ...c });
      process.env.DB_HOST = host;
      process.env.DB_PORT = String(port);
      process.env.DB_USER = c.user;
      process.env.DB_PASSWORD = c.password;
      process.env.DB_NAME = c.database;
      return true;
    } catch {
      // try next
    }
  }
  return false;
}

test("setup", async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret";
  process.env.JWT_EXPIRES_IN = "1d";
  process.env.CORS_ORIGINS = "http://localhost:5173,http://localhost";
  process.env.SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@hqms.local";
  process.env.SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";

  dbReady = await ensureDbConnection();
  if (!dbReady) return;

  const { initDatabase } = await import("../src/bootstrap/initDatabase.js");
  const { seedAdmin } = await import("../src/bootstrap/seedAdmin.js");
  const { createApp } = await import("../src/app.js");
  const { pool } = await import("../src/config/db.js");
  poolRef = pool;

  await initDatabase();
  await seedAdmin();
  request = supertest(createApp());
});

test.after(async () => {
  try {
    if (poolRef) await poolRef.end();
  } catch {
    // ignore
  }
});

test("auth: register + login", async (t) => {
  if (!dbReady) return t.skip("MySQL not reachable; set DB_* env vars to run integration tests.");

  const email = `patient_${Date.now()}@test.local`;
  const reg = await request
    .post("/auth/register")
    .send({ fullName: "Test Patient", email, phone: "1234567", password: "Password@123", role: "PATIENT" })
    .expect(200);

  assert.ok(reg.body?.token);
  assert.equal(reg.body?.user?.email, email);

  const login = await request.post("/auth/login").send({ email, password: "Password@123" }).expect(200);
  assert.ok(login.body?.token);
  assert.equal(login.body?.user?.email, email);
});

test("queue: receptionist walk-in -> doctor call-next", async (t) => {
  if (!dbReady) return t.skip("MySQL not reachable; set DB_* env vars to run integration tests.");

  const now = Date.now();
  const patientEmail = `q_patient_${now}@test.local`;
  const recEmail = `q_rec_${now}@test.local`;
  const docEmail = `q_doc_${now}@test.local`;

  const patient = await request
    .post("/auth/register")
    .send({ fullName: "Queue Patient", email: patientEmail, password: "Password@123", role: "PATIENT" })
    .expect(200);
  const receptionist = await request
    .post("/auth/register")
    .send({ fullName: "Queue Receptionist", email: recEmail, password: "Password@123", role: "RECEPTIONIST" })
    .expect(200);
  const doctor = await request
    .post("/auth/register")
    .send({ fullName: "Queue Doctor", email: docEmail, password: "Password@123", role: "DOCTOR" })
    .expect(200);

  const patientId = patient.body.user.id;
  assert.ok(patientId);

  await request
    .post("/queue/walkin")
    .set("Authorization", `Bearer ${receptionist.body.token}`)
    .send({ patientId, departmentId: 1, priority: "AUTO" })
    .expect(200);

  const called = await request
    .post("/queue/call-next")
    .set("Authorization", `Bearer ${doctor.body.token}`)
    .send({ departmentId: 1 })
    .expect(200);

  assert.ok(called.body.queueEntryId);
});

test("search: admin users filtered by q", async (t) => {
  if (!dbReady) return t.skip("MySQL not reachable; set DB_* env vars to run integration tests.");

  const login = await request
    .post("/auth/login")
    .send({ email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD })
    .expect(200);

  const targetEmail = `search_${Date.now()}@test.local`;
  await request
    .post("/auth/register")
    .send({ fullName: "Search Target", email: targetEmail, password: "Password@123", role: "PATIENT" })
    .expect(200);

  const res = await request
    .get("/admin/users")
    .set("Authorization", `Bearer ${login.body.token}`)
    .query({ q: "Search Target", role: "PATIENT", limit: 20, offset: 0 })
    .expect(200);

  assert.ok(Array.isArray(res.body.users));
  assert.ok(res.body.total >= 1);
});

test("patient search: queue patient-search returns profile + stats", async (t) => {
  if (!dbReady) return t.skip("MySQL not reachable; set DB_* env vars to run integration tests.");

  const now = Date.now();
  const recEmail = `ps_rec_${now}@test.local`;
  const pEmail = `ps_patient_${now}@test.local`;

  const receptionist = await request
    .post("/auth/register")
    .send({ fullName: "PS Receptionist", email: recEmail, password: "Password@123", role: "RECEPTIONIST" })
    .expect(200);

  const patient = await request
    .post("/auth/register")
    .send({ fullName: "PS Patient", email: pEmail, password: "Password@123", role: "PATIENT" })
    .expect(200);

  await request
    .post("/queue/walkin")
    .set("Authorization", `Bearer ${receptionist.body.token}`)
    .send({ patientId: patient.body.user.id, departmentId: 1, priority: "NORMAL" })
    .expect(200);

  const res = await request
    .get("/queue/patient-search")
    .set("Authorization", `Bearer ${receptionist.body.token}`)
    .query({ patientId: patient.body.user.id })
    .expect(200);

  assert.ok(Array.isArray(res.body.results));
  assert.equal(res.body.results[0]?.patient?.id, patient.body.user.id);
  assert.equal(res.body.results[0]?.inQueue, true);
  assert.ok(typeof res.body.results[0]?.stats?.estimatedWaitMinutes === "number");
});

test("ER: patient can check-in to own queue entry", async (t) => {
  if (!dbReady) return t.skip("MySQL not reachable; set DB_* env vars to run integration tests.");

  const now = Date.now();
  const pEmail = `ci_patient_${now}@test.local`;
  const recEmail = `ci_rec_${now}@test.local`;

  const patient = await request
    .post("/auth/register")
    .send({ fullName: "Checkin Patient", email: pEmail, phone: "123456789", password: "Password@123", role: "PATIENT" })
    .expect(200);

  const receptionist = await request
    .post("/auth/register")
    .send({ fullName: "Checkin Receptionist", email: recEmail, password: "Password@123", role: "RECEPTIONIST" })
    .expect(200);

  const walkin = await request
    .post("/queue/walkin")
    .set("Authorization", `Bearer ${receptionist.body.token}`)
    .send({ patientId: patient.body.user.id, departmentId: 1, priority: "NORMAL" })
    .expect(200);

  const qeId = walkin.body?.created?.id || walkin.body?.created?.queueEntryId;
  assert.ok(qeId);

  await request
    .post("/queue/er/checkin")
    .set("Authorization", `Bearer ${patient.body.token}`)
    .send({ queueEntryId: qeId })
    .expect(200);

  const status = await request
    .get("/queue/me/status")
    .set("Authorization", `Bearer ${patient.body.token}`)
    .expect(200);

  assert.equal(status.body?.result?.queue?.id, qeId);
  assert.ok(status.body?.result?.queue?.checkedInAt);
});

test("ER: triage assignment requires staff role", async (t) => {
  if (!dbReady) return t.skip("MySQL not reachable; set DB_* env vars to run integration tests.");

  const now = Date.now();
  const pEmail = `tri_patient_${now}@test.local`;
  const recEmail = `tri_rec_${now}@test.local`;

  const patient = await request
    .post("/auth/register")
    .send({ fullName: "Triage Patient", email: pEmail, password: "Password@123", role: "PATIENT" })
    .expect(200);

  const receptionist = await request
    .post("/auth/register")
    .send({ fullName: "Triage Receptionist", email: recEmail, password: "Password@123", role: "RECEPTIONIST" })
    .expect(200);

  const walkin = await request
    .post("/queue/walkin")
    .set("Authorization", `Bearer ${receptionist.body.token}`)
    .send({ patientId: patient.body.user.id, departmentId: 1, priority: "NORMAL" })
    .expect(200);

  const qeId = walkin.body?.created?.id;
  assert.ok(qeId);

  await request
    .post("/queue/er/triage")
    .set("Authorization", `Bearer ${patient.body.token}`)
    .send({ queueEntryId: qeId, level: "CRITICAL" })
    .expect(403);

  await request
    .post("/queue/er/triage")
    .set("Authorization", `Bearer ${receptionist.body.token}`)
    .send({ queueEntryId: qeId, level: "HIGH" })
    .expect(200);
});

test("ER: patient pay (mock) + join queue + status shows ahead/eta", async (t) => {
  if (!dbReady) return t.skip("MySQL not reachable; set DB_* env vars to run integration tests.");

  const now = Date.now();
  const pEmail = `pj_patient_${now}@test.local`;
  const patient = await request
    .post("/auth/register")
    .send({ fullName: "PayJoin Patient", email: pEmail, password: "Password@123", role: "PATIENT" })
    .expect(200);

  await request
    .post("/payments/mock-er")
    .set("Authorization", `Bearer ${patient.body.token}`)
    .send({ amountCents: 1500, currency: "USD" })
    .expect(200);

  await request
    .post("/queue/me/join")
    .set("Authorization", `Bearer ${patient.body.token}`)
    .send({ departmentId: 1 })
    .expect(200);

  const status = await request
    .get("/queue/me/status")
    .set("Authorization", `Bearer ${patient.body.token}`)
    .expect(200);

  assert.equal(status.body?.result?.inQueue, true);
  assert.ok(typeof status.body?.result?.stats?.positionAhead === "number");
  assert.ok(typeof status.body?.result?.stats?.estimatedWaitMinutes === "number");
});

