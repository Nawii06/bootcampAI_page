import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../config/env";
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

let s3Client: S3Client | undefined;

function getS3Client() {
  s3Client ??= new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.s3ForcePathStyle,
  });
  return s3Client;
}

function buildStorageKey(extension: string) {
  const filename = `${randomUUID()}.${extension}`;
  if (env.FILE_STORAGE_DRIVER === "local") return filename;
  const prefix = env.S3_KEY_PREFIX.replace(/^\/+|\/+$/g, "");
  return prefix ? `${prefix}/${filename}` : filename;
}

export async function persistEvidenceFile(buffer: Buffer, extension: string) {
  const key = buildStorageKey(extension);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  if (env.FILE_STORAGE_DRIVER === "s3") {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET!,
        Key: key,
        Body: buffer,
        ServerSideEncryption: "AES256",
        Metadata: { sha256 },
      }),
    );
    return { storageKey: key, sha256 };
  }
  const { root, target } = resolveStorageTarget(key);
  await mkdir(root, { recursive: true });
  await writeFile(target, buffer, { flag: "wx" });
  return {
    storageKey: key,
    sha256,
  };
}

export async function removePersistedFile(storageKey: string) {
  if (env.FILE_STORAGE_DRIVER === "s3") {
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: env.S3_BUCKET!, Key: storageKey }),
    );
    return;
  }
  const { target } = resolveStorageTarget(storageKey);
  await unlink(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}

export async function readPersistedFile(storageKey: string) {
  if (env.FILE_STORAGE_DRIVER === "s3") {
    try {
      const result = await getS3Client().send(
        new GetObjectCommand({ Bucket: env.S3_BUCKET!, Key: storageKey }),
      );
      if (!result.Body) throw new Error("Object body is empty.");
      return Buffer.from(await result.Body.transformToByteArray());
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode;
      if (status === 404) {
        throw new ApiError(
          404,
          "FILE_BINARY_NOT_FOUND",
          "저장된 파일 원본을 찾을 수 없습니다.",
        );
      }
      throw error;
    }
  }
  const { target } = resolveStorageTarget(storageKey);
  try {
    return await readFile(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new ApiError(404, "FILE_BINARY_NOT_FOUND", "저장된 파일 원본을 찾을 수 없습니다.");
    }
    throw error;
  }
}

export async function createPersistedFileDownloadUrl(
  storageKey: string,
  originalName: string,
  mimeType: string,
) {
  if (env.FILE_STORAGE_DRIVER !== "s3") return null;
  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: storageKey,
      ResponseContentType: mimeType,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`,
    }),
    { expiresIn: env.S3_SIGNED_URL_EXPIRES_SECONDS },
  );
}

export async function verifyFileStorageReady() {
  if (env.FILE_STORAGE_DRIVER !== "s3") return;
  await getS3Client().send(new HeadBucketCommand({ Bucket: env.S3_BUCKET! }));
}
