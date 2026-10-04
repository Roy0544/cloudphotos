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
