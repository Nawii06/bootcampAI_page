import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";
import { env } from "../config/env";
import { verifyFileStorageReady } from "../domains/files/storage";
import { metricsHandler } from "../lib/metrics";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/metrics", metricsHandler);

router.get("/readyz", async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    await verifyFileStorageReady();
    const malwareScannerReady =
      env.NODE_ENV !== "production" ||
      (env.MALWARE_SCAN_MODE === "http" &&
        Boolean(env.MALWARE_SCAN_URL?.startsWith("https://")));
    if (!malwareScannerReady) {
      res.status(503).json({ status: "unavailable" });
      return;
    }
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

export default router;
