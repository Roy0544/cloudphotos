'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Search,
  Bell,
  Heart,
  Upload,
  Sparkles,
  Calendar,
  MapPin,
  Camera,
  X,
  Share2,
  Grid3X3,
  LayoutGrid,
  Loader2,
  AlertCircle,
  Download,
  RefreshCw,
  HardDrive,
  FolderPlus,
  Check,
  Trash2,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { VaultSidebar } from '@/components/vault-sidebar';
import { VaultMobileNav } from '@/components/vault-mobile-nav';
import { UploadMediaDialog } from '@/components/upload-media-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getStoredFavorites,
  toggleStoredFavorite,
} from '@/lib/favorites';
import {
  getStoredAlbums,
  togglePhotoInAlbum,
  Album,
} from '@/lib/albums';

export interface PhotoItem {
  id: string;
  src: string;
  thumbnailSrc?: string;
  caption: string;
  location: string;
  date: string;
  time: string;
  camera: string;
  tags: string[];
  originalSize: number;
  compressedSize: number;
  width?: number;
  height?: number;
  rawDate: Date;
}

export interface DateGroup {
  month: string;
  year: string;
  label: string;
  count: number;
  photos: PhotoItem[];
}

export default function TimelinePage() {
  const router = useRouter();

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activePill, setActivePill] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [gridDensity, setGridDensity] = useState<'cozy' | 'compact'>('cozy');
  const [activePhoto, setActivePhoto] = useState<PhotoItem | null>(null);
  const [justToggledId, setJustToggledId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddToAlbumOpen, setIsAddToAlbumOpen] = useState(false);
  const [photoToTrash, setPhotoToTrash] = useState<PhotoItem | null>(null);
  const [isTrashing, setIsTrashing] = useState(false);
  const [allAlbums, setAllAlbums] = useState<Album[]>([]);

  // Sync albums & favorites with shared storage
  useEffect(() => {
    setFavorites(getStoredFavorites());
    setAllAlbums(getStoredAlbums());

    const handleFavUpdate = () => {
      setFavorites(getStoredFavorites());
    };
    const handleAlbumsUpdate = () => {
      setAllAlbums(getStoredAlbums());
    };

    window.addEventListener('vault-favorites-updated', handleFavUpdate);
    window.addEventListener('vault-albums-updated', handleAlbumsUpdate);
    return () => {
      window.removeEventListener('vault-favorites-updated', handleFavUpdate);
      window.removeEventListener('vault-albums-updated', handleAlbumsUpdate);
    };
  }, []);

  const handleTrashPhoto = async () => {
    if (!photoToTrash) return;
    setIsTrashing(true);
    try {
      const res = await fetch(`/api/images/${photoToTrash.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to move photo to trash');
      setPhotos((prev) => prev.filter((p) => p.id !== photoToTrash.id));
      setActivePhoto(null);
      setPhotoToTrash(null);
      window.dispatchEvent(new Event('vault-storage-updated'));
    } catch (err: any) {
      alert('Failed to trash photo: ' + err.message);
    } finally {
      setIsTrashing(false);
    }
  };

  const handleToggleAlbum = (albumId: string) => {
    if (!activePhoto) return;
    togglePhotoInAlbum(albumId, activePhoto.id);
    setAllAlbums(getStoredAlbums());
  };

  // Window-level drag-and-drop listener to open upload modal
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleWindowDrop = (e: DragEvent) => {
      if (
        e.dataTransfer &&
        e.dataTransfer.files &&
        e.dataTransfer.files.length > 0
      ) {
        e.preventDefault();
        setIsUploadOpen(true);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleWindowDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

  // Fetch real photos from /api/images
  const fetchPhotos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/images');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(`Failed to load vault photos (HTTP ${res.status})`);
      }

      const data = await res.json();
      const rawImages: any[] = data.images || [];

      const mapped: PhotoItem[] = rawImages.map((img: any) => {
        const d = new Date(img.createdAt);
        const cleanName = (img.originalFilename || 'Memory').replace(
          /\.[^/.]+$/,
          ''
        );
        const compKB = Math.round((img.compressedSizeBytes || 0) / 1024);
        const savedPercent =
          img.originalSizeBytes && img.compressedSizeBytes
            ? Math.round(
                (1 - img.compressedSizeBytes / img.originalSizeBytes) * 100
              )
            : 0;

        return {
          id: img.id,
          src: img.signedUrl || `/api/images/${img.id}/view`,
          thumbnailSrc:
            img.thumbnailUrl ||
            img.thumbnailViewUrl ||
            img.signedUrl ||
            `/api/images/${img.id}/view?thumb=true`,
          caption: cleanName,
          location: 'Cloud Vault',
          date: d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          time: d.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          camera:
            img.width && img.height
              ? `${img.width} × ${img.height} • WebP (${compKB} KB)`
              : `WebP • ${compKB} KB`,
          tags: [
            'R2 Vault',
            'WebP',
            savedPercent > 0 ? `-${savedPercent}%` : 'Optimized',
          ],
          originalSize: img.originalSizeBytes || 0,
          compressedSize: img.compressedSizeBytes || 0,
          width: img.width,
          height: img.height,
          rawDate: d,
        };
      });

      // Sort by newest date first
      mapped.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
      setPhotos(mapped);
    } catch (err: any) {
      setError(err.message || 'Unable to connect to vault storage.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Toggle favorite with feedback bounce & persistent storage
  const toggleFav = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    setJustToggledId(id);
    setTimeout(() => setJustToggledId(null), 300);

    toggleStoredFavorite(id);
    setFavorites(getStoredFavorites());
  };

  // Group photos into DateGroup sections by Month & Year
  const dateGroups = useMemo(() => {
    const groupsMap = new Map<
      string,
      { month: string; year: string; photos: PhotoItem[] }
    >();

    photos.forEach((photo) => {
      const year = photo.rawDate.getFullYear().toString();
      const month = photo.rawDate.toLocaleString('en-US', { month: 'long' });
      const key = `${year}-${photo.rawDate.getMonth()}`;

      if (!groupsMap.has(key)) {
        groupsMap.set(key, { month, year, photos: [] });
      }
      groupsMap.get(key)!.photos.push(photo);
    });

    return Array.from(groupsMap.values()).map((g) => ({
      month: g.month,
      year: g.year,
      label: `${g.month} ${g.year}`,
      count: g.photos.length,
      photos: g.photos,
    }));
  }, [photos]);

  // Dynamic filter pills based on real data
  const filterPills = useMemo(() => {
    const pills = [
      { id: 'all', label: `All Memories (${photos.length})` },
      { id: 'favs', label: `Favorites (${favorites.size})` },
    ];

    dateGroups.forEach((g) => {
      const id = `${g.month.toLowerCase()}-${g.year}`;
      pills.push({ id, label: `${g.month} ${g.year} (${g.photos.length})` });
    });

    return pills;
  }, [photos.length, favorites.size, dateGroups]);

  // Filter groups according to search & active pill
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();

    return dateGroups
      .map((group) => {
        const matchingPhotos = group.photos.filter((p) => {
          // Pill filter
          if (activePill === 'favs' && !favorites.has(p.id)) return false;
          const groupPillId = `${group.month.toLowerCase()}-${group.year}`;
          if (
            activePill !== 'all' &&
            activePill !== 'favs' &&
            activePill !== groupPillId
          ) {
            return false;
          }

          // Search text filter
          if (!q) return true;
          return (
            p.caption.toLowerCase().includes(q) ||
            p.date.toLowerCase().includes(q) ||
            p.camera.toLowerCase().includes(q) ||
            group.month.toLowerCase().includes(q) ||
            group.year.includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q))
          );
        });

        return { ...group, photos: matchingPhotos };
      })
      .filter((g) => g.photos.length > 0);
  }, [dateGroups, search, activePill, favorites]);

  const totalFilteredPhotos = useMemo(() => {
    return filteredGroups.reduce((acc, g) => acc + g.photos.length, 0);
  }, [filteredGroups]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-[#e5e2e1] font-[family-name:var(--font-inter)] selection:bg-[#4d8eff]/30 selection:text-white">
      {/* ── Desktop Sidebar ── */}
      <VaultSidebar
        currentRoute="timeline"
        activeFilter={activePill}
        onFilterChange={setActivePill}
        favoritesCount={favorites.size}
      />

      {/* ── Main Viewport ── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* ── Floating Header ── */}
        <header className="sticky top-0 z-40 glass-panel border-b border-white/10 border-t border-t-white/15 px-4 md:px-8 py-3.5 flex justify-between items-center shrink-0 backdrop-blur-2xl">
          {/* Left Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="md:hidden text-[#adc6ff] p-1.5 hover:bg-white/5 rounded-lg transition-colors pressable"
            >
              <Menu className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-[family-name:var(--font-manrope)] text-lg md:text-xl font-bold text-[#e5e2e1] tracking-tight">
                Vault Timeline
              </h1>
              <p className="text-[11px] text-[#8c909f] hidden sm:block">
                {isLoading
                  ? 'Loading memories...'
                  : `${photos.length} photos preserved in Cloudflare R2`}
              </p>
            </div>
          </div>

          {/* Right Tools */}
          <div className="flex items-center gap-2.5">
            {/* Refresh Button */}
            <button
              onClick={fetchPhotos}
              disabled={isLoading}
              className="text-[#c2c6d6] hover:text-white hover:bg-white/5 p-2 rounded-full transition-colors pressable disabled:opacity-50"
              title="Refresh timeline"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#3b82f6]' : ''}`}
              />
            </button>

            {/* Direct Upload Shortcut */}
            <Button
              onClick={() => setIsUploadOpen(true)}
              className="hidden sm:flex btn-vault text-xs rounded-xl px-3 py-1.5 font-semibold items-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.25)]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload</span>
            </Button>

            {/* Search Bar */}
            <div className="glass-panel rounded-full px-3.5 py-1.5 hidden sm:flex items-center gap-2 w-48 lg:w-64 border border-white/10 focus-within:border-[#3b82f6]/50 focus-within:ring-2 focus-within:ring-[#3b82f6]/20 transition-all">
              <Search className="w-4 h-4 text-[#8c909f] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search caption, date, specs…"
                className="bg-transparent border-none outline-none text-xs text-[#e5e2e1] placeholder:text-[#8c909f] w-full"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-[#8c909f] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Density Toggle (Cozy vs Compact) */}
            <div className="glass-panel rounded-lg p-0.5 border border-white/10 hidden md:flex items-center">
              <button
                onClick={() => setGridDensity('cozy')}
                className={`p-1.5 rounded-md transition-colors pressable ${
                  gridDensity === 'cozy'
                    ? 'bg-white/15 text-white'
                    : 'text-[#8c909f] hover:text-[#c2c6d6]'
                }`}
                title="Comfortable Gallery View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setGridDensity('compact')}
                className={`p-1.5 rounded-md transition-colors pressable ${
                  gridDensity === 'compact'
                    ? 'bg-white/15 text-white'
                    : 'text-[#8c909f] hover:text-[#c2c6d6]'
                }`}
                title="Compact Grid View"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>

            {/* Avatar */}
            <Avatar className="w-8 h-8 border border-white/20 pressable">
              <AvatarFallback className="bg-[#201f1f] text-[#adc6ff] text-xs font-semibold">
                FC
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* ── Subheader Filters Pill Bar ── */}
        <div className="sticky top-[58px] z-30 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {filterPills.map((pill) => {
            const isActive = activePill === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setActivePill(pill.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 pressable ${
                  isActive
                    ? 'bg-[#3b82f6] text-white shadow-[0_0_15px_rgba(59,130,246,0.35)]'
                    : 'glass-panel text-[#c2c6d6] hover:text-white hover:bg-white/10 border-white/10'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* ── Gallery Scrollable Canvas ── */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-12 pb-24 md:pb-12 pt-6">
          {/* Loading State */}
          {isLoading && photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin mb-3" />
              <p className="text-sm font-semibold text-[#e5e2e1]">
                Accessing Vault Memories...
              </p>
              <p className="text-xs text-[#8c909f] mt-1 max-w-xs">
                Fetching photo records and generating secure access tokens from Cloudflare R2
              </p>
            </div>
          ) : error ? (
            /* Error State */
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-red-950/40 border border-red-500/30 flex items-center justify-center mb-3 text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-white text-base">
                Could not load photos
              </h3>
              <p className="text-xs text-red-300/80 mt-1">{error}</p>
              <Button
                onClick={fetchPhotos}
                className="mt-4 btn-vault text-xs rounded-xl px-4 py-2"
              >
                Try Again
              </Button>
            </div>
          ) : photos.length === 0 ? (
            /* Empty State: No photos in vault */
            <div className="flex flex-col items-center justify-center py-24 text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#1e293b]/70 border border-white/10 flex items-center justify-center mb-4 shadow-inner">
                <Upload className="w-8 h-8 text-[#adc6ff]" />
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#e5e2e1]">
                Your Vault is Empty
              </h3>
              <p className="text-xs text-[#8c909f] mt-1.5 leading-relaxed">
                Start storing and preserving your family memories. Photos are automatically compressed to WebP and saved in Cloudflare R2.
              </p>
              <Button
                onClick={() => setIsUploadOpen(true)}
                className="mt-5 btn-vault text-xs font-semibold px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] pressable"
              >
                <Upload className="w-4 h-4 mr-2" />
                <span>Upload Photos</span>
              </Button>
            </div>
          ) : filteredGroups.length === 0 ? (
            /* Empty State: Search or filter has 0 results */
            <div className="flex flex-col items-center justify-center py-24 text-center max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-[#8c909f]" />
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-lg font-semibold text-[#e5e2e1]">
                No matching photos
              </h3>
              <p className="text-xs text-[#8c909f] mt-1.5 leading-relaxed">
                {activePill === 'favs'
                  ? 'No favorites match your current search. Tap the heart icon on any photo to add it to favorites.'
                  : `We couldn't find any photos matching "${search}".`}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setActivePill('all');
                }}
                className="mt-4 glass-button text-xs rounded-xl"
              >
                Reset filters
              </Button>
            </div>
          ) : (
            /* Real Photos Rendered */
            filteredGroups.map((group, groupIdx) => (
              <section key={group.month + group.year} className="mb-10 relative">
                {/* Date Group Header */}
                <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-xl px-4 py-2.5 mb-4 rounded-xl flex items-center justify-between border border-white/10 shadow-lg">
                  <div className="flex items-center gap-3">
                    <h2 className="font-[family-name:var(--font-manrope)] text-base md:text-lg font-bold text-white tracking-tight">
                      {group.month} {group.year}
                    </h2>
                    <span className="text-[11px] text-[#adc6ff] bg-[#3b82f6]/15 border border-[#3b82f6]/25 px-2.5 py-0.5 rounded-full font-medium">
                      Vault Archive
                    </span>
                  </div>
                  <span className="text-xs text-[#8c909f] font-mono">
                    {group.photos.length}{' '}
                    {group.photos.length === 1 ? 'photo' : 'photos'}
                  </span>
                </div>

                {/* Photo Grid with Stagger Animation */}
                <div
                  className={`grid gap-3 ${
                    gridDensity === 'cozy'
                      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                      : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 gap-2'
                  }`}
                >
                  {group.photos.map((photo, photoIdx) => {
                    const isFav = favorites.has(photo.id);
                    const isBumping = justToggledId === photo.id;
                    const staggerDelay = Math.min(
                      (groupIdx * 4 + photoIdx) * 35,
                      300
                    );

                    return (
                      <div
                        key={photo.id}
                        style={{ animationDelay: `${staggerDelay}ms` }}
                        onClick={() => setActivePhoto(photo)}
                        className="timeline-card-enter memory-card aspect-square group cursor-pointer relative block select-none overflow-hidden rounded-xl border border-white/10"
                      >
                        {/* Real Image (Lightweight thumbnail with fallback to full-res) */}
                        <img
                          src={photo.thumbnailSrc || photo.src}
                          alt={photo.caption}
                          loading="lazy"
                          onError={(e) => {
                            if (e.currentTarget.src !== photo.src) {
                              e.currentTarget.src = photo.src;
                            }
                          }}
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        />

                        {/* Top Gradient for Favorite Button Visibility */}
                        <div className="absolute top-0 inset-x-0 h-14 bg-gradient-to-b from-black/60 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                        {/* Favorite Button */}
                        <button
                          type="button"
                          onClick={(e) => toggleFav(e, photo.id)}
                          aria-label={
                            isFav ? 'Remove from favorites' : 'Add to favorites'
                          }
                          className={`fav-icon absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all duration-200 ${
                            isFav
                              ? 'bg-black/60 text-[#adc6ff] opacity-100'
                              : 'bg-black/40 text-white hover:bg-black/60'
                          } ${isBumping ? 'scale-125' : 'scale-100'}`}
                        >
                          <Heart
                            className={`w-4 h-4 transition-colors ${
                              isFav
                                ? 'fill-[#adc6ff] text-[#adc6ff]'
                                : 'text-white'
                            }`}
                          />
                        </button>

                        {/* Bottom Metadata Overlay */}
                        <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex flex-col justify-end">
                          <p className="text-xs font-semibold text-white line-clamp-1">
                            {photo.caption}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-[#c2c6d6] mt-0.5">
                            <Calendar className="w-3 h-3 text-[#adc6ff] shrink-0" />
                            <span className="truncate">{photo.date}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </main>

      {/* ── Photo Details / Lightbox Modal (Enlarged Immersion View) ── */}
      <Dialog
        open={!!activePhoto}
        onOpenChange={(open) => !open && setActivePhoto(null)}
      >
        <DialogContent className="max-w-6xl xl:max-w-7xl w-[95vw] h-[90vh] max-h-[92vh] bg-[#0c0c0c]/98 backdrop-blur-3xl border-white/10 text-[#e5e2e1] p-0 overflow-hidden rounded-2xl shadow-2xl flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {activePhoto?.caption || 'Photo Details'}
            </DialogTitle>
          </DialogHeader>

          {activePhoto && (
            <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden">
              {/* Spacious Large Photo Display */}
              <div className="flex-1 bg-black/90 flex items-center justify-center p-4 md:p-8 relative h-[60vh] lg:h-full w-full overflow-hidden">
                <img
                  src={activePhoto.src}
                  alt={activePhoto.caption}
                  onError={(e) => {
                    const fallback = `/api/images/${activePhoto.id}/view`;
                    if (e.currentTarget.src !== window.location.origin + fallback) {
                      e.currentTarget.src = fallback;
                    }
                  }}
                  className="max-h-full max-w-full w-auto h-auto object-contain rounded-xl shadow-2xl select-none"
                />
              </div>

              {/* Inspector Metadata Sidebar */}
              <div className="w-full lg:w-84 p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10 bg-[#161616]/90 overflow-y-auto shrink-0">
                <div className="flex flex-col gap-5">
                  {/* Caption & Location */}
                  <div>
                    <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-white leading-snug">
                      {activePhoto.caption}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-[#adc6ff] mt-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{activePhoto.location}</span>
                    </div>
                  </div>

                  {/* Metadata Specs */}
                  <div className="glass-panel rounded-xl p-3.5 flex flex-col gap-2.5 border-white/10 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8c909f] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Date Added
                      </span>
                      <span className="font-mono text-[#e5e2e1]">
                        {activePhoto.date} • {activePhoto.time}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#8c909f] flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" /> Format & Size
                      </span>
                      <span className="text-right text-[#e5e2e1] truncate max-w-[140px]">
                        {activePhoto.camera}
                      </span>
                    </div>

                    {activePhoto.originalSize > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#8c909f] flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5" /> Original Size
                        </span>
                        <span className="text-right text-[#e5e2e1] font-mono">
                          {(
                            activePhoto.originalSize /
                            (1024 * 1024)
                          ).toFixed(2)}{' '}
                          MB
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8c909f] mb-2">
                      Storage Metadata
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {activePhoto.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] font-medium bg-[#3b82f6]/15 text-[#adc6ff] border border-[#3b82f6]/25 px-2.5 py-0.5 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2.5 pt-6 mt-6 border-t border-white/10">
                  {/* Add to Album Button */}
                  <Button
                    variant="outline"
                    onClick={() => setIsAddToAlbumOpen(true)}
                    className="w-full glass-button rounded-xl text-xs py-5 font-semibold text-[#adc6ff] border-white/15 flex items-center justify-center gap-2 pressable"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>Add to Album</span>
                  </Button>

                  {/* Open in AI Editor */}
                  <Link href={`/editor?photoId=${activePhoto.id}`} className="w-full">
                    <Button className="w-full py-5 btn-vault rounded-xl text-xs font-semibold flex items-center justify-center gap-2 pressable shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                      <Sparkles className="w-4 h-4" />
                      <span>Open in AI Photo Editor</span>
                    </Button>
                  </Link>

                  <div className="flex gap-2">
                    {/* Favorite */}
                    <Button
                      variant="outline"
                      onClick={(e) => toggleFav(e, activePhoto.id)}
                      className={`flex-1 glass-button rounded-xl text-xs gap-1.5 ${
                        favorites.has(activePhoto.id)
                          ? 'text-[#adc6ff]'
                          : 'text-[#c2c6d6]'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          favorites.has(activePhoto.id)
                            ? 'fill-[#adc6ff]'
                            : ''
                        }`}
                      />
                      <span>
                        {favorites.has(activePhoto.id)
                          ? 'Favorited'
                          : 'Favorite'}
                      </span>
                    </Button>

                    {/* Download */}
                    <a
                      href={`/api/images/${activePhoto.id}/download`}
                      download
                      className="inline-flex"
                    >
                      <Button
                        variant="outline"
                        className="glass-button rounded-xl text-xs px-3 text-[#c2c6d6]"
                        title="Download image"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </a>

                    {/* Move to Trash */}
                    <Button
                      variant="outline"
                      onClick={() => setPhotoToTrash(activePhoto)}
                      className="glass-button rounded-xl text-xs px-3 text-[#8c909f] hover:text-red-400 hover:bg-red-950/20 border-white/15"
                      title="Move to Trash"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add Photo to Album Dialog ── */}
      <Dialog open={isAddToAlbumOpen} onOpenChange={setIsAddToAlbumOpen}>
        <DialogContent className="max-w-md bg-[#141414]/95 backdrop-blur-2xl border-white/10 text-[#e5e2e1] p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#3b82f6]" />
              <span>Add to Available Albums</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
            {allAlbums.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8c909f] flex flex-col items-center gap-3">
                <p>No albums created yet.</p>
                <Link href="/create-album">
                  <Button className="btn-vault text-xs rounded-xl px-4 py-2">
                    Create New Album
                  </Button>
                </Link>
              </div>
            ) : (
              allAlbums.map((album) => {
                const isIncluded = activePhoto ? album.photoIds.includes(activePhoto.id) : false;
                return (
                  <div
                    key={album.id}
                    onClick={() => handleToggleAlbum(album.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all pressable ${
                      isIncluded
                        ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
                        : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-black/40 overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
                        {album.coverPhotoUrl ? (
                          <img src={album.coverPhotoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FolderPlus className="w-4 h-4 text-[#8c909f]" />
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">{album.title}</p>
                        <p className="text-[10px] text-[#8c909f]">{album.photoIds.length} photos</p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        isIncluded
                          ? 'bg-[#3b82f6] text-white shadow-md'
                          : 'border border-white/20'
                      }`}
                    >
                      {isIncluded && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Move to Trash Confirmation Dialog ── */}
      <Dialog open={!!photoToTrash} onOpenChange={(open) => !open && setPhotoToTrash(null)}>
        <DialogContent className="max-w-md bg-[#141414] border-white/10 text-[#e5e2e1] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              <span>Move to Trash?</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#8c909f] mt-1 leading-relaxed">
            This photo will be moved to Trash. You can restore it anytime or delete it permanently to free up vault storage.
          </p>
          <div className="flex items-center justify-end gap-2.5 mt-5">
            <Button
              variant="outline"
              onClick={() => setPhotoToTrash(null)}
              className="glass-button text-xs rounded-xl border-white/15"
            >
              Cancel
            </Button>
            <Button
              disabled={isTrashing}
              onClick={handleTrashPhoto}
              className="bg-red-600 hover:bg-red-700 text-white text-xs rounded-xl font-semibold px-4 flex items-center gap-1.5"
            >
              {isTrashing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Moving...</span>
                </>
              ) : (
                <span>Move to Trash</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Direct Upload Modal ── */}
      <UploadMediaDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUploadComplete={fetchPhotos}
      />

      {/* ── Mobile Navigation ── */}
      <VaultMobileNav
        currentRoute="timeline"
        activeFilter={activePill}
        onFilterChange={setActivePill}
      />
    </div>
  );
}
