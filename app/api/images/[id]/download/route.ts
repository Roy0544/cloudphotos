import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSignedDownloadAttachmentUrl } from '@/lib/r2';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/images/[id]/download
 * Generates an R2 signed URL with ResponseContentDisposition: attachment; filename="..."
 * and redirects (307) so the browser directly prompts a file save with the real filename.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // ── 1. Authenticate ──────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // ── 2. Fetch image metadata (RLS ensures user scope) ─────────────────────────
  const { data: image, error: dbError } = await supabase
    .from('images')
    .select('id, r2_key, original_filename')
    .eq('id', id)
    .single();

  if (dbError || !image) {
    return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
  }

  // ── 3. Build filename for download attachment ───────────────────────────────
  const rawName = image.original_filename || `vault-photo-${id}`;
  const baseName = rawName.replace(/\.[^/.]+$/, '');
  const filename = `${baseName}.webp`;

  // ── 4. Generate pre-signed URL with Content-Disposition attachment ───────────
  try {
    const downloadUrl = await getSignedDownloadAttachmentUrl(image.r2_key, filename, 300);

    // If client specifically requests JSON
    const wantsJson =
      request.headers.get('accept')?.includes('application/json') ||
      request.nextUrl.searchParams.get('json') === 'true';

    if (wantsJson) {
      return NextResponse.json({
        id: image.id,
        filename,
        downloadUrl,
      });
    }

    // Direct browser redirect -> triggers instant native file download
    return NextResponse.redirect(downloadUrl, { status: 307 });
  } catch (err: any) {
    console.error('[images/[id]/download] Error generating download URL:', err);
    return NextResponse.json(
      { error: 'Failed to generate download link.' },
      { status: 500 }
    );
  }
}
