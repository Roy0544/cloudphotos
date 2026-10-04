'use client';

export interface Album {
  id: string;
  title: string;
  description: string;
  coverPhotoUrl: string;
  coverPhotoId?: string;
  photoIds: string[];
  createdAt: string;
  updatedAt: string;
  privacy: 'family' | 'private';
}

const ALBUMS_STORAGE_KEY = 'vault_user_albums_v1';
const MIGRATION_DONE_KEY = 'vault_albums_cloud_migrated_v1';

let cachedAlbums: Album[] | null = null;
let isSyncing = false;
let isMigrationRunning = false;

/**
 * Synchronously get stored albums (for instant component rendering)
 */
export function getStoredAlbums(): Album[] {
  if (typeof window === 'undefined') return [];

  if (cachedAlbums !== null) {
    return [...cachedAlbums];
  }

  // Load from local storage cache initially
  try {
    const raw = localStorage.getItem(ALBUMS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      cachedAlbums = Array.isArray(parsed) ? parsed : [];
    } else {
      cachedAlbums = [];
    }
  } catch {
    cachedAlbums = [];
  }

  // Trigger cloud synchronization in background
  syncAlbumsFromCloud();

  return [...cachedAlbums];
}

/**
 * Broadcast local cache updates to subscribers
 */
function broadcastAlbums(albums: Album[]): void {
  cachedAlbums = [...albums];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ALBUMS_STORAGE_KEY, JSON.stringify(albums));
      window.dispatchEvent(new Event('vault-albums-updated'));
    } catch (err) {
      console.error('Failed to cache albums to localStorage:', err);
    }
  }
}

/**
 * Save stored albums locally & notify (kept for backward compatibility)
 */
export function saveStoredAlbums(albums: Album[]): void {
  broadcastAlbums(albums);
}

/**
 * Fetch all albums from Supabase and synchronize local state
 */
export async function syncAlbumsFromCloud(): Promise<Album[]> {
  if (typeof window === 'undefined' || isSyncing) {
    return cachedAlbums || [];
  }

  isSyncing = true;
  try {
    const res = await fetch('/api/albums');
    if (!res.ok) {
      isSyncing = false;
      return cachedAlbums || [];
    }

    const data = await res.json();
    const cloudAlbums: Album[] = Array.isArray(data.albums) ? data.albums : [];

    // Check if we need to migrate local-only albums to the cloud
    if (!localStorage.getItem(MIGRATION_DONE_KEY) && !isMigrationRunning) {
      await migrateLocalAlbumsToCloud(cloudAlbums);
    } else {
      broadcastAlbums(cloudAlbums);
    }

    return cloudAlbums;
  } catch (err) {
    console.warn('[albums] Could not sync with cloud, using cached albums:', err);
    return cachedAlbums || [];
  } finally {
    isSyncing = false;
  }
}

/**
 * Migrate legacy albums from localStorage to Supabase
 */
async function migrateLocalAlbumsToCloud(cloudAlbums: Album[]): Promise<void> {
  isMigrationRunning = true;
  try {
    const raw = localStorage.getItem(ALBUMS_STORAGE_KEY);
    const localList: Album[] = raw ? JSON.parse(raw) : [];

    // Match by title
    const existingTitles = new Set(cloudAlbums.map((a) => a.title.toLowerCase().trim()));
    const toMigrate = localList.filter((a) => !existingTitles.has(a.title.toLowerCase().trim()));

    if (toMigrate.length > 0) {
      console.log(`[albums] Migrating ${toMigrate.length} local albums to cloud...`);
      for (const album of toMigrate) {
        try {
          const res = await fetch('/api/albums', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: album.title,
              description: album.description,
              coverPhotoId: album.coverPhotoId,
              coverPhotoUrl: album.coverPhotoUrl,
              photoIds: album.photoIds,
              privacy: album.privacy,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.album) cloudAlbums.push(data.album);
          }
        } catch {
          // ignore individual failed migrations
        }
      }
    }

    localStorage.setItem(MIGRATION_DONE_KEY, 'true');
    broadcastAlbums(cloudAlbums);
  } catch (err) {
    console.error('[albums] Migration error:', err);
  } finally {
    isMigrationRunning = false;
  }
}

/**
 * Create a new album with optimistic local state and cloud persistence
 */
