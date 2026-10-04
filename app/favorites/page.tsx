'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  Search,
  Sparkles,
  MapPin,
  Calendar,
  Camera,
  Share2,
  Trash2,
  LayoutGrid,
  Grid3X3,
  X,
  ArrowRight,
  Shield,
  Menu,
  Loader2,
  AlertCircle,
  Download,
  RefreshCw,
  HardDrive,
  Upload,
  FolderPlus,
  Check,
  Film,
  Play,
} from 'lucide-react';
import { VaultSidebar } from '@/components/vault-sidebar';
import { VaultMobileNav } from '@/components/vault-mobile-nav';
import { Button } from '@/components/ui/button';
import { VideoPlayerModal, VideoItem } from '@/components/video-player-modal';
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

interface FavoritePhoto {
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
  mediaType?: 'photo' | 'video';
  streamVideoId?: string;
  previewSrc?: string;
  embedUrl?: string;
  durationSeconds?: number;
  videoStatus?: string;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    const remainMins = mins % 60;
    return `${hrs}:${remainMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function FavoritesPage() {
  const router = useRouter();

  const [allPhotos, setAllPhotos] = useState<FavoritePhoto[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [gridDensity, setGridDensity] = useState<'cozy' | 'compact'>('cozy');
  const [activePhoto, setActivePhoto] = useState<FavoritePhoto | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const [unfavoritingId, setUnfavoritingId] = useState<string | null>(null);
  const [isAddToAlbumOpen, setIsAddToAlbumOpen] = useState(false);
  const [photoToTrash, setPhotoToTrash] = useState<FavoritePhoto | null>(null);
  const [failedMediaIds, setFailedMediaIds] = useState<Set<string>>(new Set());
  const [isTrashing, setIsTrashing] = useState(false);
  const [allAlbums, setAllAlbums] = useState<Album[]>([]);

  // Sync favorites & albums with shared storage
  const syncFavorites = useCallback(() => {
    setFavoriteIds(getStoredFavorites());
    setAllAlbums(getStoredAlbums());
  }, []);

  useEffect(() => {
    syncFavorites();
    const handleFavUpdate = () => syncFavorites();
    const handleAlbumsUpdate = () => setAllAlbums(getStoredAlbums());
    window.addEventListener('vault-favorites-updated', handleFavUpdate);
    window.addEventListener('vault-albums-updated', handleAlbumsUpdate);
    return () => {
      window.removeEventListener('vault-favorites-updated', handleFavUpdate);
      window.removeEventListener('vault-albums-updated', handleAlbumsUpdate);
    };
  }, [syncFavorites]);

  const handleTrashPhoto = async () => {
    if (!photoToTrash) return;
    setIsTrashing(true);
    try {
      const res = await fetch(`/api/images/${photoToTrash.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to move photo to trash');
      setAllPhotos((prev) => prev.filter((p) => p.id !== photoToTrash.id));
      setActivePhoto(null);
      setPhotoToTrash(null);
      window.dispatchEvent(new Event('vault-storage-updated'));
    } catch (err: any) {
      alert('Failed to trash photo: ' + err.message);
    } finally {
      setIsTrashing(false);
    }
  };

  const handleTrashVideo = async (videoId: string) => {
    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to move video to trash');
      setAllPhotos((prev) => prev.filter((p) => p.id !== videoId));
      setActiveVideo(null);
      window.dispatchEvent(new Event('vault-storage-updated'));
    } catch (err: any) {
      alert('Failed to trash video: ' + err.message);
    }
  };

  const handleToggleAlbum = (albumId: string) => {
    if (!activePhoto) return;
    togglePhotoInAlbum(albumId, activePhoto.id);
    setAllAlbums(getStoredAlbums());
  };

  // Fetch real images and videos concurrently
  const fetchPhotos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [imgRes, vidRes] = await Promise.all([
        fetch('/api/images'),
        fetch('/api/videos'),
      ]);

      if (imgRes.status === 401 || vidRes.status === 401) {
        router.push('/login');
        return;
      }

      if (!imgRes.ok) {
        throw new Error(`Failed to load images (HTTP ${imgRes.status})`);
      }

      const data = await imgRes.json();
      const rawImages: any[] = data.images || [];

      const mappedImages: FavoritePhoto[] = rawImages.map((img: any) => {
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
            'Starred',
            'WebP',
            savedPercent > 0 ? `-${savedPercent}%` : 'Lossless',
          ],
          originalSize: img.originalSizeBytes || 0,
          compressedSize: img.compressedSizeBytes || 0,
          width: img.width,
          height: img.height,
          rawDate: d,
          mediaType: 'photo' as const,
        };
      });

      let mappedVideos: FavoritePhoto[] = [];
      if (vidRes.ok) {
        const vidData = await vidRes.json();
        const rawVideos: any[] = vidData.videos || [];

        mappedVideos = rawVideos.map((v: any) => {
          const d = new Date(v.createdAt);
          const cleanName = (v.originalFilename || 'Video').replace(/\.[^/.]+$/, '');
          const durationLabel = formatDuration(v.durationSeconds);

          return {
            id: v.id,
            src: v.posterUrl,
            thumbnailSrc: v.posterUrl,
            previewSrc: v.previewUrl,
            embedUrl: v.embedUrl,
            streamVideoId: v.streamVideoId,
            caption: cleanName,
            location: 'Bunny Stream CDN',
            date: d.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            time: d.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            camera: `Bunny Stream • ${durationLabel}`,
            tags: ['Starred Video', 'HLS Stream'],
            originalSize: 0,
            compressedSize: 0,
            durationSeconds: v.durationSeconds,
            videoStatus: v.status,
            rawDate: d,
            mediaType: 'video' as const,
          };
        });
      }

      const combined = [...mappedImages, ...mappedVideos];
      combined.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
      setAllPhotos(combined);
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve photos.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Remove from favorites with smooth transition
  const removeFavorite = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    setUnfavoritingId(id);
    setTimeout(() => {
      toggleStoredFavorite(id);
      syncFavorites();
      setUnfavoritingId(null);
    }, 200);
  };

  // Filter photos: only those that are in favoriteIds, matching search query
  const favoritePhotos = useMemo(() => {
    return allPhotos.filter((p) => favoriteIds.has(p.id));
  }, [allPhotos, favoriteIds]);

  const filteredPhotos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return favoritePhotos;

    return favoritePhotos.filter((p) => {
      return (
        p.caption.toLowerCase().includes(q) ||
        p.date.toLowerCase().includes(q) ||
        p.camera.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [favoritePhotos, search]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-[#e5e2e1] font-[family-name:var(--font-inter)] selection:bg-[#4d8eff]/30 selection:text-white">
      {/* ── Desktop Sidebar ── */}
      <VaultSidebar
        currentRoute="favorites"
        favoritesCount={favoritePhotos.length}
      />

      {/* ── Main Viewport ── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Floating Top Header */}
        <header className="sticky top-0 z-40 glass-panel border-b border-white/10 border-t border-t-white/15 px-4 md:px-8 py-3.5 flex justify-between items-center shrink-0 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="md:hidden text-[#adc6ff] p-1.5 hover:bg-white/5 rounded-lg transition-colors pressable"
            >
              <Menu className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-[family-name:var(--font-manrope)] text-lg md:text-xl font-bold text-[#e5e2e1] tracking-tight">
                  Curated Favorites
                </h1>
                <span className="bg-[#adc6ff]/15 text-[#adc6ff] text-xs font-semibold px-2 py-0.5 rounded-full border border-[#adc6ff]/25 font-mono">
                  {favoritePhotos.length}
                </span>
              </div>
              <p className="text-[11px] text-[#8c909f] hidden sm:block">
                Starred moments preserved in lossless Cloudflare R2 storage
              </p>
            </div>
          </div>

          {/* Right Tools (Search, Density, Refresh) */}
          <div className="flex items-center gap-2.5">
            {/* Refresh */}
            <button
              onClick={fetchPhotos}
              disabled={isLoading}
              className="text-[#c2c6d6] hover:text-white hover:bg-white/5 p-2 rounded-full transition-colors pressable disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#3b82f6]' : ''}`}
              />
            </button>

            {/* Search */}
            <div className="glass-panel rounded-full px-3.5 py-1.5 hidden sm:flex items-center gap-2 w-48 lg:w-60 border border-white/10 focus-within:border-[#3b82f6]/50 transition-all">
              <Search className="w-4 h-4 text-[#8c909f] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search favorites…"
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

            {/* Density Toggle */}
            <div className="glass-panel rounded-lg p-0.5 border border-white/10 hidden md:flex items-center">
              <button
                onClick={() => setGridDensity('cozy')}
                className={`p-1.5 rounded-md transition-colors pressable ${
                  gridDensity === 'cozy'
                    ? 'bg-white/15 text-white'
                    : 'text-[#8c909f] hover:text-[#c2c6d6]'
                }`}
                title="Comfortable Gallery"
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
                title="Compact Grid"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>

            {/* Back to timeline quick shortcut */}
            <Link href="/timeline">
              <Button
                variant="outline"
                className="glass-button text-xs rounded-xl px-3 py-1.5 pressable text-[#adc6ff] border-white/15"
              >
                <span>All Memories</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </header>

        {/* ── Scrollable Favorites Gallery ── */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-12 pb-24 md:pb-12 pt-6">
          {isLoading && allPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin mb-3" />
              <p className="text-sm font-semibold text-[#e5e2e1]">
                Loading favorites...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-red-950/40 border border-red-500/30 flex items-center justify-center mb-3 text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-white text-base">
                Could not load favorites
              </h3>
              <p className="text-xs text-red-300/80 mt-1">{error}</p>
              <Button
                onClick={fetchPhotos}
                className="mt-4 btn-vault text-xs rounded-xl px-4 py-2"
              >
                Try Again
              </Button>
            </div>
          ) : favoritePhotos.length === 0 ? (
            /* Empty state when 0 photos favorited */
            <div className="flex flex-col items-center justify-center py-28 text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#adc6ff]/10 border border-[#adc6ff]/20 flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 text-[#adc6ff]" />
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#e5e2e1]">
                No favorites yet
              </h3>
              <p className="text-xs text-[#8c909f] mt-1.5 leading-relaxed">
                Tap the heart icon on any photo in your timeline to curate your most cherished family memories here.
              </p>
              <Link href="/timeline" className="mt-5">
                <Button className="btn-vault rounded-xl text-xs px-5 py-2.5 pressable shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  Browse Timeline Gallery
                </Button>
              </Link>
            </div>
          ) : filteredPhotos.length === 0 ? (
            /* Empty state when search matches nothing */
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-[#8c909f]" />
              </div>
              <h3 className="font-semibold text-white text-base">
                No matching favorites
              </h3>
              <p className="text-xs text-[#8c909f] mt-1">
                No favorited memories match &ldquo;{search}&rdquo;.
              </p>
              <Button
                variant="outline"
                onClick={() => setSearch('')}
                className="mt-4 glass-button text-xs rounded-xl"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div
              className={`grid gap-3.5 ${
                gridDensity === 'cozy'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2'
              }`}
            >
              {filteredPhotos.map((photo, idx) => {
                const isBeingRemoved = unfavoritingId === photo.id;
                const isVideo = photo.mediaType === 'video';
                const isHovered = hoveredVideoId === photo.id;
                const staggerDelay = Math.min(idx * 35, 300);

                const imageSrc =
                  isVideo && isHovered && photo.previewSrc
                    ? photo.previewSrc
                    : photo.thumbnailSrc || photo.src;

                return (
                  <div
                    key={photo.id}
                    style={{
                      animationDelay: `${staggerDelay}ms`,
                      opacity: isBeingRemoved ? 0 : 1,
                      transform: isBeingRemoved ? 'scale(0.92)' : 'none',
                      transition:
                        'opacity 200ms var(--ease-out), transform 200ms var(--ease-out)',
                    }}
                    onClick={() => {
                      if (isVideo) {
                        setActiveVideo({
                          id: photo.id,
                          streamVideoId: photo.streamVideoId || '',
                          originalFilename: photo.caption,
                          durationSeconds: photo.durationSeconds || 0,
                          status: photo.videoStatus || 'ready',
                          createdAt: photo.rawDate.toISOString(),
                          posterUrl: photo.src,
                          previewUrl: photo.previewSrc || '',
                          hlsUrl: '',
                          embedUrl: photo.embedUrl || '',
                        });
                      } else {
                        setActivePhoto(photo);
                      }
                    }}
                    onMouseEnter={() => isVideo && setHoveredVideoId(photo.id)}
                    onMouseLeave={() => isVideo && setHoveredVideoId(null)}
                    className="timeline-card-enter memory-card aspect-[4/3] group cursor-pointer relative block select-none overflow-hidden rounded-2xl border border-white/10"
                  >
                    {/* Real Image or Video Poster / Scrub WebP with Fallback */}
                    {isVideo && failedMediaIds.has(photo.id) ? (
                      <div className="w-full h-full bg-gradient-to-br from-[#121626] via-[#090b12] to-black flex flex-col items-center justify-center p-4 text-center select-none">
                        <div className="w-12 h-12 rounded-2xl bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center mb-2 shadow-inner">
                          <Film className="w-6 h-6 text-[#adc6ff]" />
                        </div>
                        <span className="text-[11px] text-[#e5e2e1] font-medium truncate max-w-[85%]">{photo.caption}</span>
                        <span className="text-[10px] text-[#8c909f] font-mono mt-0.5">{formatDuration(photo.durationSeconds || 0)}</span>
                      </div>
                    ) : (
                      <img
                        src={imageSrc}
                        alt={photo.caption}
                        loading="lazy"
                        onError={(e) => {
                          if (isVideo) {
                            setFailedMediaIds((prev) => new Set(prev).add(photo.id));
                          } else if (e.currentTarget.src !== photo.src) {
                            e.currentTarget.src = photo.src;
                          }
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    )}

                    {/* Video Center Play Indicator */}
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:bg-[#3b82f6]/80 group-hover:border-[#3b82f6]">
                          <Play className="w-4 h-4 fill-white translate-x-0.5" />
                        </div>
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40 p-4 flex flex-col justify-between">
                      {/* Top tags and favorite heart button */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 text-white/90">
                            {photo.date}
                          </span>
                          {isVideo && (
                            <span className="flex items-center gap-1 text-[10px] font-mono bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[#adc6ff]">
                              <Film className="w-2.5 h-2.5" />
                              {formatDuration(photo.durationSeconds || 0)}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => removeFavorite(e, photo.id)}
                          className="fav-icon p-2 rounded-full bg-black/60 backdrop-blur-md transition-all duration-200 hover:scale-110 pressable text-[#adc6ff] z-10"
                          title="Remove from favorites"
                        >
                          <Heart className="w-4 h-4 fill-[#adc6ff] text-[#adc6ff]" />
                        </button>
                      </div>

                      {/* Bottom caption and location */}
                      <div>
                        <h4 className="text-sm font-semibold text-white tracking-tight line-clamp-1">
                          {photo.caption}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-[#adc6ff] mt-0.5">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span className="truncate text-[11px]">
                            {photo.date} • {photo.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Photo Details Dialog Lightbox (Enlarged Immersion View) ── */}
      <Dialog
        open={!!activePhoto}
        onOpenChange={(open) => !open && setActivePhoto(null)}
      >
        <DialogContent className="max-w-6xl xl:max-w-7xl w-[95vw] h-[90vh] max-h-[92vh] bg-[#0c0c0c]/98 backdrop-blur-3xl border-white/10 text-[#e5e2e1] p-0 overflow-hidden rounded-2xl shadow-2xl flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {activePhoto?.caption || 'Favorite Memory'}
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

              {/* Inspector Sidebar */}
              <div className="w-full lg:w-84 p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10 bg-[#161616]/90 overflow-y-auto shrink-0">
                <div className="flex flex-col gap-5">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#adc6ff]">
                      Starred Archival Memory
                    </span>
                    <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-white mt-1">
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
                        <Camera className="w-3.5 h-3.5" /> Dimensions
                      </span>
                      <span className="text-[#e5e2e1] truncate max-w-[140px] text-right font-mono">
                        {activePhoto.camera}
                      </span>
                    </div>
                    {activePhoto.originalSize > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#8c909f] flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5" /> Original Size
                        </span>
                        <span className="text-[#e5e2e1] font-mono">
                          {(activePhoto.originalSize / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8c909f] mb-2">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {activePhoto.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] bg-[#3b82f6]/15 text-[#adc6ff] border border-[#3b82f6]/25 px-2.5 py-0.5 rounded-full"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
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

                  <Link
                    href={`/editor?photoId=${activePhoto.id}`}
                    className="w-full"
                  >
                    <Button className="w-full py-5 btn-vault rounded-xl text-xs font-semibold flex items-center justify-center gap-2 pressable shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                      <Sparkles className="w-4 h-4" />
                      <span>Open in AI Photo Studio</span>
                    </Button>
                  </Link>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        removeFavorite(e, activePhoto.id);
                        setActivePhoto(null);
                      }}
                      className="flex-1 glass-button text-xs rounded-xl gap-2 text-rose-400 hover:text-rose-300 border-white/15"
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      <span>Unfavorite</span>
                    </Button>

                    <a
                      href={`/api/images/${activePhoto.id}/download`}
                      download
                      className="inline-flex"
                    >
                      <Button
                        variant="outline"
                        className="glass-button rounded-xl text-xs px-3 text-[#c2c6d6] border-white/15"
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

      {/* ── Add to Album Dialog ── */}
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
            This photo will be moved to Trash. You can restore it anytime or delete it permanently from the Trash page.
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

      {/* ── Theater Video Player Modal ── */}
      <VideoPlayerModal
        video={activeVideo}
        open={!!activeVideo}
        onOpenChange={(open) => !open && setActiveVideo(null)}
        onTrash={handleTrashVideo}
        onToggleFavorite={(id) => {
          toggleStoredFavorite(id);
          setFavoriteIds(getStoredFavorites());
        }}
        isFavorite={activeVideo ? favoriteIds.has(activeVideo.id) : false}
      />

      {/* ── Mobile Bottom Navigation ── */}
      <VaultMobileNav currentRoute="favorites" />
    </div>
  );
}
