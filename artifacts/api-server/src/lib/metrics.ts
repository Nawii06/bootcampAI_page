import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

const startedAt = Date.now();
const durationBuckets = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] as const;
const requests = new Map<string, number>();
const durations = new Map<
  string,
  { count: number; sum: number; buckets: number[] }
>();

export function normalizeMetricPath(rawUrl: string) {
  const pathname = rawUrl.split("?")[0] ?? "/";
  return pathname
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi,
      "/:id",
    )
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    .slice(0, 160);
}

function labels(values: Record<string, string | number>) {
  return Object.entries(values)
    .map(([key, value]) => `${key}="${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`)
    .join(",");
}

export function recordHttpRequest(
  method: string,
  path: string,
  statusCode: number,
  durationSeconds: number,
) {
  const normalizedPath = normalizeMetricPath(path);
  const requestKey = JSON.stringify([method, normalizedPath, statusCode]);
  requests.set(requestKey, (requests.get(requestKey) ?? 0) + 1);

  const durationKey = JSON.stringify([method, normalizedPath]);
  const current = durations.get(durationKey) ?? {
    count: 0,
    sum: 0,
    buckets: durationBuckets.map(() => 0),
  };
  current.count += 1;
  current.sum += durationSeconds;
  durationBuckets.forEach((upperBound, index) => {
    if (durationSeconds <= upperBound) current.buckets[index]! += 1;
  });
  durations.set(durationKey, current);
}

export function renderPrometheusMetrics() {
  const output = [
    "# HELP bootcamp_api_uptime_seconds Process uptime in seconds.",
    "# TYPE bootcamp_api_uptime_seconds gauge",
    `bootcamp_api_uptime_seconds ${((Date.now() - startedAt) / 1000).toFixed(3)}`,
    "# HELP bootcamp_api_http_requests_total Completed HTTP requests.",
    "# TYPE bootcamp_api_http_requests_total counter",
  ];
  for (const [key, count] of requests) {
    const [method, path, status] = JSON.parse(key) as [string, string, number];
    output.push(
      `bootcamp_api_http_requests_total{${labels({ method, path, status })}} ${count}`,
    );
  }
  output.push(
    "# HELP bootcamp_api_http_request_duration_seconds HTTP request duration.",
    "# TYPE bootcamp_api_http_request_duration_seconds histogram",
  );
  for (const [key, value] of durations) {
    const [method, path] = JSON.parse(key) as [string, string];
    durationBuckets.forEach((upperBound, index) => {
      output.push(
        `bootcamp_api_http_request_duration_seconds_bucket{${labels({ method, path, le: upperBound })}} ${value.buckets[index]}`,
      );
    });
    output.push(
      `bootcamp_api_http_request_duration_seconds_bucket{${labels({ method, path, le: "+Inf" })}} ${value.count}`,
      `bootcamp_api_http_request_duration_seconds_sum{${labels({ method, path })}} ${value.sum.toFixed(6)}`,
      `bootcamp_api_http_request_duration_seconds_count{${labels({ method, path })}} ${value.count}`,
    );
  }
  const memory = process.memoryUsage();
  output.push(
    "# HELP bootcamp_api_process_resident_memory_bytes Resident memory size.",
    "# TYPE bootcamp_api_process_resident_memory_bytes gauge",
    `bootcamp_api_process_resident_memory_bytes ${memory.rss}`,
  );
  return `${output.join("\n")}\n`;
}

export function requestMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const started = process.hrtime.bigint();
  res.once("finish", () => {
    const seconds = Number(process.hrtime.bigint() - started) / 1_000_000_000;
    recordHttpRequest(req.method, req.originalUrl, res.statusCode, seconds);
  });
  next();
}

export function isValidBearerToken(
  header: string | undefined,
  expected: string,
) {
  const supplied = header?.startsWith("Bearer ") ? header.slice(7) : "";
  const suppliedHash = createHash("sha256").update(supplied).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return Boolean(supplied) && timingSafeEqual(suppliedHash, expectedHash);
}

export function metricsHandler(req: Request, res: Response) {
  if (!env.metricsEnabled) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found", requestId: req.id } });
    return;
  }
  if (
    !isValidBearerToken(
      req.header("authorization"),
      env.METRICS_TOKEN ?? "",
    )
  ) {
    res.status(401).json({
      error: {
        code: "METRICS_AUTH_REQUIRED",
        message: "Metrics authentication is required.",
        requestId: req.id,
      },
    });
    return;
  }
  res.type("text/plain; version=0.0.4; charset=utf-8");
  res.send(renderPrometheusMetrics());
}
