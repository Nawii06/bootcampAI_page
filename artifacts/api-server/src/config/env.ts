import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";
const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);
const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);

const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65_535).default(4000),
  CORS_ALLOWED_ORIGINS: z.string().default(""),
  ENABLE_MOCK_AUTH: z.enum(["true", "false"]).default("false"),
  MALWARE_SCAN_MODE: z.enum(["disabled", "http"]).default("disabled"),
  MALWARE_SCAN_URL: z.string().url().optional(),
  MALWARE_SCAN_API_KEY: z.string().default(""),
  MALWARE_SCAN_TIMEOUT_MS: z.coerce.number().int().min(500).max(60_000).default(10_000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  FILE_STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  S3_BUCKET: optionalNonEmptyString,
  S3_REGION: z.string().min(1).default("ap-northeast-2"),
  S3_ENDPOINT: optionalUrl,
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("false"),
  S3_KEY_PREFIX: z.string().default("bootcamp"),
  S3_SIGNED_URL_EXPIRES_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(900)
    .default(120),
  METRICS_ENABLED: z.enum(["true", "false"]).default("false"),
  METRICS_TOKEN: optionalNonEmptyString,
});

const parsed = EnvironmentSchema.parse(process.env);
const allowedOrigins = parsed.CORS_ALLOWED_ORIGINS.split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (isProduction && allowedOrigins.length === 0) {
  throw new Error("CORS_ALLOWED_ORIGINS is required in production.");
}
if (isProduction && parsed.ENABLE_MOCK_AUTH === "true") {
  throw new Error("ENABLE_MOCK_AUTH must not be enabled in production.");
}
if (parsed.MALWARE_SCAN_MODE === "http" && !parsed.MALWARE_SCAN_URL) {
  throw new Error("MALWARE_SCAN_URL is required when MALWARE_SCAN_MODE=http.");
}
if (
  isProduction &&
  (parsed.MALWARE_SCAN_MODE !== "http" ||
    !parsed.MALWARE_SCAN_URL?.startsWith("https://"))
) {
  throw new Error(
    "Production requires an HTTPS malware scanning service.",
  );
}
if (parsed.FILE_STORAGE_DRIVER === "s3" && !parsed.S3_BUCKET) {
  throw new Error("S3_BUCKET is required when FILE_STORAGE_DRIVER=s3.");
}
if (
  parsed.METRICS_ENABLED === "true" &&
  (!parsed.METRICS_TOKEN || parsed.METRICS_TOKEN.length < 32)
) {
  throw new Error(
    "METRICS_TOKEN must contain at least 32 characters when metrics are enabled.",
  );
}

export const env = {
  ...parsed,
  allowedOrigins,
  mockAuthEnabled: parsed.ENABLE_MOCK_AUTH === "true",
  s3ForcePathStyle: parsed.S3_FORCE_PATH_STYLE === "true",
  metricsEnabled: parsed.METRICS_ENABLED === "true",
};
