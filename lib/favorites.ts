'use client';

const FAVORITES_STORAGE_KEY = 'vault_favorite_photo_ids';

export function getStoredFavorites(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveStoredFavorites(favs: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favs)));
    window.dispatchEvent(new Event('vault-favorites-updated'));
  } catch (err) {
    console.error('Failed to save favorites to localStorage:', err);
  }
}

export function toggleStoredFavorite(id: string): boolean {
  const current = getStoredFavorites();
  const isNowFav = !current.has(id);
  if (isNowFav) {
    current.add(id);
  } else {
    current.delete(id);
  }
  saveStoredFavorites(current);
  return isNowFav;
}
