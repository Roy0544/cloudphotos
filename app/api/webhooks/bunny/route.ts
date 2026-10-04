import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * Bunny.net Stream webhook listener
 * Called when a video has finished encoding (Status: 3) or failed (Status: 4/5)
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => null);

    if (!payload || !payload.VideoGuid) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    const videoGuid = payload.VideoGuid;
    const status = payload.Status; // 3 = Finished, 4 = Failed, 5 = CaptionsFailed

    // Use service role client to bypass user session in background webhooks
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (status === 3 || status === 4) {
      await supabase
        .from('videos')
        .update({
          status: 'ready',
          ready_at: new Date().toISOString(),
        })
        .eq('stream_video_id', videoGuid);

      return NextResponse.json({ success: true, processed: true, videoGuid, status: 'ready' });
    } else if (status === 5) {
      await supabase
        .from('videos')
        .update({
          status: 'error',
          error_message: 'Transcoding failed on Bunny.net Stream',
        })
        .eq('stream_video_id', videoGuid);

      return NextResponse.json({ success: true, processed: true, videoGuid, status: 'error' });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[webhooks/bunny] Error processing webhook:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
