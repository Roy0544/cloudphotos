import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * GET /api/albums/[id]
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: album, error: albumError } = await supabase
    .from('albums')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (albumError || !album) {
    return NextResponse.json({ error: 'Album not found.' }, { status: 404 });
  }

  const { data: photosData } = await supabase
    .from('album_photos')
    .select('photo_id')
    .eq('album_id', id)
    .order('added_at', { ascending: true });

  const photoIds = (photosData || []).map((r: { photo_id: string }) => r.photo_id);

  return NextResponse.json({
    album: {
      id: album.id,
      title: album.title,
      description: album.description || '',
      coverPhotoUrl: album.cover_photo_url || '',
      coverPhotoId: album.cover_photo_id,
      photoIds,
      createdAt: album.created_at,
      updatedAt: album.updated_at,
      privacy: album.privacy,
    },
  });
}

/**
 * PATCH /api/albums/[id]
 * Updates album details (title, description, cover)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: {
    title?: string;
    description?: string;
    coverPhotoUrl?: string;
    coverPhotoId?: string;
    privacy?: 'family' | 'private';
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.title === 'string') updates.title = body.title.trim();
  if (typeof body.description === 'string') updates.description = body.description.trim();
  if (typeof body.coverPhotoUrl === 'string') updates.cover_photo_url = body.coverPhotoUrl;
  if (typeof body.coverPhotoId !== 'undefined') updates.cover_photo_id = body.coverPhotoId || null;
  if (body.privacy) updates.privacy = body.privacy;

  const { data: updated, error: updateError } = await supabase
    .from('albums')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (updateError || !updated) {
    console.error('[albums] Update error:', updateError);
    return NextResponse.json({ error: 'Failed to update album.' }, { status: 500 });
  }

  return NextResponse.json({ album: updated });
}

/**
 * DELETE /api/albums/[id]
 * Deletes album (cascades in DB to delete associated album_photos)
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { error: delError } = await supabase
    .from('albums')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (delError) {
    console.error('[albums] Delete error:', delError);
    return NextResponse.json({ error: 'Failed to delete album.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, id });
}
