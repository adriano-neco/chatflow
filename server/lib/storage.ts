import * as Minio from "minio";
import path from "path";

const {
  MINIO_ENDPOINT = "localhost",
  MINIO_PORT = "9000",
  MINIO_ACCESS_KEY = "minioadmin",
  MINIO_SECRET_KEY = "minioadmin",
  MINIO_BUCKET = "chatflow",
  MINIO_USE_SSL = "false",
  MINIO_PUBLIC_URL,
} = process.env;

const port = parseInt(MINIO_PORT, 10);
const useSSL = MINIO_USE_SSL === "true";

export const minioClient = new Minio.Client({
  endPoint: MINIO_ENDPOINT,
  port,
  useSSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

const bucket = MINIO_BUCKET;

export async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(bucket);
  if (!exists) {
    await minioClient.makeBucket(bucket);
    const policy = JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: ["*"] },
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    });
    await minioClient.setBucketPolicy(bucket, policy);
  }
}

function publicUrl(objectName: string): string {
  if (MINIO_PUBLIC_URL) {
    return `${MINIO_PUBLIC_URL.replace(/\/$/, "")}/${bucket}/${objectName}`;
  }
  const proto = useSSL ? "https" : "http";
  return `${proto}://${MINIO_ENDPOINT}:${port}/${bucket}/${objectName}`;
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<string> {
  const ext = path.extname(originalName) || "";
  const objectName = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;

  await minioClient.putObject(bucket, objectName, buffer, buffer.length, {
    "Content-Type": mimeType,
  });

  return publicUrl(objectName);
}

export async function deleteFile(objectName: string): Promise<void> {
  try {
    await minioClient.removeObject(bucket, objectName);
  } catch {
    // silently ignore missing objects
  }
}

export function objectNameFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split(`/${bucket}/`);
    return parts.length > 1 ? parts[1] : null;
  } catch {
    return null;
  }
}
