import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { ApiError } from "../../lib/api-error";

export const MAX_EVIDENCE_FILE_BYTES = 20 * 1024 * 1024;

const allowed = new Map([
  ["pdf", ["application/pdf"]],
  ["png", ["image/png"]],
  ["jpg", ["image/jpeg"]],
  ["jpeg", ["image/jpeg"]],
  ["csv", ["text/csv", "application/csv"]],
  ["xlsx", ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]],
  ["docx", ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]],
]);

function hasExpectedSignature(extension: string, buffer: Buffer) {
  if (extension === "pdf") return buffer.subarray(0, 5).toString() === "%PDF-";
  if (extension === "png") {
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (["jpg", "jpeg"].includes(extension)) {
    return buffer[0] === 0xff && buffer[1] === 0xd8;
  }
  if (["xlsx", "docx"].includes(extension)) {
    return buffer[0] === 0x50 && buffer[1] === 0x4b;
  }
  return true;
}

export function validateEvidenceFile(file: {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}) {
  const extension = file.originalname.split(".").pop()?.toLowerCase() ?? "";
  const mimeTypes = allowed.get(extension);
  if (!mimeTypes?.includes(file.mimetype)) {
    throw new ApiError(
      415,
      "EVIDENCE_FILE_TYPE_NOT_ALLOWED",
      "허용되지 않은 증빙파일 형식입니다.",
    );
  }
  if (file.size <= 0 || file.size > MAX_EVIDENCE_FILE_BYTES) {
    throw new ApiError(
      413,
      "EVIDENCE_FILE_SIZE_EXCEEDED",
      "증빙파일은 20MB 이하여야 합니다.",
    );
  }
  if (!hasExpectedSignature(extension, file.buffer)) {
    throw new ApiError(
      415,
      "EVIDENCE_FILE_SIGNATURE_INVALID",
      "파일 내용과 확장자가 일치하지 않습니다.",
    );
  }
  return extension;
}

function resolveStorageTarget(storageKey: string) {
  const root = path.resolve(process.env.FILE_STORAGE_DIR ?? ".data/files");
  const target = path.resolve(root, storageKey);
  if (path.dirname(target) !== root) {
    throw new ApiError(400, "INVALID_STORAGE_KEY", "잘못된 저장 경로입니다.");
  }
  return { root, target };
}

export async function persistEvidenceFile(buffer: Buffer, extension: string) {
  const key = `${randomUUID()}.${extension}`;
  const { root, target } = resolveStorageTarget(key);
  await mkdir(root, { recursive: true });
  await writeFile(target, buffer, { flag: "wx" });
  return {
    storageKey: key,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

export async function removePersistedFile(storageKey: string) {
  const { target } = resolveStorageTarget(storageKey);
  await unlink(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}
