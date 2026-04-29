import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { apiRouter } from "./http/router.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export function createApp() {
  const app = express();

  app.set('trust proxy', env.nodeEnv === 'production' ? 1 : false);
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 200,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      trustProxy: env.nodeEnv === 'production'
    })
  );

  app.use("/api", apiRouter);
  app.use(errorHandler);

  return app;
}