export function createAlbum(data: {
  title: string;
  description: string;
  coverPhotoUrl: string;
  coverPhotoId?: string;
  photoIds: string[];
  privacy: 'family' | 'private';
}): Album {
  const current = getStoredAlbums();
  const now = new Date().toISOString();
  const coverId = data.coverPhotoId || (data.photoIds.length > 0 ? data.photoIds[0] : undefined);

  // Temporary ID until backend assigns UUID
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const optimisticAlbum: Album = {
    id: tempId,
    title: data.title.trim() || 'Untitled Album',
    description: data.description.trim(),
    coverPhotoUrl: data.coverPhotoUrl,
    coverPhotoId: coverId,
    photoIds: data.photoIds,
    createdAt: now,
    updatedAt: now,
    privacy: data.privacy,
  };

  // 1. Optimistic UI update
  broadcastAlbums([optimisticAlbum, ...current]);

  // 2. Cloud persistence
  if (typeof window !== 'undefined') {
    fetch('/api/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: optimisticAlbum.title,
        description: optimisticAlbum.description,
        coverPhotoUrl: optimisticAlbum.coverPhotoUrl,
        coverPhotoId: optimisticAlbum.coverPhotoId,
        photoIds: optimisticAlbum.photoIds,
        privacy: optimisticAlbum.privacy,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (resData?.album) {
          // Replace optimistic album with real server album
          const fresh = getStoredAlbums().map((a) =>
            a.id === tempId ? resData.album : a
          );
          broadcastAlbums(fresh);
        }
      })
      .catch((err) => {
        console.error('[albums] Failed to save album to cloud:', err);
      });
  }

  return optimisticAlbum;
}

/**
 * Delete an album locally and in the cloud
 */
export function deleteAlbum(id: string): void {
  const current = getStoredAlbums();
  const updated = current.filter((a) => a.id !== id);

  // 1. Optimistic update
  broadcastAlbums(updated);

  // 2. Cloud delete
  if (typeof window !== 'undefined') {
    fetch(`/api/albums/${id}`, { method: 'DELETE' }).catch((err) => {
      console.error('[albums] Failed to delete album from cloud:', err);
    });
  }
}

/**
 * Add photo IDs to an existing album
 */
export function addPhotosToAlbum(albumId: string, photoIds: string[]): Album | null {
  const current = getStoredAlbums();
  const index = current.findIndex((a) => a.id === albumId);
  if (index === -1) return null;

  const existing = current[index];
  const mergedIds = Array.from(new Set([...existing.photoIds, ...photoIds]));
  const updatedAlbum: Album = {
    ...existing,
    coverPhotoId: existing.coverPhotoId || (mergedIds.length > 0 ? mergedIds[0] : undefined),
    photoIds: mergedIds,
    updatedAt: new Date().toISOString(),
  };

  current[index] = updatedAlbum;
  broadcastAlbums([...current]);

  // Cloud sync
  if (typeof window !== 'undefined') {
    fetch(`/api/albums/${albumId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoIds }),
    }).catch((err) => {
      console.error('[albums] Failed to add photos to cloud album:', err);
    });
  }

  return updatedAlbum;
}

/**
 * Remove a photo from an album
 */
export function removePhotoFromAlbum(albumId: string, photoId: string): Album | null {
  const current = getStoredAlbums();
  const index = current.findIndex((a) => a.id === albumId);
  if (index === -1) return null;

  const existing = current[index];
  const remainingIds = existing.photoIds.filter((id) => id !== photoId);
  const updatedAlbum: Album = {
    ...existing,
    coverPhotoId:
      existing.coverPhotoId === photoId
        ? remainingIds[0] || undefined
        : existing.coverPhotoId,
    photoIds: remainingIds,
    updatedAt: new Date().toISOString(),
  };

  current[index] = updatedAlbum;
  broadcastAlbums([...current]);

  // Cloud sync
  if (typeof window !== 'undefined') {
    fetch(`/api/albums/${albumId}/photos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId }),
    }).catch((err) => {
      console.error('[albums] Failed to remove photo from cloud album:', err);
    });
  }

  return updatedAlbum;
}

/**
 * Set a specific photo as the album cover
 */
export function setAlbumCover(albumId: string, photoId: string): Album | null {
  const current = getStoredAlbums();
  const index = current.findIndex((a) => a.id === albumId);
  if (index === -1) return null;

  const existing = current[index];
  const coverUrl = `/api/images/${photoId}/view?thumb=true`;
  const updatedAlbum: Album = {
    ...existing,
    coverPhotoId: photoId,
    coverPhotoUrl: coverUrl,
    updatedAt: new Date().toISOString(),
  };

  current[index] = updatedAlbum;
  broadcastAlbums([...current]);

  // Cloud sync
  if (typeof window !== 'undefined') {
    fetch(`/api/albums/${albumId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coverPhotoId: photoId, coverPhotoUrl: coverUrl }),
    }).catch((err) => {
      console.error('[albums] Failed to update album cover in cloud:', err);
    });
  }

  return updatedAlbum;
}

/**
 * Toggle a photo's presence in an album
 */
export function togglePhotoInAlbum(
  albumId: string,
  photoId: string
): { album: Album; added: boolean } | null {
  const current = getStoredAlbums();
  const index = current.findIndex((a) => a.id === albumId);
  if (index === -1) return null;

  const existing = current[index];
  const hasPhoto = existing.photoIds.includes(photoId);

  if (hasPhoto) {
    const updated = removePhotoFromAlbum(albumId, photoId);
    return updated ? { album: updated, added: false } : null;
  } else {
    const updated = addPhotosToAlbum(albumId, [photoId]);
    return updated ? { album: updated, added: true } : null;
  }
}

/**
 * Returns all albums that contain the given photo ID
 */
export function getAlbumsContainingPhoto(photoId: string): Album[] {
  return getStoredAlbums().filter((album) => album.photoIds.includes(photoId));
}
