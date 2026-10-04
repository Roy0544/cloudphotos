import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;

// Prefer the explicit endpoint var, fall back to the standard R2 endpoint.
const endpoint =
  process.env.R2_ENDPOINT_URL ||
  `https://${accountId}.r2.cloudflarestorage.com`;

export const R2_BUCKET = process.env.R2_BUCKET_NAME || 'photos';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Upload a buffer to Cloudflare R2.
 */
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
  metadata: Record<string, string> = {}
): Promise<void> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
    })
  );
}

/**
 * Delete an object from Cloudflare R2.
 * Used for atomic rollback when a DB insert fails after a successful R2 upload.
 */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      })
    );
  } catch (err) {
    // Log but don't rethrow — the caller has already failed; we're cleaning up.
    console.error('[r2] Failed to delete object during rollback:', key, err);
  }
}

/**
 * Generate a short-lived pre-signed URL for reading a private R2 object.
 * Default expiry: 1 hour (3600 seconds).
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Convert an original R2 key into its dedicated thumbnail key.
 * e.g. "userId/uuid.webp" -> "userId/uuid-thumb.webp"
 */
export function getThumbnailKey(r2Key: string): string {
  if (r2Key.endsWith('.webp')) {
    return r2Key.replace(/\.webp$/, '-thumb.webp');
  }
  const lastDot = r2Key.lastIndexOf('.');
  if (lastDot === -1) return `${r2Key}-thumb.webp`;
  return `${r2Key.substring(0, lastDot)}-thumb.webp`;
}

/**
 * Generate a short-lived pre-signed URL with Content-Disposition attachment header.
 * Forces browsers to open a native file download prompt with the actual filename.
 */
export async function getSignedDownloadAttachmentUrl(
  key: string,
  filename: string,
  expiresInSeconds = 300
): Promise<string> {
  const cleanFilename = filename.replace(/["\r\n]/g, '_');
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${cleanFilename}"`,
  });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}
