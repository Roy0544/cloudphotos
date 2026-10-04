import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(
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

    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !video) {
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    }

    // Restore to 'ready' and clear trash state
    const { error: updateError } = await supabase
      .from('videos')
      .update({ status: 'ready', error_message: null })
      .eq('id', id);

    if (updateError) {
      console.error('[api/videos/[id]/restore] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to restore video.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, restored: true, id });
  } catch (err: any) {
    console.error('[api/videos/[id]/restore] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
