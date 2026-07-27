import { createHash } from "node:crypto";
import { parse as parseCsv } from "csv-parse/sync";
import { readSheet } from "read-excel-file/node";
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
export const MAX_IMPORT_ROWS = 10_000;
export const MAX_IMPORT_COLUMNS = 100;

export function validateImportFile(file: {
  originalname: string;
  mimetype: string;
  size: number;
}) {
  const extension = file.originalname.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new ApiError(
      415,
      "FILE_EXTENSION_NOT_ALLOWED",
      "CSV, XLSX, JSON 파일만 허용합니다.",
    );
  }
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new ApiError(
      415,
      "FILE_MIME_NOT_ALLOWED",
      "허용되지 않은 파일 형식입니다.",
    );
  }
  if (file.size <= 0 || file.size > MAX_IMPORT_FILE_BYTES) {
    throw new ApiError(
      413,
      "FILE_SIZE_EXCEEDED",
      "파일은 5MB 이하여야 합니다.",
    );
  }
  return extension;
}

function validateRows(rows: Array<Record<string, unknown>>) {
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new ApiError(
      413,
      "IMPORT_ROW_LIMIT_EXCEEDED",
      `가져오기 데이터는 ${MAX_IMPORT_ROWS.toLocaleString()}행 이하여야 합니다.`,
    );
  }
  return rows;
}

function validateHeaders(headers: string[]) {
  if (
    headers.length === 0 ||
    headers.length > MAX_IMPORT_COLUMNS ||
    headers.some((header) => !header) ||
    new Set(headers).size !== headers.length
  ) {
    throw new ApiError(
      400,
      "INVALID_IMPORT_HEADERS",
      `헤더는 비어 있거나 중복될 수 없으며 ${MAX_IMPORT_COLUMNS}개 이하여야 합니다.`,
    );
  }
  return headers;
}

function parseCsvBuffer(buffer: Buffer) {
  const rows = parseCsv(buffer, {
    bom: true,
    columns: (headers: string[]) =>
      validateHeaders(headers.map((header) => header.trim())),
    relax_column_count: false,
    skip_empty_lines: true,
  }) as Array<Record<string, unknown>>;
  return validateRows(rows);
}

async function parseXlsxBuffer(buffer: Buffer) {
  const sheet = await readSheet(buffer);
  if (!sheet) {
    throw new ApiError(400, "EMPTY_WORKBOOK", "워크북에 시트가 없습니다.");
  }
  if (sheet.length < 1) return [];
  if (sheet.length - 1 > MAX_IMPORT_ROWS) {
    throw new ApiError(
      413,
      "IMPORT_ROW_LIMIT_EXCEEDED",
      `가져오기 데이터는 ${MAX_IMPORT_ROWS.toLocaleString()}행 이하여야 합니다.`,
    );
  }
  const columnCount = Math.max(...sheet.map((row) => row.length), 0);
  if (columnCount > MAX_IMPORT_COLUMNS) {
    throw new ApiError(
      413,
      "IMPORT_COLUMN_LIMIT_EXCEEDED",
      `가져오기 데이터는 ${MAX_IMPORT_COLUMNS}열 이하여야 합니다.`,
    );
  }

  const headers = validateHeaders(
    sheet[0]!.map((cell) => String(cell ?? "").trim()),
  );
  const rows: Array<Record<string, unknown>> = [];
  for (const row of sheet.slice(1)) {
    if (row.every((cell) => cell === null || cell === "")) continue;
    rows.push(
      Object.fromEntries(
        headers.map((header, index) => [
          header,
          row[index] === null || row[index] === undefined
            ? ""
            : row[index] instanceof Date
              ? row[index].toISOString()
              : String(row[index]),
        ]),
      ),
    );
  }
  return validateRows(rows);
}

export async function parseImportBuffer(
  buffer: Buffer,
  extension: string,
): Promise<Array<Record<string, unknown>>> {
  try {
    if (extension === "json") {
      const value: unknown = JSON.parse(buffer.toString("utf8"));
      if (!Array.isArray(value)) {
        throw new ApiError(
          400,
          "INVALID_JSON_SHAPE",
          "JSON 최상위 값은 배열이어야 합니다.",
        );
      }
      return validateRows(value as Array<Record<string, unknown>>);
    }
    if (extension === "csv") return parseCsvBuffer(buffer);
    if (extension === "xlsx") return await parseXlsxBuffer(buffer);
    throw new ApiError(
      415,
      "FILE_EXTENSION_NOT_ALLOWED",
      "지원하지 않는 가져오기 형식입니다.",
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      400,
      "IMPORT_PARSE_FAILED",
      "파일 내용을 해석할 수 없습니다.",
    );
  }
}

export function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function assertAllowedExternalUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") {
    throw new ApiError(
      400,
      "EXTERNAL_URL_NOT_HTTPS",
      "외부 API는 HTTPS만 허용합니다.",
    );
  }
  const allowed = (process.env.IMPORT_API_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.includes(url.hostname.toLowerCase())) {
    throw new ApiError(
      403,
      "EXTERNAL_HOST_NOT_ALLOWED",
      "허용되지 않은 외부 API 호스트입니다.",
    );
  }
  if (url.username || url.password) {
    throw new ApiError(
      400,
      "EXTERNAL_URL_CREDENTIALS",
      "URL에 인증정보를 포함할 수 없습니다.",
    );
  }
  return url;
}
