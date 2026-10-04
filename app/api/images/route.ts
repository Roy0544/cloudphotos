import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSignedDownloadUrl } from '@/lib/r2';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // ── 1. Authenticate ──────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // ── 2. Parse query params ────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const perPage = Math.min(parseInt(searchParams.get('per_page') ?? '50', 10), 100);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  // ── 3. Fetch image rows from Supabase (RLS enforces user scope) ───────────────
  const { data: images, error: dbError, count } = await supabase
    .from('images')
    .select('*', { count: 'exact' })
    .is('parent_image_id', null) // only originals, not AI-edited variants
    .order('created_at', { ascending: false })
    .range(from, to);

  if (dbError) {
    console.error('[images] DB fetch error:', dbError);
    return NextResponse.json({ error: 'Failed to fetch images.' }, { status: 500 });
  }

  // ── 4. Generate short-lived signed URLs for each image ────────────────────────
  const imagesWithUrls = await Promise.all(
    (images ?? []).map(async (img) => {
      let signedUrl: string | null = null;
      try {
        signedUrl = await getSignedDownloadUrl(img.r2_key, 3600); // 1 hour
      } catch (err) {
        console.error('[images] Failed to sign URL for key:', img.r2_key, err);
      }
      return {
        id: img.id,
        r2Key: img.r2_key,
        originalFilename: img.original_filename,
        mimeType: img.mime_type,
        originalSizeBytes: img.original_size_bytes,
        compressedSizeBytes: img.compressed_size_bytes,
        width: img.width,
        height: img.height,
        signedUrl,
        createdAt: img.created_at,
      };
    })
  );

  return NextResponse.json({
    images: imagesWithUrls,
    pagination: {
      page,
      perPage,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / perPage),
    },
  });
}
