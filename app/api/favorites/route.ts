import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * GET /api/favorites
 * Returns array of favorite photo UUIDs for authenticated user
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

  const { data, error } = await supabase
    .from('favorites')
    .select('photo_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === 'PGRST205') {
      console.warn('[favorites] public.favorites table does not exist in Supabase yet.');
      return NextResponse.json({ favoriteIds: [], tableMissing: true });
    }
    console.error('[favorites] DB fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites.' }, { status: 500 });
  }

  const favoriteIds = (data || []).map((row: { photo_id: string }) => row.photo_id);
  return NextResponse.json({ favoriteIds });
}

/**
 * POST /api/favorites
 * Toggle or add a photo to favorites for the authenticated user
 * Body: { photoId: string, action?: 'toggle' | 'add' | 'remove' }
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

  let body: { photoId?: string; action?: 'toggle' | 'add' | 'remove' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { photoId, action = 'toggle' } = body;
  if (!photoId) {
    return NextResponse.json({ error: 'photoId is required.' }, { status: 400 });
  }

  // Check if currently favorited
  const { data: existing, error: checkError } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('photo_id', photoId)
    .maybeSingle();

  if (checkError) {
    if (checkError.code === 'PGRST205') {
      console.warn('[favorites] public.favorites table does not exist in Supabase yet.');
      return NextResponse.json({ error: 'Database table missing. Run migration script.' }, { status: 503 });
    }
    console.error('[favorites] Check error:', checkError);
    return NextResponse.json({ error: 'Database error.' }, { status: 500 });
  }

  const isFavorited = Boolean(existing);

  if (action === 'remove' || (action === 'toggle' && isFavorited)) {
    // Remove favorite
    const { error: delError } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('photo_id', photoId);

    if (delError) {
      console.error('[favorites] Delete error:', delError);
      return NextResponse.json({ error: 'Failed to unfavorite photo.' }, { status: 500 });
    }

    return NextResponse.json({ photoId, isFavorite: false });
  } else {
    // Add favorite
    const { error: insError } = await supabase
      .from('favorites')
      .insert({ user_id: user.id, photo_id: photoId });

    if (insError && insError.code !== '23505') { // ignore duplicate key
      console.error('[favorites] Insert error:', insError);
      return NextResponse.json({ error: 'Failed to favorite photo.' }, { status: 500 });
    }

    return NextResponse.json({ photoId, isFavorite: true });
  }
}

/**
 * DELETE /api/favorites
 * Explicitly unfavorite a photo
 */
export async function DELETE(request: NextRequest) {
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

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('photo_id', photoId);

  if (error) {
    console.error('[favorites] Delete error:', error);
    return NextResponse.json({ error: 'Failed to unfavorite photo.' }, { status: 500 });
  }

  return NextResponse.json({ photoId, isFavorite: false });
}
