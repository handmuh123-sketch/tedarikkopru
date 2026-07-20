import "server-only";

import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

import { serverEnvironment } from "@/lib/env/server";
import { sha256 } from "@/lib/security/crypto";

const acceptedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

const storageClient = new S3Client({
  endpoint: serverEnvironment.S3_ENDPOINT,
  region: serverEnvironment.S3_REGION,
  forcePathStyle: serverEnvironment.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: serverEnvironment.S3_ACCESS_KEY,
    secretAccessKey: serverEnvironment.S3_SECRET_KEY,
  },
});

export function validatePrivateDocument(bytes: Uint8Array, claimedMimeType: string): void {
  if (!acceptedMimeTypes.has(claimedMimeType))
    throw new Error("Yalnız PDF, JPEG veya PNG belge yüklenebilir.");
  if (bytes.byteLength < 4 || bytes.byteLength > serverEnvironment.DOCUMENT_MAX_BYTES) {
    throw new Error("Belge boyutu izin verilen sınırın dışında.");
  }
  const isPdf = Buffer.from(bytes.subarray(0, 5)).toString("ascii") === "%PDF-";
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = Buffer.from(bytes.subarray(0, 8)).equals(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  const magicMatches =
    (claimedMimeType === "application/pdf" && isPdf) ||
    (claimedMimeType === "image/jpeg" && isJpeg) ||
    (claimedMimeType === "image/png" && isPng);
  if (!magicMatches) throw new Error("Belgenin içerik türü dosya imzasıyla uyuşmuyor.");
}

export async function ensurePrivateBucket(): Promise<void> {
  try {
    await storageClient.send(
      new HeadBucketCommand({ Bucket: serverEnvironment.S3_BUCKET_PRIVATE }),
    );
  } catch {
    await storageClient.send(
      new CreateBucketCommand({ Bucket: serverEnvironment.S3_BUCKET_PRIVATE }),
    );
  }
}

export async function putPrivateDocument(
  organizationId: string,
  bytes: Uint8Array,
  mimeType: string,
): Promise<{ storageKey: string; checksum: string }> {
  validatePrivateDocument(bytes, mimeType);
  await ensurePrivateBucket();
  const storageKey = `organizations/${organizationId}/verification/${randomUUID()}`;
  await storageClient.send(
    new PutObjectCommand({
      Bucket: serverEnvironment.S3_BUCKET_PRIVATE,
      Key: storageKey,
      Body: bytes,
      ContentType: mimeType,
      Metadata: { checksum: sha256(bytes) },
    }),
  );
  return { storageKey, checksum: sha256(bytes) };
}

export async function getPrivateDocument(storageKey: string): Promise<Uint8Array> {
  const response = await storageClient.send(
    new GetObjectCommand({ Bucket: serverEnvironment.S3_BUCKET_PRIVATE, Key: storageKey }),
  );
  if (!response.Body) throw new Error("Belge içeriği bulunamadı.");
  return response.Body.transformToByteArray();
}
