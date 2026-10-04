import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export interface AlbumDto {
  id: string;
  title: string;
  description: string;
  coverPhotoUrl: string;
  coverPhotoId?: string;
  photoIds: string[];
  createdAt: string;
  updatedAt: string;
  privacy: 'family' | 'private';
}

/**
 * GET /api/albums
 * Returns all albums for the authenticated user, complete with their photoIds array
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // 1. Fetch user albums
  const { data: albumsData, error: albumsError } = await supabase
    .from('albums')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (albumsError) {
    if (albumsError.code === 'PGRST205') {
      console.warn('[albums] public.albums table does not exist in Supabase yet.');
      return NextResponse.json({ albums: [], tableMissing: true });
    }
    console.error('[albums] DB error fetching albums:', albumsError);
    return NextResponse.json({ error: 'Failed to fetch albums.' }, { status: 500 });
  }

  const albumList = albumsData || [];
  if (albumList.length === 0) {
    return NextResponse.json({ albums: [] });
  }

  const albumIds = albumList.map((a: any) => a.id);

  // 2. Fetch associated photos for all user albums
  const { data: photosData, error: photosError } = await supabase
    .from('album_photos')
    .select('album_id, photo_id, added_at')
    .in('album_id', albumIds)
    .order('added_at', { ascending: true });

  if (photosError && photosError.code !== 'PGRST205') {
    console.error('[albums] DB error fetching album photos:', photosError);
  }

  const photosByAlbum = new Map<string, string[]>();
  (photosData || []).forEach((row: { album_id: string; photo_id: string }) => {
    const list = photosByAlbum.get(row.album_id) || [];
    list.push(row.photo_id);
    photosByAlbum.set(row.album_id, list);
  });

  // 3. Assemble formatted Album objects
  const albums: AlbumDto[] = albumList.map((row: any) => {
    const photoIds = photosByAlbum.get(row.id) || [];
    const coverId = row.cover_photo_id || (photoIds.length > 0 ? photoIds[0] : undefined);
    const coverUrl = row.cover_photo_url || (coverId ? `/api/images/${coverId}/view?thumb=true` : '');

    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      coverPhotoUrl: coverUrl,
      coverPhotoId: coverId,
      photoIds,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      privacy: (row.privacy as 'family' | 'private') || 'private',
    };
  });

  return NextResponse.json({ albums });
}

/**
 * POST /api/albums
 * Create a new album and associate photos
 */
export async function POST(request: NextRequest) {
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
    photoIds?: string[];
    privacy?: 'family' | 'private';
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const title = (body.title || 'Untitled Album').trim();
  const description = (body.description || '').trim();
  const photoIds = Array.isArray(body.photoIds) ? Array.from(new Set(body.photoIds)) : [];
  const privacy = body.privacy === 'family' ? 'family' : 'private';
  const coverPhotoId = body.coverPhotoId || (photoIds.length > 0 ? photoIds[0] : undefined);
  const coverPhotoUrl = body.coverPhotoUrl || (coverPhotoId ? `/api/images/${coverPhotoId}/view?thumb=true` : '');

  // 1. Insert album record
  const { data: albumRow, error: albumError } = await supabase
    .from('albums')
    .insert({
      user_id: user.id,
      title,
      description,
      cover_photo_id: coverPhotoId || null,
      cover_photo_url: coverPhotoUrl,
      privacy,
    })
    .select('*')
    .single();

  if (albumError) {
    if (albumError.code === 'PGRST205') {
      return NextResponse.json({ error: 'Database table missing. Please run migration script.' }, { status: 503 });
    }
    console.error('[albums] Failed to create album:', albumError);
    return NextResponse.json({ error: 'Failed to create album.' }, { status: 500 });
  }

  // 2. Insert photos into album_photos if provided
  if (photoIds.length > 0) {
    const photoRows = photoIds.map((pId) => ({
      album_id: albumRow.id,
      photo_id: pId,
      user_id: user.id,
    }));

    const { error: junctionError } = await supabase
      .from('album_photos')
      .insert(photoRows);

    if (junctionError) {
      console.error('[albums] Error associating photos with album:', junctionError);
    }
  }

  const createdAlbum: AlbumDto = {
    id: albumRow.id,
    title: albumRow.title,
    description: albumRow.description || '',
    coverPhotoUrl: albumRow.cover_photo_url || coverPhotoUrl,
    coverPhotoId: albumRow.cover_photo_id,
    photoIds,
    createdAt: albumRow.created_at,
    updatedAt: albumRow.updated_at,
    privacy: albumRow.privacy as 'family' | 'private',
  };

  return NextResponse.json({ album: createdAlbum }, { status: 201 });
}
