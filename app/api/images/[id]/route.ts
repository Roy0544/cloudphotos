import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSignedDownloadUrl } from '@/lib/r2';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

  // ── 2. Fetch specific image record (RLS enforces user scope) ───────────────
  const { data: img, error: dbError } = await supabase
    .from('images')
    .select('*')
    .eq('id', id)
    .single();

  if (dbError || !img) {
    return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
  }

  // ── 3. Generate signed URL ────────────────────────────────────────────────
  let signedUrl: string | null = null;
  try {
    signedUrl = await getSignedDownloadUrl(img.r2_key, 3600);
  } catch (err) {
    console.error('[images/[id]] Failed to sign URL:', img.r2_key, err);
  }

  return NextResponse.json({
    image: {
      id: img.id,
      r2Key: img.r2_key,
      originalFilename: img.original_filename,
      mimeType: img.mime_type,
      originalSizeBytes: img.original_size_bytes,
      compressedSizeBytes: img.compressed_size_bytes,
      width: img.width,
      height: img.height,
      signedUrl,
      viewUrl: `/api/images/${img.id}/view`,
      createdAt: img.created_at,
      parentImageId: img.parent_image_id,
      aiTransformType: img.ai_transform_type,
    },
  });
}
