import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBunnyVideoDetails, getBunnyVideoUrls } from '@/lib/bunny';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // 1. Fetch user videos excluding trash
    const { data: rawVideos, error: dbError } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', user.id)
      .or('error_message.is.null,error_message.not.like.trash%')
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('[api/videos] DB error:', dbError);
      return NextResponse.json({ error: 'Failed to retrieve videos.' }, { status: 500 });
    }

    const videos = rawVideos || [];

    // 2. Auto-sync any pending/processing videos with Bunny.net Stream
    const decoratedVideos = await Promise.all(
      videos.map(async (v) => {
        let currentStatus = v.status;
        let currentDuration = v.duration_seconds || 0;

        // If status is still pending or processing, check Bunny directly
        if (currentStatus === 'pending' || currentStatus === 'processing') {
          try {
            const details = await getBunnyVideoDetails(v.stream_video_id);
            if (details) {
              // In Bunny Stream: Status 3 = Finished, Status 4 = Resolution finished (playable), encodeProgress = 100
              const isPlayable =
                details.status === 3 ||
                details.status === 4 ||
                details.encodeProgress === 100 ||
                (details.availableResolutions && details.availableResolutions.length > 0);

              if (isPlayable) {
                currentStatus = 'ready';
                currentDuration = Math.round(details.length || 0);

                // Update in database asynchronously
                await supabase
                  .from('videos')
                  .update({
                    status: 'ready',
                    duration_seconds: currentDuration,
                    ready_at: new Date().toISOString(),
                  })
                  .eq('id', v.id);
              } else if (details.status === 5) {
                currentStatus = 'error';
                await supabase
                  .from('videos')
                  .update({
                    status: 'error',
                    error_message: 'Transcoding failed on Bunny Stream',
                  })
                  .eq('id', v.id);
              }
            }
          } catch (syncErr) {
            console.warn(`[api/videos] Sync check failed for ${v.stream_video_id}:`, syncErr);
          }
        }

        const urls = getBunnyVideoUrls(v.stream_video_id);

        return {
          id: v.id,
          streamVideoId: v.stream_video_id,
          originalFilename: v.original_filename,
          durationSeconds: currentDuration,
          status: currentStatus,
          readyAt: v.ready_at,
          createdAt: v.created_at,
          posterUrl: urls.posterUrl,
          previewUrl: urls.previewUrl,
          hlsUrl: urls.hlsUrl,
          embedUrl: urls.embedUrl,
        };
      })
    );

    return NextResponse.json({
      success: true,
      videos: decoratedVideos,
    });
  } catch (err: any) {
    console.error('[api/videos] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
