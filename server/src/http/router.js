import { Router } from "express";
import { authRoutes } from "./routes/authRoutes.js";
import { departmentRoutes } from "./routes/departmentRoutes.js";
import { appointmentRoutes } from "./routes/appointmentRoutes.js";
import { queueRoutes } from "./routes/queueRoutes.js";
import { notificationRoutes } from "./routes/notificationRoutes.js";
import { paymentRoutes } from "./routes/paymentRoutes.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";
import { messageRoutes } from "./routes/messageRoutes.js";

export const apiRouter = Router();

apiRouter.get("/health", (req, res) => res.json({ ok: true }));

apiRouter.use("/auth", authRoutes);
apiRouter.use("/departments", departmentRoutes);
apiRouter.use("/appointments", appointmentRoutes);
apiRouter.use("/queue", queueRoutes);
apiRouter.use("/notifications", notificationRoutes);
apiRouter.use("/messages", messageRoutes);
apiRouter.use("/payments", paymentRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/users", userRoutes);

