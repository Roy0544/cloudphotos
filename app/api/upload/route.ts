import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { uploadToR2, deleteFromR2 } from '@/lib/r2';

// Force Node.js runtime — required for Sharp native bindings and Node.js Buffer.
export const runtime = 'nodejs';

// Max body size accepted: 50 MB (covers large RAW/HEIC files before compression).
export const maxDuration = 60; // seconds, for Vercel

const ACCEPTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/tiff',
  'image/bmp',
]);

export async function POST(request: NextRequest) {
  // ── 1. Authenticate ─────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized. Please sign in.' },
      { status: 401 }
    );
  }

  // ── 2. Parse multipart form data ─────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body. Expected multipart/form-data.' },
      { status: 400 }
    );
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json(
      { error: 'No file field found in request.' },
      { status: 400 }
    );
  }

  // ── 3. Validate file type ────────────────────────────────────────────────────
  const mimeType = file.type.toLowerCase();
  if (!ACCEPTED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${mimeType}. Accepted: JPEG, PNG, WebP, AVIF, HEIC, GIF.`,
      },
      { status: 415 }
    );
  }

  const originalSizeBytes = file.size;
  const originalFilename = file.name;

  // ── 4. Compress image with Sharp ─────────────────────────────────────────────
  const arrayBuffer = await file.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  let compressedBuffer: Buffer;
  let thumbBuffer: Buffer;
  let width: number | undefined;
  let height: number | undefined;

  try {
    const sharpInstance = sharp(inputBuffer).rotate(); // auto-orient via EXIF

    const metadata = await sharpInstance.metadata();
    width = metadata.width;
    height = metadata.height;

    // 4A. Full-size optimized WebP
    compressedBuffer = await sharpInstance
      .clone()
      .webp({
        quality: 82,
        effort: 4,         // balance speed vs compression
        smartSubsample: true,
      })
      .toBuffer();

    // 4B. Dedicated lightweight 400px thumbnail for instant grid browsing
    thumbBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: 400,
        height: 400,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality: 75,
        effort: 3,
      })
      .toBuffer();
  } catch (err) {
    console.error('[upload] Sharp processing failed:', err);
    return NextResponse.json(
      { error: 'Failed to process image. The file may be corrupted.' },
      { status: 422 }
    );
  }

  // ── 5. Generate unique R2 keys ───────────────────────────────────────────────
  const fileId = randomUUID();
  const r2Key = `${user.id}/${fileId}.webp`;
  const thumbR2Key = `${user.id}/${fileId}-thumb.webp`;

  // ── 6. Upload both to Cloudflare R2 concurrently ─────────────────────────────
  try {
    await Promise.all([
      uploadToR2(r2Key, compressedBuffer, 'image/webp', {
        'original-filename': encodeURIComponent(originalFilename),
        'user-id': user.id,
      }),
      uploadToR2(thumbR2Key, thumbBuffer, 'image/webp', {
        'original-filename': encodeURIComponent(`thumb_${originalFilename}`),
        'user-id': user.id,
        'variant': 'thumbnail',
      }),
    ]);
  } catch (err) {
    console.error('[upload] R2 upload failed:', err);
    return NextResponse.json(
      { error: 'Failed to store image in Cloudflare R2. Please try again.' },
      { status: 502 }
    );
  }

  // ── 7. Insert metadata row into Supabase ──────────────────────────────────────
  const { data: imageRow, error: dbError } = await supabase
    .from('images')
    .insert({
      user_id: user.id,
      r2_key: r2Key,
      original_filename: originalFilename,
      mime_type: 'image/webp',
      original_size_bytes: originalSizeBytes,
      compressed_size_bytes: compressedBuffer.length,
      width: width ?? null,
      height: height ?? null,
    })
    .select()
    .single();

  if (dbError) {
    // ── 7a. Rollback: delete both R2 objects to avoid orphaned storage ────────
    await Promise.all([deleteFromR2(r2Key), deleteFromR2(thumbR2Key)]);
    console.error('[upload] DB insert failed, R2 objects rolled back:', dbError);
    return NextResponse.json(
      { error: 'Failed to save image metadata. Upload rolled back.' },
      { status: 500 }
    );
  }

  // ── 8. Return the new image record ────────────────────────────────────────────
  return NextResponse.json(
    {
      id: imageRow.id,
      r2Key: imageRow.r2_key,
      thumbR2Key,
      originalFilename: imageRow.original_filename,
      originalSizeBytes,
      compressedSizeBytes: compressedBuffer.length,
      thumbnailSizeBytes: thumbBuffer.length,
      width: imageRow.width,
      height: imageRow.height,
      createdAt: imageRow.created_at,
      compressionRatio: Math.round(
        (1 - compressedBuffer.length / originalSizeBytes) * 100
      ),
    },
    { status: 201 }
  );
}
