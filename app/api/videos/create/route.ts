import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBunnyVideo, generateTusAuth } from '@/lib/bunny';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const filename = body.filename || 'Untitled Video';

    // 2. Create Video placeholder on Bunny Stream
    const bunnyVideo = await createBunnyVideo(filename);
    const videoGuid = bunnyVideo.guid;

    // 3. Generate TUS authorization signature
    const tusAuth = generateTusAuth(videoGuid, 7200); // 2 hours valid

    // 4. Save video record in Supabase
    const { data: dbVideo, error: dbError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        stream_video_id: videoGuid,
        original_filename: filename,
        status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      console.error('[api/videos/create] Supabase insert error:', dbError);
      return NextResponse.json({ error: 'Failed to record video metadata in vault.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: dbVideo.id,
      videoId: videoGuid,
      uploadEndpoint: tusAuth.uploadEndpoint,
      authorizationSignature: tusAuth.authorizationSignature,
      authorizationExpire: tusAuth.authorizationExpire,
      libraryId: tusAuth.libraryId,
      filename,
    });
  } catch (err: any) {
    console.error('[api/videos/create] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to initialize video upload.' }, { status: 500 });
  }
}
