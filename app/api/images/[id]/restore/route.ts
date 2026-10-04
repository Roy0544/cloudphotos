import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // Fetch image record
  const { data: img, error: dbError } = await supabase
    .from('images')
    .select('id, ai_transform_type')
    .eq('id', id)
    .single();

  if (dbError || !img) {
    return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
  }

  // Restore transform type
  let restoredType: string | null = null;
  if (typeof img.ai_transform_type === 'string' && img.ai_transform_type.startsWith('trash:')) {
    const rawRestored = img.ai_transform_type.replace(/^trash:/, '');
    restoredType = rawRestored === 'variant' ? null : rawRestored;
  }

  const { error: updateError } = await supabase
    .from('images')
    .update({ ai_transform_type: restoredType })
    .eq('id', id);

  if (updateError) {
    console.error('[restore] Failed to restore photo:', updateError);
    return NextResponse.json({ error: 'Failed to restore photo from trash.' }, { status: 500 });
  }

  // Also restore any child variants
  await supabase
    .from('images')
    .update({ ai_transform_type: null })
    .eq('parent_image_id', id)
    .eq('ai_transform_type', 'trash:variant');

  return NextResponse.json({ success: true, restored: true, id });
}
