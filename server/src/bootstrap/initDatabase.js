import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../config/db.js";
import { env } from "../config/env.js";

async function hasColumn(conn, { table, column }) {
  const [[row]] = await conn.execute(
    `SELECT COUNT(*) AS c
     FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
    [env.db.name, table, column]
  );
  return Number(row?.c ?? 0) > 0;
}

async function ensureColumn(conn, { table, column, ddl }) {
  const exists = await hasColumn(conn, { table, column });
  if (exists) return;
  await conn.execute(ddl);
}

async function ensureIndex(conn, { table, indexName, ddl }) {
  const [[row]] = await conn.execute(
    `SELECT COUNT(*) AS c
     FROM information_schema.statistics
     WHERE table_schema = ? AND table_name = ? AND index_name = ?`,
    [env.db.name, table, indexName]
  );
  if (Number(row?.c ?? 0) > 0) return;
  await conn.execute(ddl);
}

function splitSqlStatements(sql) {
  const out = [];
  let current = "";
  let inString = false;
  let stringChar = "";
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const prev = sql[i - 1];
    if ((ch === "'" || ch === '"') && prev !== "\\" && !inString) {
      inString = true;
      stringChar = ch;
    } else if (inString && ch === stringChar && prev !== "\\") {
      inString = false;
      stringChar = "";
    }
    if (!inString && ch === ";") {
      const stmt = current.trim();
      if (stmt) out.push(stmt);
      current = "";
    } else {
      current += ch;
    }
  }
  const last = current.trim();
  if (last) out.push(last);
  return out;
}

async function ensurePaymentsAppointmentNullable(conn) {
  const [[col]] = await conn.execute(
    `SELECT IS_NULLABLE AS isNullable
     FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'payments' AND column_name = 'appointment_id'
     LIMIT 1`,
    [env.db.name]
  );
  if (!col) return;
  if (String(col.isNullable).toUpperCase() === "YES") return;

  // Drop FK if exists, alter column, re-add FK with SET NULL.
  try {
    await conn.execute("ALTER TABLE payments DROP FOREIGN KEY fk_payments_appointment");
  } catch {
    // ignore if missing
  }
  await conn.execute("ALTER TABLE payments MODIFY appointment_id BIGINT UNSIGNED NULL");
  try {
    await conn.execute(
      "ALTER TABLE payments ADD CONSTRAINT fk_payments_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL"
    );
  } catch {
    // ignore if already present
  }
}

export async function initDatabase() {
  const conn = await pool.getConnection();
  try {
    await conn.execute("SELECT 1");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const schemaPath = path.resolve(__dirname, "../../db/schema.sql");
    let schema = await fs.readFile(schemaPath, "utf8");
    schema = schema.replaceAll("CREATE DATABASE IF NOT EXISTS hqms", `CREATE DATABASE IF NOT EXISTS ${env.db.name}`);
    schema = schema.replaceAll("USE hqms", `USE ${env.db.name}`);
    const stmts = splitSqlStatements(schema);
    for (const stmt of stmts) {
      await conn.query(stmt);
    }

    // Idempotent migrations for existing installs
    await ensureColumn(conn, {
      table: "queue_entries",
      column: "checked_in_at",
      ddl: "ALTER TABLE queue_entries ADD COLUMN checked_in_at DATETIME NULL AFTER served_at"
    });
    await ensureColumn(conn, {
      table: "queue_entries",
      column: "cancelled_reason",
      ddl: "ALTER TABLE queue_entries ADD COLUMN cancelled_reason VARCHAR(190) NULL AFTER checked_in_at"
    });
    await ensureColumn(conn, {
      table: "queue_entries",
      column: "no_show_at",
      ddl: "ALTER TABLE queue_entries ADD COLUMN no_show_at DATETIME NULL AFTER cancelled_reason"
    });

    // Helpful index for ER flows
    await ensureIndex(conn, {
      table: "queue_entries",
      indexName: "idx_queue_patient_status_time",
      ddl: "CREATE INDEX idx_queue_patient_status_time ON queue_entries (patient_id, status, created_at)"
    });

    await ensurePaymentsAppointmentNullable(conn);

    await ensureColumn(conn, {
      table: "users",
      column: "date_of_birth",
      ddl: "ALTER TABLE users ADD COLUMN date_of_birth DATE NULL AFTER role"
    });
    await ensureColumn(conn, {
      table: "users",
      column: "is_disabled",
      ddl: "ALTER TABLE users ADD COLUMN is_disabled TINYINT(1) NOT NULL DEFAULT 0 AFTER date_of_birth"
    });
    await ensureColumn(conn, {
      table: "users",
      column: "has_special_needs",
      ddl: "ALTER TABLE users ADD COLUMN has_special_needs TINYINT(1) NOT NULL DEFAULT 0 AFTER is_disabled"
    });
    await ensureColumn(conn, {
      table: "users",
      column: "department_id",
      ddl: "ALTER TABLE users ADD COLUMN department_id BIGINT UNSIGNED NULL AFTER has_special_needs"
    });
    try {
      await conn.execute(
        "ALTER TABLE users ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL"
      );
    } catch {
      // ignore if constraint already exists
    }

    // Seed departments if none exist
    const [deptRows] = await conn.execute("SELECT COUNT(*) AS c FROM departments");
    if (Number(deptRows[0]?.c ?? 0) === 0) {
      await conn.execute("INSERT INTO departments (name) VALUES ('Emergency'), ('Cardiology'), ('Pediatrics'), ('Orthopedics')");
    }
  } finally {
    conn.release();
  }
}

