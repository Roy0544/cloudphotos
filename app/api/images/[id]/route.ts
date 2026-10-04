import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSignedDownloadUrl, deleteFromR2 } from '@/lib/r2';

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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

  const { searchParams } = new URL(request.url);
  const isPermanent = searchParams.get('permanent') === 'true';

  // ── 2. Fetch image to verify ownership and get R2 key ─────────────────────
  const { data: img, error: dbError } = await supabase
    .from('images')
    .select('id, r2_key, ai_transform_type')
    .eq('id', id)
    .single();

  if (dbError || !img) {
    return NextResponse.json({ error: 'Image not found or unauthorized.' }, { status: 404 });
  }

  if (isPermanent) {
    // ── 3A. Permanent deletion: purge from Cloudflare R2 and Supabase ───────
    try {
      // Find any child variants linked to this image
      const { data: children } = await supabase
        .from('images')
        .select('r2_key')
        .eq('parent_image_id', id);

      // Delete child variant R2 objects
      for (const child of children || []) {
        if (child.r2_key) {
          await deleteFromR2(child.r2_key);
        }
      }

      // Delete parent R2 object
      if (img.r2_key) {
        await deleteFromR2(img.r2_key);
      }

      // Delete database rows
      await supabase.from('images').delete().eq('parent_image_id', id);
      await supabase.from('images').delete().eq('id', id);

      return NextResponse.json({ success: true, permanent: true, id });
    } catch (err: any) {
      console.error('[images/[id] DELETE permanent] error:', err);
      return NextResponse.json({ error: 'Failed to permanently delete image.' }, { status: 500 });
    }
  } else {
    // ── 3B. Soft delete: move to Trash ──────────────────────────────────────
    try {
      const currentTransform = img.ai_transform_type;
      const newTrashType = currentTransform ? `trash:${currentTransform}` : 'trash';

      const { error: updateError } = await supabase
        .from('images')
        .update({ ai_transform_type: newTrashType })
        .eq('id', id);

      if (updateError) throw updateError;

      // Also soft-trash any child AI variants
      await supabase
        .from('images')
        .update({ ai_transform_type: 'trash:variant' })
        .eq('parent_image_id', id);

      return NextResponse.json({ success: true, trashed: true, id });
    } catch (err: any) {
      console.error('[images/[id] DELETE trash] error:', err);
      return NextResponse.json({ error: 'Failed to move image to trash.' }, { status: 500 });
    }
  }
}
