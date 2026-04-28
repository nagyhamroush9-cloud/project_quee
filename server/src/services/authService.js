import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { withTx, pool } from "../config/db.js";
import { UserRepo } from "../repositories/userRepo.js";
import { badRequest, unauthorized } from "../utils/httpError.js";

function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), id: user.id, role: user.role, fullName: user.full_name ?? user.fullName, email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

export const AuthService = {
  async register({ fullName, email, phone, password, role, dateOfBirth, isDisabled, hasSpecialNeeds }) {
    if (role === "ADMIN") throw badRequest("Admin registration is not allowed");
    return withTx(async (conn) => {
      const existing = await UserRepo.findByEmail(conn, email);
      if (existing) throw badRequest("Email already exists");
      const passwordHash = await bcrypt.hash(password, 12);
      const created = await UserRepo.create(conn, { fullName, email, phone, passwordHash, role, dateOfBirth, isDisabled, hasSpecialNeeds });
      const user = await UserRepo.findById(conn, created.id);
      return { user, token: signToken({ ...user, full_name: user.full_name }) };
    });
  },

  async login({ email, password }) {
    const conn = await pool.getConnection();
    try {
      const user = await UserRepo.findByEmail(conn, email);
      if (!user) throw unauthorized("Invalid credentials");
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) throw unauthorized("Invalid credentials");
      const safeUser = await UserRepo.findById(conn, user.id);
      return { user: safeUser, token: signToken(user) };
    } finally {
      conn.release();
    }
  }
};

