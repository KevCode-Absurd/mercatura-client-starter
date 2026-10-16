import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env";
import { MediaDisabledError } from "./errors";
export const uid = () => randomBytes(8).toString("hex");
let s3: S3Client | null = null;
function storage(): S3Client {
    if (!env.STORAGE_ENDPOINT || !env.STORAGE_BUCKET || !env.STORAGE_ACCESS_KEY_ID || !env.STORAGE_SECRET_ACCESS_KEY)
        throw new MediaDisabledError("Video generation needs STORAGE_ENDPOINT, STORAGE_BUCKET and the storage keys in .env.");
    s3 ??= new S3Client({
        endpoint: env.STORAGE_ENDPOINT,
        region: env.STORAGE_REGION,
        credentials: { accessKeyId: env.STORAGE_ACCESS_KEY_ID, secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY },
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
    });
    return s3;
}
const CONTENT: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4" };
export async function publicUrl(file: string): Promise<string> {
    const key = `creative-engine/${uid()}-${path.basename(file).replace(/[^A-Za-z0-9._-]/g, "_")}`;
    await storage().send(new PutObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key, Body: fs.readFileSync(file), ContentType: CONTENT[path.extname(file).toLowerCase()] ?? "application/octet-stream" }));
    return getSignedUrl(storage(), new GetObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }), { expiresIn: 86400 });
}
