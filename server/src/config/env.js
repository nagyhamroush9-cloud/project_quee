import dotenv from "dotenv";

dotenv.config();

function required(name, fallback) {
  const val = process.env[name] ?? fallback;
  if (val === undefined || val === null || String(val).trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return val;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),

  db: {
    host: required("DB_HOST", "localhost"),
    port: Number(process.env.DB_PORT ?? 3306),
    name: required("DB_NAME", "hqms"),
    user: required("DB_USER", "hqms"),
    password: required("DB_PASSWORD", "hqms_password")
  },

  jwt: {
    secret: required("JWT_SECRET", "change_me_in_production"),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "1d"
  },

  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost,http://localhost:80")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  seedAdmin: {
    email: required("SEED_ADMIN_EMAIL", "admin@hqms.local"),
    password: required("SEED_ADMIN_PASSWORD", "Admin@12345")
  }
};

