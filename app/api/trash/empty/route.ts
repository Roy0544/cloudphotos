import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteFromR2, getThumbnailKey } from '@/lib/r2';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // Fetch all trashed photos and variants
  const { data: trashed, error: dbError } = await supabase
    .from('images')
    .select('id, r2_key')
    .like('ai_transform_type', 'trash%');

  if (dbError) {
    console.error('[trash/empty] DB error:', dbError);
    return NextResponse.json({ error: 'Failed to query trashed photos.' }, { status: 500 });
  }

  // Delete all from R2 (main objects + thumbnails)
  for (const item of trashed || []) {
    if (item.r2_key) {
      await Promise.all([
        deleteFromR2(item.r2_key).catch((e) =>
          console.warn('[trash/empty] failed to delete R2 key:', item.r2_key, e)
        ),
        deleteFromR2(getThumbnailKey(item.r2_key)).catch(() => {}),
      ]);
    }
  }

  // Delete all rows from Supabase
  const { error: deleteError } = await supabase
    .from('images')
    .delete()
    .like('ai_transform_type', 'trash%');

  if (deleteError) {
    console.error('[trash/empty] DB delete error:', deleteError);
    return NextResponse.json({ error: 'Failed to purge trashed photos from database.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, purgedCount: trashed?.length || 0 });
}
