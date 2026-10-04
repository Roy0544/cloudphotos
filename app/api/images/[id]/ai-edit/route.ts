import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@/lib/supabase/server';
import { r2Client, R2_BUCKET, uploadToR2, getSignedDownloadUrl, deleteFromR2 } from '@/lib/r2';
import { imagekit } from '@/lib/imagekit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const TRANSFORM_MAP: Record<string, string> = {
  'bg-remove': 'tr:e-bgremove',
  'clarity': 'tr:e-contrast-15,e-sharpen-25,q-95',
  'warmth': 'tr:e-contrast-5,e-sharpen-10,q-90',
  'monochrome': 'tr:e-contrast-20,e-grayscale,q-90',
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // ── 1. Authenticate user ──────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // ── 2. Parse request payload ──────────────────────────────────────────────
  let transform = 'bg-remove';
  try {
    const body = await request.json();
    if (body.transform && TRANSFORM_MAP[body.transform]) {
      transform = body.transform;
    }
  } catch {
    // Default to bg-remove if no body
  }

  // ── 3. Fetch original image record (RLS verifies ownership) ───────────────
  const { data: original, error: dbError } = await supabase
    .from('images')
    .select('*')
    .eq('id', id)
    .single();

  if (dbError || !original) {
    return NextResponse.json(
      { error: 'Original image not found or unauthorized.' },
      { status: 404 }
    );
  }

  // ── 4. Download original photo bytes from Cloudflare R2 ───────────────────
  let originalBuffer: Buffer;
  try {
    const r2Response = await r2Client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: original.r2_key,
      })
    );

    if (!r2Response.Body) {
      throw new Error('Empty body received from R2.');
    }

    const bytes = await r2Response.Body.transformToByteArray();
    originalBuffer = Buffer.from(bytes);
  } catch (err: any) {
    console.error('[ai-edit] Failed to read original from R2:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve original photo from storage.' },
      { status: 502 }
    );
  }

  // ── 5. Upload buffer to ImageKit for AI processing ────────────────────────
  let tempFileId: string | null = null;
  let transformedBuffer: Buffer;

  try {
    const tempUpload = await imagekit.upload({
      file: originalBuffer.toString('base64'),
      fileName: `ai-temp-${id}.webp`,
      folder: '/vault-ai-temp',
      useUniqueFileName: true,
    });

    tempFileId = tempUpload.fileId;

    // Build transformation URL
    const rawTransform = TRANSFORM_MAP[transform] || 'tr:e-bgremove';
    const transformedUrl = imagekit.url({
      path: tempUpload.filePath,
      transformation: [{ raw: rawTransform }],
    });

    // Fetch the AI-transformed result
    const ikResponse = await fetch(transformedUrl);
    if (!ikResponse.ok) {
      throw new Error(`ImageKit returned HTTP ${ikResponse.status}`);
    }

    const arrayBuffer = await ikResponse.arrayBuffer();
    transformedBuffer = Buffer.from(arrayBuffer);
  } catch (err: any) {
    console.error('[ai-edit] ImageKit AI transformation failed:', err);
    return NextResponse.json(
      { error: `AI transformation failed: ${err.message}` },
      { status: 502 }
    );
  } finally {
    // Clean up temporary file from ImageKit
    if (tempFileId) {
      imagekit.deleteFile(tempFileId).catch((e) => {
        console.warn('[ai-edit] Could not clean up temp file:', e.message);
      });
    }
  }

  // ── 6. Optimize and standardize format with Sharp ─────────────────────────
  let finalWebpBuffer: Buffer;
  let thumbBuffer: Buffer | null = null;
  let width: number | undefined;
  let height: number | undefined;

  try {
    const sharpInstance = sharp(transformedBuffer);
    const metadata = await sharpInstance.metadata();
    width = metadata.width;
    height = metadata.height;

    finalWebpBuffer = await sharpInstance
      .clone()
      .webp({
        quality: 85,
        effort: 4,
      })
      .toBuffer();

    thumbBuffer = await sharp(transformedBuffer)
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
  } catch (err: any) {
    console.error('[ai-edit] Sharp re-compression failed:', err);
    finalWebpBuffer = transformedBuffer;
  }

  // ── 7. Store AI result and thumbnail in Cloudflare R2 ───────────────────────
  const fileId = `${randomUUID()}-ai-${transform}`;
  const newR2Key = `${user.id}/${fileId}.webp`;
  const newThumbR2Key = `${user.id}/${fileId}-thumb.webp`;

  try {
    const uploads = [
      uploadToR2(newR2Key, finalWebpBuffer, 'image/webp', {
        'parent-id': original.id,
        'ai-transform': transform,
      }),
    ];
    if (thumbBuffer) {
      uploads.push(
        uploadToR2(newThumbR2Key, thumbBuffer, 'image/webp', {
          'parent-id': original.id,
          'ai-transform': transform,
          'variant': 'thumbnail',
        })
      );
    }
    await Promise.all(uploads);
  } catch (err: any) {
    console.error('[ai-edit] R2 upload of edited photo failed:', err);
    return NextResponse.json(
      { error: 'Failed to save edited photo to R2 storage.' },
      { status: 502 }
    );
  }

  // ── 8. Record new version in Supabase images table ────────────────────────
  const baseName = (original.original_filename || 'photo').replace(
    /\.[^/.]+$/,
    ''
  );
  const newFilename = `${baseName}-ai-${transform}.webp`;

  const { data: newRow, error: insertError } = await supabase
    .from('images')
    .insert({
      user_id: user.id,
      r2_key: newR2Key,
      original_filename: newFilename,
      mime_type: 'image/webp',
      original_size_bytes: original.original_size_bytes,
      compressed_size_bytes: finalWebpBuffer.length,
      width: width ?? original.width,
      height: height ?? original.height,
      parent_image_id: original.id,
      ai_transform_type: transform,
    })
    .select()
    .single();

  if (insertError) {
    // Rollback both R2 objects on DB insert failure
    await Promise.all([deleteFromR2(newR2Key), deleteFromR2(newThumbR2Key)]);
    console.error('[ai-edit] Supabase row insert failed, rolled back:', insertError);
    return NextResponse.json(
      { error: 'Failed to record edited photo metadata.' },
      { status: 500 }
    );
  }

  // ── 9. Generate signed URL for immediate preview ──────────────────────────
  const signedUrl = await getSignedDownloadUrl(newR2Key, 3600);

  return NextResponse.json(
    {
      id: newRow.id,
      parentId: original.id,
      r2Key: newR2Key,
      filename: newFilename,
      signedUrl,
      width: newRow.width,
      height: newRow.height,
      compressedSizeBytes: finalWebpBuffer.length,
      createdAt: newRow.created_at,
      transform,
    },
    { status: 201 }
  );
}
