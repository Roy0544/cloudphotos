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
  // ── 1. AI Neural & Generative ──────────────────────────────
  'bg-remove': 'tr:e-bgremove',
  'magic-enhance': 'tr:e-contrast-auto,e-sharpen-auto,q-95',
  'face-crop': 'tr:fo-face,w-800,h-800,c-maintain_ratio',
  'smart-focus': 'tr:fo-auto,w-800,h-800,c-maintain_ratio',
  'drop-shadow': 'tr:e-shadow-soft',

  // ── 2. Aesthetic Film & Color Grading ──────────────────────
  'vintage-90s': 'tr:e-vintage,e-contrast-10,q-90',
  'golden-hour': 'tr:e-contrast-5,e-sharpen-10,e-tint-warm,q-90',
  'noir-bw': 'tr:e-grayscale,e-contrast-30,e-sharpen-20,q-90',
  'vignette': 'tr:e-vignette-25,e-contrast-10,q-90',
  'sepia': 'tr:e-sepia,e-contrast-15,q-90',
  'duotone': 'tr:e-duotone-0000FF-FF5500,q-90',
  'warmth': 'tr:e-contrast-5,e-sharpen-10,q-90',
  'monochrome': 'tr:e-contrast-20,e-grayscale,q-90',

  // ── 3. Smart Framing & Canvases ────────────────────────────
  'canvas-story': 'tr:w-1080,h-1920,cm-pad_resize,bg-blurred,q-90',
  'canvas-square': 'tr:w-1080,h-1080,cm-pad_resize,bg-blurred,q-90',
  'canvas-cinema': 'tr:w-1920,h-1080,cm-pad_resize,bg-blurred,q-90',
  'polaroid-frame': 'tr:b-20_white,b-bottom-60_white,q-90',
  'circle-avatar': 'tr:r-max,w-800,h-800,q-90',

  // ── 4. Dynamic Overlays & Stamps ───────────────────────────
  'retro-date': 'tr:l-text,i-1998-10-04,fs-32,co-FFA500,lx-N30,ly-N30,l-end',
  'vault-watermark': 'tr:l-text,i-Family%20Vault,fs-36,co-FFFFFF,fo-center,al-0.25,l-end',
  'geotag-badge': 'tr:l-text,i-Captured%20Moment,fs-24,co-FFFFFF,bg-00000088,pa-12,r-12,lx-24,ly-24,l-end',

  // ── 5. Privacy & Obfuscation ───────────────────────────────
  'privacy-blur': 'tr:e-blur-30,q-90',
  'pixelate': 'tr:e-pixelate-20,q-90',
  'document-scan': 'tr:e-grayscale,e-contrast-60,q-90',

  // ── 6. Pro Quality & Clarity ───────────────────────────────
  'clarity': 'tr:e-contrast-15,e-sharpen-25,q-95',
  'ultra-hd': 'tr:e-sharpen-20,q-100',
  'low-res-thumb': 'tr:w-400,bl-2,q-40',

  // ── 7. Motion & Dynamic Media ──────────────────────────────
  'animated-webp': 'tr:f-webp,so-0,du-3,q-80',
  'video-poster': 'tr:so-1,q-95',
  'fast-motion': 'tr:w-720,h-1280,q-80',
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

    // Build transformation URL (with dynamic customization where applicable)
    let rawTransform = TRANSFORM_MAP[transform] || 'tr:e-bgremove';

    if (transform === 'retro-date') {
      const d = new Date(original.created_at || Date.now());
      const year = String(d.getFullYear()).slice(-2);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateText = `'${year} ${month} ${day}`;
      rawTransform = `tr:l-text,i-${encodeURIComponent(dateText)},fs-36,co-FFA500,lx-N35,ly-N35,l-end`;
    } else if (transform === 'geotag-badge') {
      const label = (original.original_filename || 'Vault Photo')
        .replace(/\.[^/.]+$/, '')
        .slice(0, 18);
      rawTransform = `tr:l-text,i-${encodeURIComponent('📍 ' + label)},fs-24,co-FFFFFF,bg-00000088,pa-14,r-12,lx-25,ly-25,l-end`;
    }

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
