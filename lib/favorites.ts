'use client';

const FAVORITES_STORAGE_KEY = 'vault_favorite_photo_ids';
const MIGRATION_DONE_KEY = 'vault_favorites_cloud_migrated_v1';

// In-memory cache for ultra-fast zero-latency UI reads
let cachedFavorites: Set<string> | null = null;
let isSyncing = false;
let isMigrationRunning = false;

/**
 * Read current favorites synchronously (for instant React state initialization)
 */
export function getStoredFavorites(): Set<string> {
  if (typeof window === 'undefined') return new Set();

  if (cachedFavorites !== null) {
    return new Set(cachedFavorites);
  }

  // Load from local storage cache initially
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      cachedFavorites = new Set(Array.isArray(parsed) ? parsed : []);
    } else {
      cachedFavorites = new Set();
    }
  } catch {
    cachedFavorites = new Set();
  }

  // Kick off cloud synchronization in background
  syncFavoritesFromCloud();

  return new Set(cachedFavorites);
}

/**
 * Save in-memory and local cache, then notify UI subscribers
 */
function broadcastFavorites(favs: Set<string>): void {
  cachedFavorites = new Set(favs);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favs)));
      window.dispatchEvent(new Event('vault-favorites-updated'));
    } catch (err) {
      console.error('Failed to cache favorites:', err);
    }
  }
}

/**
 * Fetch latest favorites from Supabase and synchronize local cache
 */
export async function syncFavoritesFromCloud(): Promise<Set<string>> {
  if (typeof window === 'undefined' || isSyncing) {
    return cachedFavorites || new Set();
  }

  isSyncing = true;
  try {
    const res = await fetch('/api/favorites');
    if (!res.ok) {
      // If unauthorized, return whatever we have cached
      isSyncing = false;
      return cachedFavorites || new Set();
    }

    const data = await res.json();
    const cloudFavorites = new Set<string>(Array.isArray(data.favoriteIds) ? data.favoriteIds : []);

    // Check if we have pre-existing local favorites to migrate to the cloud
    if (!localStorage.getItem(MIGRATION_DONE_KEY) && !isMigrationRunning) {
      await migrateLocalFavoritesToCloud(cloudFavorites);
    } else {
      broadcastFavorites(cloudFavorites);
    }

    return cloudFavorites;
  } catch (err) {
    console.warn('[favorites] Could not sync with cloud, using cached favorites:', err);
    return cachedFavorites || new Set();
  } finally {
    isSyncing = false;
  }
}

/**
 * Automatically migrate legacy localStorage favorites to Supabase account
 */
async function migrateLocalFavoritesToCloud(cloudFavorites: Set<string>): Promise<void> {
  isMigrationRunning = true;
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const localList: string[] = raw ? JSON.parse(raw) : [];
    const missingInCloud = localList.filter((id) => !cloudFavorites.has(id));

    if (missingInCloud.length > 0) {
      console.log(`[favorites] Migrating ${missingInCloud.length} local favorites to cloud...`);
      for (const photoId of missingInCloud) {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoId, action: 'add' }),
        }).catch(() => null);
        cloudFavorites.add(photoId);
      }
    }

    localStorage.setItem(MIGRATION_DONE_KEY, 'true');
    broadcastFavorites(cloudFavorites);
  } catch (err) {
    console.error('[favorites] Migration error:', err);
  } finally {
    isMigrationRunning = false;
  }
}

/**
 * Toggle favorite status with instant optimistic update and cloud persistence
 */
export function toggleStoredFavorite(id: string): boolean {
  const current = getStoredFavorites();
  const isNowFav = !current.has(id);

  if (isNowFav) {
    current.add(id);
  } else {
    current.delete(id);
  }

  // 1. Instant optimistic update
  broadcastFavorites(current);

  // 2. Persist to Supabase in background
  if (typeof window !== 'undefined') {
    fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId: id, action: isNowFav ? 'add' : 'remove' }),
    }).catch((err) => {
      console.error('[favorites] Failed to persist toggle to cloud:', err);
    });
  }

  return isNowFav;
}

/**
 * Explicit save function (kept for backward compatibility)
 */
export function saveStoredFavorites(favs: Set<string>): void {
  broadcastFavorites(favs);
}
