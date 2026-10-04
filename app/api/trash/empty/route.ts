import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteFromR2, getThumbnailKey } from '@/lib/r2';
import { deleteBunnyVideo } from '@/lib/bunny';

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

  // 1. Fetch and purge all trashed photos and variants from R2 and Supabase
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

  // Delete image rows from Supabase
  await supabase
    .from('images')
    .delete()
    .like('ai_transform_type', 'trash%');

  // 2. Fetch and purge all trashed videos from Bunny Stream and Supabase
  const { data: trashedVideos } = await supabase
    .from('videos')
    .select('id, stream_video_id')
    .eq('user_id', user.id)
    .like('error_message', 'trash%');

  for (const v of trashedVideos || []) {
    if (v.stream_video_id) {
      await deleteBunnyVideo(v.stream_video_id).catch((e) =>
        console.warn('[trash/empty] failed to delete Bunny video:', v.stream_video_id, e)
      );
    }
  }

  await supabase
    .from('videos')
    .delete()
    .eq('user_id', user.id)
    .like('error_message', 'trash%');

  const totalPurged = (trashed?.length || 0) + (trashedVideos?.length || 0);
  return NextResponse.json({ success: true, purgedCount: totalPurged });
}
