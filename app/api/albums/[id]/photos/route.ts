import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/albums/[id]/photos
 * Add one or more photos to the album
 * Body: { photoIds: string[] }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: albumId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: { photoIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const photoIds = Array.isArray(body.photoIds) ? body.photoIds : [];
  if (photoIds.length === 0) {
    return NextResponse.json({ error: 'photoIds must not be empty.' }, { status: 400 });
  }

  // 1. Verify user owns the album
  const { data: album, error: albumError } = await supabase
    .from('albums')
    .select('id, cover_photo_id')
    .eq('id', albumId)
    .eq('user_id', user.id)
    .single();

  if (albumError || !album) {
    return NextResponse.json({ error: 'Album not found or access denied.' }, { status: 404 });
  }

  // 2. Insert records into album_photos (ignoring duplicates)
  const rows = photoIds.map((photoId) => ({
    album_id: albumId,
    photo_id: photoId,
    user_id: user.id,
  }));

  const { error: insertError } = await supabase
    .from('album_photos')
    .upsert(rows, { onConflict: 'album_id,photo_id', ignoreDuplicates: true });

  if (insertError) {
    console.error('[albums/photos] Insert error:', insertError);
    return NextResponse.json({ error: 'Failed to add photos to album.' }, { status: 500 });
  }

  // 3. If album has no cover photo, set the first newly added photo as cover
  if (!album.cover_photo_id && photoIds.length > 0) {
    const firstPhotoId = photoIds[0];
    await supabase
      .from('albums')
      .update({
        cover_photo_id: firstPhotoId,
        cover_photo_url: `/api/images/${firstPhotoId}/view?thumb=true`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', albumId);
  } else {
    // Touch updated_at
    await supabase
      .from('albums')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', albumId);
  }

  return NextResponse.json({ success: true, addedCount: photoIds.length });
}

/**
 * DELETE /api/albums/[id]/photos
 * Remove a photo from an album
 * Body: { photoId: string } or query ?photoId=...
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: albumId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  let photoId = searchParams.get('photoId');

  if (!photoId) {
    try {
      const body = await request.json();
      photoId = body.photoId;
    } catch {
      // no body
    }
  }

  if (!photoId) {
    return NextResponse.json({ error: 'photoId is required.' }, { status: 400 });
  }

  // Delete relation
  const { error: delError } = await supabase
    .from('album_photos')
    .delete()
    .eq('album_id', albumId)
    .eq('photo_id', photoId)
    .eq('user_id', user.id);

  if (delError) {
    console.error('[albums/photos] Delete error:', delError);
    return NextResponse.json({ error: 'Failed to remove photo from album.' }, { status: 500 });
  }

  // Touch updated_at
  await supabase
    .from('albums')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', albumId);

  return NextResponse.json({ success: true, removedPhotoId: photoId });
}
