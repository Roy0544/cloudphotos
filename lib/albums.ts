'use client';

export interface Album {
  id: string;
  title: string;
  description: string;
  coverPhotoUrl: string;
  photoIds: string[];
  createdAt: string;
  updatedAt: string;
  privacy: 'family' | 'private';
}

const ALBUMS_STORAGE_KEY = 'vault_user_albums_v1';

export function getStoredAlbums(): Album[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ALBUMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredAlbums(albums: Album[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ALBUMS_STORAGE_KEY, JSON.stringify(albums));
    window.dispatchEvent(new Event('vault-albums-updated'));
  } catch (err) {
    console.error('Failed to save albums to localStorage:', err);
  }
}

export function createAlbum(data: {
  title: string;
  description: string;
  coverPhotoUrl: string;
  photoIds: string[];
  privacy: 'family' | 'private';
}): Album {
  const current = getStoredAlbums();
  const now = new Date().toISOString();
  const newAlbum: Album = {
    id: `album-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: data.title.trim() || 'Untitled Album',
    description: data.description.trim(),
    coverPhotoUrl: data.coverPhotoUrl,
    photoIds: data.photoIds,
    createdAt: now,
    updatedAt: now,
    privacy: data.privacy,
  };

  const updated = [newAlbum, ...current];
  saveStoredAlbums(updated);
  return newAlbum;
}

export function deleteAlbum(id: string): void {
  const current = getStoredAlbums();
  const updated = current.filter((a) => a.id !== id);
  saveStoredAlbums(updated);
}

/**
 * Add photo IDs to an existing album without creating duplicates.
 */
export function addPhotosToAlbum(albumId: string, photoIds: string[]): Album | null {
  const current = getStoredAlbums();
  const index = current.findIndex((a) => a.id === albumId);
  if (index === -1) return null;

  const existing = current[index];
  const mergedIds = Array.from(new Set([...existing.photoIds, ...photoIds]));
  const updatedAlbum: Album = {
    ...existing,
    photoIds: mergedIds,
    updatedAt: new Date().toISOString(),
  };

  current[index] = updatedAlbum;
  saveStoredAlbums([...current]);
  return updatedAlbum;
}

/**
 * Remove a specific photo from an album.
 */
export function removePhotoFromAlbum(albumId: string, photoId: string): Album | null {
  const current = getStoredAlbums();
  const index = current.findIndex((a) => a.id === albumId);
  if (index === -1) return null;

  const existing = current[index];
  const updatedAlbum: Album = {
    ...existing,
    photoIds: existing.photoIds.filter((id) => id !== photoId),
    updatedAt: new Date().toISOString(),
  };

  current[index] = updatedAlbum;
  saveStoredAlbums([...current]);
  return updatedAlbum;
}

/**
 * Toggle a photo's presence in an album.
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
  const newPhotoIds = hasPhoto
    ? existing.photoIds.filter((id) => id !== photoId)
    : [...existing.photoIds, photoId];

  const updatedAlbum: Album = {
    ...existing,
    photoIds: newPhotoIds,
    updatedAt: new Date().toISOString(),
  };

  current[index] = updatedAlbum;
  saveStoredAlbums([...current]);
  return { album: updatedAlbum, added: !hasPhoto };
}

/**
 * Returns all albums that contain the given photo ID.
 */
export function getAlbumsContainingPhoto(photoId: string): Album[] {
  return getStoredAlbums().filter((album) => album.photoIds.includes(photoId));
}
