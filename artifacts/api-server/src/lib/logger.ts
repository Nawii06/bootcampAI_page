import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const LOG_REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers['set-cookie']",
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "clientSecret",
  "apiKey",
  "accountNumber",
  "*.password",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.clientSecret",
  "*.apiKey",
  "*.accountNumber",
];

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: {
    service: "bootcamp-api",
    environment: process.env.NODE_ENV ?? "development",
  },
  redact: { paths: LOG_REDACT_PATHS, censor: "[REDACTED]" },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
