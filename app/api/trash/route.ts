import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSignedDownloadUrl } from '@/lib/r2';
import { getBunnyVideoUrls } from '@/lib/bunny';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // 1. Fetch all trashed photos
  const { data: images, error: dbError } = await supabase
    .from('images')
    .select('*')
    .like('ai_transform_type', 'trash%')
    .neq('ai_transform_type', 'trash:variant')
    .order('created_at', { ascending: false });

  if (dbError) {
    console.error('[trash] DB error:', dbError);
    return NextResponse.json({ error: 'Failed to fetch trashed photos.' }, { status: 500 });
  }

  const imageItems = await Promise.all(
    (images || []).map(async (img) => {
      let signedUrl: string | null = null;
      try {
        signedUrl = await getSignedDownloadUrl(img.r2_key, 3600);
      } catch (e) {
        console.error('[trash] failed to sign URL:', img.r2_key, e);
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
        viewUrl: `/api/images/${img.id}/view`,
        createdAt: img.created_at,
        parentImageId: img.parent_image_id,
        aiTransformType: img.ai_transform_type,
        mediaType: 'photo',
      };
    })
  );

  // 2. Fetch all trashed videos
  const { data: rawVideos, error: videoDbError } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', user.id)
    .like('error_message', 'trash%')
    .order('created_at', { ascending: false });

  if (videoDbError) {
    console.warn('[trash] Failed to fetch trashed videos:', videoDbError);
  }

  const videoItems = (rawVideos || []).map((v) => {
    const urls = getBunnyVideoUrls(v.stream_video_id);
    return {
      id: v.id,
      originalFilename: v.original_filename,
      compressedSizeBytes: 0,
      signedUrl: urls.posterUrl,
      viewUrl: urls.posterUrl,
      createdAt: v.created_at,
      mediaType: 'video',
      streamVideoId: v.stream_video_id,
      durationSeconds: v.duration_seconds || 0,
      embedUrl: urls.embedUrl,
    };
  });

  const allItems = [...imageItems, ...videoItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({ items: allItems, count: allItems.length });
}
