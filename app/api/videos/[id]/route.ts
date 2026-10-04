import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteBunnyVideo, getBunnyVideoDetails, getBunnyVideoUrls } from '@/lib/bunny';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: video, error: dbError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (dbError || !video) {
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    }

    // Auto-sync if not yet ready
    let status = video.status;
    let durationSeconds = video.duration_seconds || 0;
    if (status === 'pending' || status === 'processing') {
      const details = await getBunnyVideoDetails(video.stream_video_id);
      if (
        details &&
        (details.status === 3 ||
          details.status === 4 ||
          details.encodeProgress === 100 ||
          (details.availableResolutions && details.availableResolutions.length > 0))
      ) {
        status = 'ready';
        durationSeconds = Math.round(details.length || 0);
        await supabase
          .from('videos')
          .update({
            status: 'ready',
            duration_seconds: durationSeconds,
            ready_at: new Date().toISOString(),
          })
          .eq('id', id);
      }
    }

    const urls = getBunnyVideoUrls(video.stream_video_id);

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        streamVideoId: video.stream_video_id,
        originalFilename: video.original_filename,
        durationSeconds,
        status,
        readyAt: video.ready_at,
        createdAt: video.created_at,
        posterUrl: urls.posterUrl,
        previewUrl: urls.previewUrl,
        hlsUrl: urls.hlsUrl,
        embedUrl: urls.embedUrl,
      },
    });
  } catch (err: any) {
    console.error('[api/videos/[id]] GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !video) {
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    }

    if (permanent) {
      // 1. Delete from Bunny.net Stream
      await deleteBunnyVideo(video.stream_video_id);

      // 2. Delete row from Supabase
      const { error: deleteError } = await supabase
        .from('videos')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('[api/videos/[id]] Delete error:', deleteError);
        return NextResponse.json({ error: 'Failed to delete video row from vault.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, permanent: true, id });
    } else {
      // Soft delete -> move to trash
      const { error: trashError } = await supabase
        .from('videos')
        .update({ error_message: 'trash' })
        .eq('id', id);

      if (trashError) {
        console.error('[api/videos/[id]] Trash error:', trashError);
        return NextResponse.json({ error: 'Failed to move video to trash.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, trashed: true, id });
    }
  } catch (err: any) {
    console.error('[api/videos/[id]] DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
