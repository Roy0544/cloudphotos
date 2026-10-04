'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FolderPlus,
  Search,
  Images,
  Users,
  Lock,
  Plus,
  Trash2,
  Calendar,
  ArrowRight,
  Menu,
  X,
  Sparkles,
  Camera,
  MapPin,
  Heart,
  Share2,
  Download,
  AlertCircle,
  CheckCircle2,
  Check,
  Star,
} from 'lucide-react';
import { VaultSidebar } from '@/components/vault-sidebar';
import { VaultMobileNav } from '@/components/vault-mobile-nav';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getStoredAlbums,
  deleteAlbum,
  addPhotosToAlbum,
  removePhotoFromAlbum,
  setAlbumCover,
  Album,
} from '@/lib/albums';

interface RealPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  viewUrl: string;
  name: string;
  date: string;
}

export default function AlbumsPage() {
  const router = useRouter();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [allPhotos, setAllPhotos] = useState<RealPhoto[]>([]);
  const [allPhotosMap, setAllPhotosMap] = useState<Map<string, RealPhoto>>(
    new Map()
  );
  const [search, setSearch] = useState('');
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState<RealPhoto | null>(null);
  const [albumToDelete, setAlbumToDelete] = useState<string | null>(null);
  const [isAddPhotosOpen, setIsAddPhotosOpen] = useState(false);
  const [selectedPhotoIdsToAdd, setSelectedPhotoIdsToAdd] = useState<Set<string>>(
    new Set()
  );

  // Sync albums from storage without dependency loop
  const syncAlbums = useCallback(() => {
    const loaded = getStoredAlbums();
    setAlbums(loaded);
  }, []);

  useEffect(() => {
    syncAlbums();
    const handleUpdate = () => syncAlbums();
    window.addEventListener('vault-albums-updated', handleUpdate);
    return () => {
      window.removeEventListener('vault-albums-updated', handleUpdate);
    };
  }, [syncAlbums]);

  // Derive activeAlbum cleanly from albums and activeAlbumId
  const activeAlbum = useMemo(() => {
    if (!activeAlbumId) return null;
    return albums.find((a) => a.id === activeAlbumId) || null;
  }, [albums, activeAlbumId]);

  // Fetch real photos so we can display album photo grids
  useEffect(() => {
    fetch('/api/images')
      .then((res) => (res.ok ? res.json() : { images: [] }))
      .then((data) => {
        const list: RealPhoto[] = [];
        const map = new Map<string, RealPhoto>();
        (data.images || []).forEach((img: any) => {
          const d = new Date(img.createdAt);
          const p: RealPhoto = {
            id: img.id,
            url: img.signedUrl || `/api/images/${img.id}/view`,
            thumbnailUrl:
              img.thumbnailUrl ||
              img.thumbnailViewUrl ||
              img.signedUrl ||
              `/api/images/${img.id}/view?thumb=true`,
            viewUrl: `/api/images/${img.id}/view`,
            name: (img.originalFilename || 'Photo').replace(/\.[^/.]+$/, ''),
            date: d.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
          };
          list.push(p);
          map.set(img.id, p);
        });
        setAllPhotos(list);
        setAllPhotosMap(map);
      })
      .catch((err) => console.error('Failed to load photos map:', err));
  }, []);

  // Robust album cover resolver
  const getAlbumCoverUrl = useCallback(
    (album: Album): string | null => {
      // 1. If album has a designated coverPhotoId, find it or use its view endpoint
      if (album.coverPhotoId) {
        const photo = allPhotosMap.get(album.coverPhotoId);
        if (photo?.url) return photo.url;
        return `/api/images/${album.coverPhotoId}/view`;
      }
      // 2. If album has photos in photoIds, use the first photo
      if (album.photoIds && album.photoIds.length > 0) {
        const firstPhoto = allPhotosMap.get(album.photoIds[0]);
        if (firstPhoto?.url) return firstPhoto.url;
        return `/api/images/${album.photoIds[0]}/view`;
      }
      // 3. If album.coverPhotoUrl exists, use it
      if (album.coverPhotoUrl) {
        return album.coverPhotoUrl;
      }
      return null;
    },
    [allPhotosMap]
  );

  const handleDeleteAlbum = (id: string) => {
    deleteAlbum(id);
    syncAlbums();
    if (activeAlbumId === id) {
      setActiveAlbumId(null);
    }
    setAlbumToDelete(null);
  };

  const handleOpenAddPhotos = () => {
    setSelectedPhotoIdsToAdd(new Set());
    setIsAddPhotosOpen(true);
  };

  const handleConfirmAddPhotos = () => {
    if (!activeAlbum || selectedPhotoIdsToAdd.size === 0) return;
    addPhotosToAlbum(
      activeAlbum.id,
      Array.from(selectedPhotoIdsToAdd)
    );
    syncAlbums();
    setIsAddPhotosOpen(false);
  };

  const handleRemovePhoto = (albumId: string, photoId: string) => {
    removePhotoFromAlbum(albumId, photoId);
    syncAlbums();
  };

  const handleSetCover = (albumId: string, photoId: string) => {
    setAlbumCover(albumId, photoId);
    syncAlbums();
  };

  const filteredAlbums = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return albums;
    return albums.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }, [albums, search]);

  // Available photos to add (excluding photos already in active album)
  const availablePhotosToAdd = useMemo(() => {
    if (!activeAlbum) return [];
    const currentSet = new Set(activeAlbum.photoIds);
    return allPhotos.filter((p) => !currentSet.has(p.id));
  }, [activeAlbum, allPhotos]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-[#e5e2e1] font-[family-name:var(--font-inter)] selection:bg-[#4d8eff]/30 selection:text-white">
      {/* ── Desktop Sidebar ── */}
      <VaultSidebar currentRoute="albums" albumsCount={albums.length} />

      {/* ── Main Canvas Viewport ── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Floating Header */}
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
                  My Vault Albums
                </h1>
                <span className="bg-[#adc6ff]/15 text-[#adc6ff] text-xs font-semibold px-2 py-0.5 rounded-full border border-[#adc6ff]/25 font-mono">
                  {albums.length}
                </span>
              </div>
              <p className="text-[11px] text-[#8c909f] hidden sm:block">
                Curated collections of private memories
              </p>
            </div>
          </div>

          {/* Right Header Tools */}
          <div className="flex items-center gap-2.5">
            {/* Search */}
            <div className="glass-panel rounded-full px-3.5 py-1.5 hidden sm:flex items-center gap-2 w-48 lg:w-60 border border-white/10 focus-within:border-[#3b82f6]/50 transition-all">
              <Search className="w-4 h-4 text-[#8c909f] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search albums…"
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

            {/* Create Album Button */}
            <Link href="/create-album">
              <Button className="btn-vault text-xs rounded-xl px-4 py-2 font-semibold flex items-center gap-1.5 shadow-[0_0_20px_rgba(59,130,246,0.3)] pressable">
                <Plus className="w-4 h-4" />
                <span>New Album</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* ── Scrollable Albums Grid ── */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-12 pb-24 md:pb-12 pt-6">
          {albums.length === 0 ? (
            /* Zero State: No albums created yet */
            <div className="flex flex-col items-center justify-center py-28 text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#1e293b]/70 border border-white/10 flex items-center justify-center mb-4 shadow-inner">
                <FolderPlus className="w-8 h-8 text-[#adc6ff]" />
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#e5e2e1]">
                No Albums Created Yet
              </h3>
              <p className="text-xs text-[#8c909f] mt-1.5 leading-relaxed">
                Group your family vacations, holidays, and milestones into private albums.
              </p>
              <Link href="/create-album" className="mt-5">
                <Button className="btn-vault rounded-xl text-xs px-5 py-2.5 pressable shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  <FolderPlus className="w-4 h-4 mr-2" />
                  <span>Create Your First Album</span>
                </Button>
              </Link>
            </div>
          ) : filteredAlbums.length === 0 ? (
            /* Zero State: Search matches nothing */
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-[#8c909f]" />
              </div>
              <h3 className="font-semibold text-white text-base">
                No matching albums
              </h3>
              <p className="text-xs text-[#8c909f] mt-1">
                No albums match &ldquo;{search}&rdquo;.
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
            /* Albums Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredAlbums.map((album, idx) => {
                const staggerDelay = Math.min(idx * 40, 250);
                const d = new Date(album.createdAt);
                const formattedDate = d.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <div
                    key={album.id}
                    style={{ animationDelay: `${staggerDelay}ms` }}
                    className="timeline-card-enter group glass-card rounded-2xl overflow-hidden border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:scale-[1.01]"
                  >
                    {/* Album Cover Art */}
                    <div
                      onClick={() => setActiveAlbumId(album.id)}
                      className="relative aspect-[16/10] cursor-pointer overflow-hidden bg-[#161821] select-none"
                    >
                      {(() => {
                        const coverUrl = getAlbumCoverUrl(album);
                        return coverUrl ? (
                          <img
                            src={coverUrl}
                            alt={album.title}
                            loading="lazy"
                            onError={(e) => {
                              const fallbackId =
                                album.coverPhotoId || album.photoIds?.[0];
                              if (fallbackId) {
                                const fallback = `/api/images/${fallbackId}/view`;
                                if (
                                  e.currentTarget.src !==
                                  window.location.origin + fallback
                                ) {
                                  e.currentTarget.src = fallback;
                                }
                              }
                            }}
                            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#8c909f]">
                            <Images className="w-10 h-10 opacity-40" />
                          </div>
                        );
                      })()}

                      {/* Top Badges */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
                        <span className="text-[10px] font-semibold bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 text-white/95 flex items-center gap-1 font-mono">
                          <Images className="w-3 h-3 text-[#adc6ff]" />
                          <span>{album.photoIds.length}</span>
                        </span>

                        <span className="text-[10px] font-semibold bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 text-white/95 flex items-center gap-1">
                          {album.privacy === 'family' ? (
                            <>
                              <Users className="w-3 h-3 text-[#adc6ff]" />
                              <span>Family</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-amber-300" />
                              <span>Private</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Bottom Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    </div>

                    {/* Album Info Footer */}
                    <div className="p-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div
                          onClick={() => setActiveAlbumId(album.id)}
                          className="cursor-pointer"
                        >
                          <h3 className="font-[family-name:var(--font-manrope)] text-base font-bold text-white group-hover:text-[#adc6ff] transition-colors line-clamp-1">
                            {album.title}
                          </h3>
                          {album.description && (
                            <p className="text-xs text-[#8c909f] line-clamp-1 mt-0.5">
                              {album.description}
                            </p>
                          )}
                        </div>

                        {/* Delete Album Button */}
                        <button
                          type="button"
                          onClick={() => setAlbumToDelete(album.id)}
                          className="text-[#525764] hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors pressable"
                          title="Delete Album"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-[#8c909f]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formattedDate}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => setActiveAlbumId(album.id)}
                          className="text-[#adc6ff] hover:text-white font-medium flex items-center gap-1 pressable"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Album Photos Inspector Modal ── */}
      <Dialog
        open={!!activeAlbum}
        onOpenChange={(open) => !open && setActiveAlbumId(null)}
      >
        <DialogContent className="max-w-6xl xl:max-w-7xl w-[95vw] h-[90vh] max-h-[92vh] bg-[#101114]/98 backdrop-blur-3xl border-white/10 text-[#e5e2e1] p-5 md:p-7 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{activeAlbum?.title || 'Album Details'}</DialogTitle>
          </DialogHeader>

          {activeAlbum && (
            <>
              {/* Header Hero Banner with Album Cover */}
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#1a1c24]/90 via-[#13151c]/90 to-[#0e1017]/90 p-4 md:p-5 flex flex-col md:flex-row items-center gap-5 shrink-0 shadow-lg backdrop-blur-xl">
                {/* Cover Thumbnail */}
                <div className="relative w-full md:w-56 h-36 md:h-36 shrink-0 rounded-xl overflow-hidden bg-black/60 border border-white/10 group shadow-inner">
                  {(() => {
                    const coverUrl = getAlbumCoverUrl(activeAlbum);
                    return coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={activeAlbum.title}
                        onError={(e) => {
                          const fallbackId =
                            activeAlbum.coverPhotoId || activeAlbum.photoIds?.[0];
                          if (fallbackId) {
                            const fallback = `/api/images/${fallbackId}/view`;
                            if (
                              e.currentTarget.src !==
                              window.location.origin + fallback
                            ) {
                              e.currentTarget.src = fallback;
                            }
                          }
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#8c909f]">
                        <Images className="w-10 h-10 opacity-40" />
                      </div>
                    );
                  })()}
                  <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white/95 flex items-center gap-1 border border-white/15">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>Album Cover</span>
                  </div>
                </div>

                {/* Album Details */}
                <div className="flex-1 min-w-0 text-center md:text-left">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                    <h2 className="font-[family-name:var(--font-manrope)] text-2xl font-bold text-white tracking-tight truncate">
                      {activeAlbum.title}
                    </h2>
                    <span className="text-xs font-semibold bg-[#3b82f6]/20 text-[#adc6ff] border border-[#3b82f6]/30 px-3 py-0.5 rounded-full font-mono">
                      {activeAlbum.photoIds.length}{' '}
                      {activeAlbum.photoIds.length === 1 ? 'photo' : 'photos'}
                    </span>
                    <span className="text-xs font-semibold bg-white/5 border border-white/10 px-3 py-0.5 rounded-full text-white/80 flex items-center gap-1.5">
                      {activeAlbum.privacy === 'family' ? (
                        <>
                          <Users className="w-3.5 h-3.5 text-[#adc6ff]" />
                          <span>Family Circle</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-amber-300" />
                          <span>Private Vault</span>
                        </>
                      )}
                    </span>
                  </div>

                  {activeAlbum.description ? (
                    <p className="text-sm text-[#8c909f] mt-1.5 line-clamp-2">
                      {activeAlbum.description}
                    </p>
                  ) : (
                    <p className="text-xs text-[#525764] mt-1 italic">
                      No description provided
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3 text-xs text-[#8c909f]">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        Created{' '}
                        {new Date(activeAlbum.createdAt).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}
                      </span>
                    </span>
                    <span className="text-white/20 hidden sm:inline">•</span>
                    <span className="text-[#8c909f] text-[11px] hidden sm:inline">
                      Click any photo to inspect • Hover photo to set as cover or remove
                    </span>
                  </div>
                </div>

                {/* Add Photos Button */}
                <div className="shrink-0 flex items-center gap-2">
                  <Button
                    onClick={handleOpenAddPhotos}
                    className="btn-vault text-xs rounded-xl px-4 py-2.5 font-semibold flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.35)] pressable"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Photos</span>
                  </Button>
                </div>
              </div>

              {/* Grid of photos in active album */}
              <div className="flex-1 overflow-y-auto py-4 min-h-0 pr-1">
                {activeAlbum.photoIds.length === 0 ? (
                  <div className="py-24 text-center text-sm text-[#8c909f] flex flex-col items-center justify-center gap-3">
                    <p>No photos in this album yet.</p>
                    <Button
                      onClick={handleOpenAddPhotos}
                      className="btn-vault text-xs rounded-xl px-5 py-2.5 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Photos Now</span>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                    {activeAlbum.photoIds.map((photoId) => {
                      const photo = allPhotosMap.get(photoId);
                      if (!photo) return null;
                      const isCover =
                        photo.id ===
                        (activeAlbum.coverPhotoId || activeAlbum.photoIds[0]);

                      return (
                        <div
                          key={photo.id}
                          onClick={() => setActivePhoto(photo)}
                          className={`aspect-square relative rounded-xl overflow-hidden cursor-pointer group border select-none transition-all ${
                            isCover
                              ? 'border-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
                              : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          <img
                            src={photo.thumbnailUrl || photo.url}
                            alt={photo.name}
                            onError={(e) => {
                              if (
                                e.currentTarget.src !==
                                window.location.origin + photo.viewUrl
                              ) {
                                e.currentTarget.src = photo.viewUrl;
                              }
                            }}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />

                          {/* Cover Badge */}
                          {isCover && (
                            <div className="absolute top-2 left-2 z-10 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-semibold text-amber-300 flex items-center gap-1 border border-amber-400/40">
                              <Star className="w-2.5 h-2.5 fill-amber-300" />
                              <span>Cover</span>
                            </div>
                          )}

                          {/* Hover Overlay with Action Buttons */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              {/* Set as Cover button */}
                              {!isCover ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetCover(activeAlbum.id, photo.id);
                                  }}
                                  className="bg-black/70 hover:bg-amber-500/80 text-white/90 hover:text-white px-2 py-1 rounded-md text-[10px] font-medium flex items-center gap-1 transition-colors border border-white/20"
                                  title="Set as album cover"
                                >
                                  <Star className="w-3 h-3" />
                                  <span>Cover</span>
                                </button>
                              ) : (
                                <span />
                              )}

                              {/* Remove from album button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemovePhoto(activeAlbum.id, photo.id);
                                }}
                                className="bg-black/70 hover:bg-red-600/80 text-white/90 hover:text-white p-1 rounded-md transition-colors border border-white/20"
                                title="Remove from album"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <p className="text-[10px] text-white font-medium truncate">
                              {photo.name}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add Photos to Album Dialog ── */}
      <Dialog open={isAddPhotosOpen} onOpenChange={setIsAddPhotosOpen}>
        <DialogContent className="max-w-4xl lg:max-w-5xl w-[92vw] h-[85vh] max-h-[88vh] bg-[#141414]/98 backdrop-blur-2xl border-white/10 text-[#e5e2e1] p-6 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/10 space-y-0">
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#3b82f6]" />
                <span>Add Photos to &ldquo;{activeAlbum?.title}&rdquo;</span>
              </DialogTitle>
              <p className="text-xs text-[#8c909f] mt-0.5">
                Select photos from your vault to add to this collection
              </p>
            </div>

            <Button
              disabled={selectedPhotoIdsToAdd.size === 0}
              onClick={handleConfirmAddPhotos}
              className="btn-vault text-xs rounded-xl px-4 py-2 font-semibold flex items-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Add ({selectedPhotoIdsToAdd.size})</span>
            </Button>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 min-h-0">
            {availablePhotosToAdd.length === 0 ? (
              <div className="py-20 text-center text-xs text-[#8c909f]">
                All photos in your vault are already in this album!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {availablePhotosToAdd.map((photo) => {
                  const isSelected = selectedPhotoIdsToAdd.has(photo.id);

                  return (
                    <div
                      key={photo.id}
                      onClick={() => {
                        setSelectedPhotoIdsToAdd((prev) => {
                          const next = new Set(prev);
                          if (next.has(photo.id)) next.delete(photo.id);
                          else next.add(photo.id);
                          return next;
                        });
                      }}
                      className={`aspect-square relative rounded-xl overflow-hidden cursor-pointer group border select-none transition-all ${
                        isSelected
                          ? 'border-[#3b82f6] ring-2 ring-[#3b82f6] scale-[0.97]'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img
                        src={photo.thumbnailUrl || photo.url}
                        alt={photo.name}
                        onError={(e) => {
                          if (e.currentTarget.src !== window.location.origin + photo.viewUrl) {
                            e.currentTarget.src = photo.viewUrl;
                          }
                        }}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* Selection Checkmark */}
                      <div
                        className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-[#3b82f6] text-white shadow-lg'
                            : 'bg-black/50 text-transparent border border-white/20 group-hover:border-white/40'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-2 flex flex-col justify-end pointer-events-none">
                        <p className="text-[10px] text-white font-medium truncate">
                          {photo.name}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Single Photo Preview Modal within Album (Enlarged) ── */}
      <Dialog
        open={!!activePhoto}
        onOpenChange={(open) => !open && setActivePhoto(null)}
      >
        <DialogContent className="max-w-6xl xl:max-w-7xl w-[95vw] h-[90vh] max-h-[92vh] bg-[#0c0c0c]/98 backdrop-blur-3xl border-white/10 text-[#e5e2e1] p-0 overflow-hidden rounded-2xl shadow-2xl flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>{activePhoto?.name || 'Photo'}</DialogTitle>
          </DialogHeader>
          {activePhoto && (
            <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden">
              {/* Spacious Large Photo Viewport */}
              <div className="flex-1 bg-black/90 flex items-center justify-center p-4 md:p-8 relative h-[65vh] lg:h-full w-full overflow-hidden">
                <img
                  src={activePhoto.url}
                  alt={activePhoto.name}
                  onError={(e) => {
                    if (e.currentTarget.src !== window.location.origin + activePhoto.viewUrl) {
                      e.currentTarget.src = activePhoto.viewUrl;
                    }
                  }}
                  className="max-h-full max-w-full w-auto h-auto object-contain rounded-xl shadow-2xl select-none"
                />
              </div>

              {/* Sidebar Info */}
              <div className="w-full lg:w-80 p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10 bg-[#161616]/90 overflow-y-auto">
                <div className="flex flex-col gap-4">
                  <div>
                    <h4 className="font-[family-name:var(--font-manrope)] font-bold text-white text-lg">
                      {activePhoto.name}
                    </h4>
                    <p className="text-xs text-[#8c909f] mt-1">{activePhoto.date}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex flex-col gap-2.5">
                  <a
                    href={`/api/images/${activePhoto.id}/download`}
                    download
                    className="w-full"
                  >
                    <Button
                      variant="outline"
                      className="w-full glass-button text-xs rounded-xl py-4 font-semibold flex items-center justify-center gap-1.5 border-white/15"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Photo</span>
                    </Button>
                  </a>

                  <Link href={`/editor?photoId=${activePhoto.id}`} className="w-full">
                    <Button className="w-full btn-vault text-xs rounded-xl py-4 font-semibold flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(59,130,246,0.25)]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Edit in AI Studio</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={!!albumToDelete}
        onOpenChange={(open) => !open && setAlbumToDelete(null)}
      >
        <DialogContent className="max-w-md bg-[#161616] border-white/10 text-[#e5e2e1] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span>Delete Album</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#8c909f] mt-1 leading-relaxed">
            Are you sure you want to delete this album? Your photos will remain safely stored in your vault timeline.
          </p>
          <div className="flex items-center justify-end gap-2.5 mt-5">
            <Button
              variant="outline"
              onClick={() => setAlbumToDelete(null)}
              className="glass-button text-xs rounded-xl border-white/15"
            >
              Cancel
            </Button>
            <Button
              onClick={() => albumToDelete && handleDeleteAlbum(albumToDelete)}
              className="bg-red-600 hover:bg-red-700 text-white text-xs rounded-xl font-semibold px-4"
            >
              Delete Album
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Mobile Navigation ── */}
      <VaultMobileNav currentRoute="albums" />
    </div>
  );
}
