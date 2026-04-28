import { withTx } from "../config/db.js";
import { AuditRepo } from "../repositories/auditRepo.js";

export const AuditService = {
  async log({ actorUserId, action, entityType, entityId, before, after }) {
    return withTx(async (conn) => {
      await AuditRepo.add(conn, { actorUserId, action, entityType, entityId, before, after });
    });
  }
};

