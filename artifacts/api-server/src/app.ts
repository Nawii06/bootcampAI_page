import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { attachAuth } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./lib/api-error";

const app: Express = express();
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
  throw new Error("CORS_ALLOWED_ORIGINS is required in production.");
}

app.use(
  pinoHttp({
    logger,
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
app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (process.env.NODE_ENV !== "production" && allowedOrigins.length === 0)
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
