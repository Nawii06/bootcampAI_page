import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import { ApiError } from "../../lib/api-error";

const ALLOWED_EXTENSIONS = new Set(["csv", "xlsx", "json"]);
const ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/json",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;

export function validateImportFile(file: {
  originalname: string;
  mimetype: string;
  size: number;
}) {
  const extension = file.originalname.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new ApiError(415, "FILE_EXTENSION_NOT_ALLOWED", "CSV, XLSX, JSON 파일만 허용됩니다.");
  }
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new ApiError(415, "FILE_MIME_NOT_ALLOWED", "허용되지 않은 파일 형식입니다.");
  }
  if (file.size <= 0 || file.size > MAX_IMPORT_FILE_BYTES) {
    throw new ApiError(413, "FILE_SIZE_EXCEEDED", "파일은 5MB 이하여야 합니다.");
  }
  return extension;
}

export function parseImportBuffer(
  buffer: Buffer,
  extension: string,
): Array<Record<string, unknown>> {
  try {
    if (extension === "json") {
      const value: unknown = JSON.parse(buffer.toString("utf8"));
      if (!Array.isArray(value)) {
        throw new ApiError(400, "INVALID_JSON_SHAPE", "JSON 최상위 값은 배열이어야 합니다.");
      }
      return value as Array<Record<string, unknown>>;
    }
    const workbook = XLSX.read(
      extension === "csv" ? buffer.toString("utf8") : buffer,
      {
      type: extension === "csv" ? "string" : "buffer",
      raw: false,
      cellDates: false,
      },
    );
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new ApiError(400, "EMPTY_WORKBOOK", "워크북에 시트가 없습니다.");
    }
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[sheetName]!,
      { defval: "" },
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "IMPORT_PARSE_FAILED", "파일 내용을 해석할 수 없습니다.");
  }
}

export function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function assertAllowedExternalUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") {
    throw new ApiError(400, "EXTERNAL_URL_NOT_HTTPS", "외부 API는 HTTPS만 허용됩니다.");
  }
  const allowed = (process.env.IMPORT_API_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.includes(url.hostname.toLowerCase())) {
    throw new ApiError(403, "EXTERNAL_HOST_NOT_ALLOWED", "허용되지 않은 외부 API 호스트입니다.");
  }
  if (url.username || url.password) {
    throw new ApiError(400, "EXTERNAL_URL_CREDENTIALS", "URL에 인증정보를 포함할 수 없습니다.");
  }
  return url;
}
