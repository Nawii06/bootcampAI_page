import express, { type Express } from "express";
import { randomUUID } from "node:crypto";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { attachAuth } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./lib/api-error";
import { env } from "./config/env";
import { requestMetrics } from "./lib/metrics";

const app: Express = express();
const allowedOrigins = env.allowedOrigins;

if (env.TRUST_PROXY_HOPS > 0) {
  app.set("trust proxy", env.TRUST_PROXY_HOPS);
}

app.use(
  pinoHttp({
    logger,
    genReqId(_req, res) {
      const id = randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },
    customLogLevel(_req, res, error) {
      if (error || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(requestMetrics);
app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (env.NODE_ENV !== "production" && allowedOrigins.length === 0)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed by CORS policy."));
    },
  }),
);
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(attachAuth);

app.use("/api", router);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
