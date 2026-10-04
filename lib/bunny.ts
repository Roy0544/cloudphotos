import crypto from 'crypto';

const LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID || '769850';
const API_KEY = process.env.BUNNY_STREAM_API_KEY || '';
const CDN_HOSTNAME = process.env.BUNNY_STREAM_CDN_HOSTNAME || 'vz-f7125f3d-dcb.b-cdn.net';
const BASE_API_URL = `https://video.bunnycdn.com/library/${LIBRARY_ID}`;

export interface BunnyVideoItem {
  videoLibraryId: number;
  guid: string;
  title: string;
  dateUploaded: string;
  views: number;
  isPublic: boolean;
  length: number;
  status: number; // 0 = Queued, 1 = Processing, 2 = Encoding, 3 = Finished, 4 = Resolution Finished (Playable), 5 = Failed
  framerate: number;
  width: number;
  height: number;
  availableResolutions?: string;
  thumbnailFileName?: string;
  encodeProgress?: number;
  storageSize?: number;
  hasMP4Fallback?: boolean;
}

export interface BunnyUrls {
  posterUrl: string;
  previewUrl: string;
  hlsUrl: string;
  embedUrl: string;
  mp4Url?: string;
}

/**
 * Allocate a new video GUID on Bunny.net Stream
 */
export async function createBunnyVideo(title: string): Promise<BunnyVideoItem> {
  if (!API_KEY) {
    throw new Error('BUNNY_STREAM_API_KEY is not configured in environment variables');
  }

  const response = await fetch(`${BASE_API_URL}/videos`, {
    method: 'POST',
    headers: {
      AccessKey: API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title || 'Untitled Video',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to create Bunny video (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Generate TUS authorization signature for client direct upload
 * Formula: SHA256(LibraryId + ApiKey + ExpirationTime + VideoId)
 */
export function generateTusAuth(videoId: string, expiresInSeconds: number = 3600) {
  if (!API_KEY) {
    throw new Error('BUNNY_STREAM_API_KEY is not configured in environment variables');
  }

  const expirationTime = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const rawString = `${LIBRARY_ID}${API_KEY}${expirationTime}${videoId}`;
  const signature = crypto.createHash('sha256').update(rawString).digest('hex');

  return {
    libraryId: LIBRARY_ID,
    videoId,
    authorizationSignature: signature,
    authorizationExpire: expirationTime,
    uploadEndpoint: 'https://video.bunnycdn.com/tusupload',
  };
}

/**
 * Retrieve video details and encoding status from Bunny Stream API
 */
export async function getBunnyVideoDetails(videoId: string): Promise<BunnyVideoItem | null> {
  if (!API_KEY) return null;

  try {
    const response = await fetch(`${BASE_API_URL}/videos/${videoId}`, {
      method: 'GET',
      headers: {
        AccessKey: API_KEY,
        Accept: 'application/json',
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  } catch (err) {
    console.error(`[Bunny Stream] Error fetching video ${videoId}:`, err);
    return null;
  }
}

/**
 * Permanently delete a video from Bunny.net Stream
 */
export async function deleteBunnyVideo(videoId: string): Promise<boolean> {
  if (!API_KEY) return false;

  try {
    const response = await fetch(`${BASE_API_URL}/videos/${videoId}`, {
      method: 'DELETE',
      headers: {
        AccessKey: API_KEY,
      },
    });

    return response.ok;
  } catch (err) {
    console.error(`[Bunny Stream] Error deleting video ${videoId}:`, err);
    return false;
  }
}

/**
 * Construct global CDN delivery URLs for a given video GUID
 */
export function getBunnyVideoUrls(videoId: string): BunnyUrls {
  const host = CDN_HOSTNAME;
  return {
    posterUrl: `https://${host}/${videoId}/thumbnail.jpg`,
    previewUrl: `https://${host}/${videoId}/preview.webp`,
    hlsUrl: `https://${host}/${videoId}/playlist.m3u8`,
    embedUrl: `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}?autoplay=true&loop=false&muted=false&preload=true&responsive=true`,
  };
}

/**
 * Fetch map of stream_video_id -> storageSize (in bytes) for all videos in the library
 */
export async function getBunnyVideosStorageMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!API_KEY) return map;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${BASE_API_URL}/videos?page=1&itemsPerPage=1000`, {
      method: 'GET',
      headers: {
        AccessKey: API_KEY,
        Accept: 'application/json',
      },
      signal: controller.signal,
      next: { revalidate: 30 },
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      for (const item of data.items || []) {
        if (item.guid) {
          map.set(item.guid, item.storageSize || 0);
        }
      }
    }
  } catch (err) {
    console.warn('[Bunny Stream] Failed to fetch video storage sizes:', err);
  }

  return map;
}

