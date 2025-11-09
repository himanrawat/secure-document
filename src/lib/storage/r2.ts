import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

const r2 = new S3Client({
  region: "auto",
  endpoint: env.r2Endpoint,
  credentials: {
    accessKeyId: env.r2AccessKeyId,
    secretAccessKey: env.r2SecretKey,
  },
});

export async function uploadToR2(key: string, body: Buffer, contentType: string) {
  await r2.send(
    new PutObjectCommand({
      Bucket: env.r2Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

export async function deleteFromR2(key: string) {
  if (!key) return;
  await r2.send(
    new DeleteObjectCommand({
      Bucket: env.r2Bucket,
      Key: key,
    }),
  );
}

export async function getR2ObjectStream(key: string) {
  const command = new GetObjectCommand({
    Bucket: env.r2Bucket,
    Key: key,
  });
  const response = await r2.send(command);
  return {
    body: response.Body,
    contentType: response.ContentType ?? "application/octet-stream",
  };
}
