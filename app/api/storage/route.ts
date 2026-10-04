import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBunnyVideosStorageMap } from '@/lib/bunny';

export const runtime = 'nodejs';

const VAULT_LIMIT_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 100 || i < 2 ? 0 : 1)} ${units[i]}`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // Fetch images, videos, and Bunny CDN storage sizes concurrently
  const [imagesRes, videosRes, bunnyStorageMap] = await Promise.all([
    supabase
      .from('images')
      .select('id, compressed_size_bytes, original_size_bytes, ai_transform_type'),
    supabase
      .from('videos')
      .select('id, stream_video_id, status, error_message')
      .eq('user_id', user.id),
    getBunnyVideosStorageMap(),
  ]);

  if (imagesRes.error) {
    console.error('[storage] DB fetch error:', imagesRes.error);
    return NextResponse.json({ error: 'Failed to fetch storage stats.' }, { status: 500 });
  }

  const images = imagesRes.data || [];
  const videos = videosRes.data || [];

  let totalActiveBytes = 0;
  let totalOriginalBytes = 0;
  let imageBytes = 0;
  let videoBytes = 0;
  let activeImageCount = 0;
  let activeVideoCount = 0;
  let trashCount = 0;

  // 1. Calculate photos storage (Cloudflare R2)
  images.forEach((img) => {
    const isTrashed =
      typeof img.ai_transform_type === 'string' &&
      img.ai_transform_type.startsWith('trash');
    if (isTrashed) {
      trashCount++;
    } else {
      activeImageCount++;
      const compBytes = img.compressed_size_bytes || 0;
      const origBytes = img.original_size_bytes || compBytes;
      imageBytes += compBytes;
      totalActiveBytes += compBytes;
      totalOriginalBytes += origBytes;
    }
  });

  // 2. Calculate videos storage (Bunny Stream multi-bitrate HLS + originals)
  videos.forEach((v) => {
    const isTrashed =
      typeof v.error_message === 'string' &&
      v.error_message.startsWith('trash');

    if (isTrashed) {
      trashCount++;
    } else {
      activeVideoCount++;
      const vidSizeBytes = bunnyStorageMap.get(v.stream_video_id) || 0;
      videoBytes += vidSizeBytes;
      totalActiveBytes += vidSizeBytes;
      totalOriginalBytes += vidSizeBytes;
    }
  });

  const remainingBytes = Math.max(0, VAULT_LIMIT_BYTES - totalActiveBytes);
  const usedPercentage = Math.min(100, (totalActiveBytes / VAULT_LIMIT_BYTES) * 100);
  const savedBytes = Math.max(0, totalOriginalBytes - totalActiveBytes);
  const savedPercent =
    totalOriginalBytes > 0
      ? Math.round((savedBytes / totalOriginalBytes) * 100)
      : 0;

  return NextResponse.json({
    storage: {
      totalBytes: totalActiveBytes,
      limitBytes: VAULT_LIMIT_BYTES,
      remainingBytes,
      usedPercentage: parseFloat(usedPercentage.toFixed(2)),
      formattedUsed: formatBytes(totalActiveBytes),
      formattedLimit: '10 GB',
      formattedRemaining: formatBytes(remainingBytes),
      imageBytes,
      videoBytes,
      formattedImageBytes: formatBytes(imageBytes),
      formattedVideoBytes: formatBytes(videoBytes),
      imageCount: activeImageCount,
      videoCount: activeVideoCount,
      totalCount: activeImageCount + activeVideoCount,
      trashCount,
      totalOriginalBytes,
      savedBytes,
      savedPercent,
    },
  });
}

