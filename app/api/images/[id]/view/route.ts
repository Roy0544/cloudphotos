import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { r2Client, R2_BUCKET, getThumbnailKey } from '@/lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const isThumb = request.nextUrl.searchParams.get('thumb') === 'true';

  // ── 1. Authenticate ──────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // ── 2. Fetch image record (RLS ensures only the owner can access) ─────────────
  const { data: image, error: dbError } = await supabase
    .from('images')
    .select('r2_key, mime_type')
    .eq('id', id)
    .single();

  if (dbError || !image) {
    return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
  }

  // ── 3. Stream the object from R2 (thumbnail or original) ────────────────────
  let targetKey = image.r2_key;
  if (isThumb) {
    targetKey = getThumbnailKey(image.r2_key);
  }

  try {
    let r2Response;
    try {
      r2Response = await r2Client.send(
        new GetObjectCommand({
          Bucket: R2_BUCKET,
          Key: targetKey,
        })
      );
    } catch (err: any) {
      // If thumbnail requested was not found (e.g. legacy photo), fallback to main photo
      if (isThumb) {
        r2Response = await r2Client.send(
          new GetObjectCommand({
            Bucket: R2_BUCKET,
            Key: image.r2_key,
          })
        );
      } else {
        throw err;
      }
    }

    if (!r2Response.Body) {
      return NextResponse.json({ error: 'Image data is empty.' }, { status: 404 });
    }

    const bodyBytes = await r2Response.Body.transformToByteArray();

    return new NextResponse(Buffer.from(bodyBytes), {
      status: 200,
      headers: {
        'Content-Type': image.mime_type ?? 'image/webp',
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('[images/[id]/view] R2 fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve image from storage.' },
      { status: 502 }
    );
  }
}
