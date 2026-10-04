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
  ExternalLink,
  Sparkles,
  Camera,
  MapPin,
  Heart,
  Share2,
  Download,
  AlertCircle,
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
  Album,
} from '@/lib/albums';
import { toggleStoredFavorite, getStoredFavorites } from '@/lib/favorites';

interface RealPhoto {
  id: string;
  url: string;
  name: string;
  date: string;
}

export default function AlbumsPage() {
  const router = useRouter();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [allPhotosMap, setAllPhotosMap] = useState<Map<string, RealPhoto>>(
    new Map()
  );
  const [search, setSearch] = useState('');
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  const [activePhoto, setActivePhoto] = useState<RealPhoto | null>(null);
  const [albumToDelete, setAlbumToDelete] = useState<string | null>(null);

  // Sync albums from storage
  const syncAlbums = useCallback(() => {
    setAlbums(getStoredAlbums());
  }, []);

  useEffect(() => {
    syncAlbums();
    const handleUpdate = () => syncAlbums();
    window.addEventListener('vault-albums-updated', handleUpdate);
    return () => {
      window.removeEventListener('vault-albums-updated', handleUpdate);
    };
  }, [syncAlbums]);

  // Fetch real photos so we can display album photo grids
  useEffect(() => {
    fetch('/api/images')
      .then((res) => (res.ok ? res.json() : { images: [] }))
      .then((data) => {
        const map = new Map<string, RealPhoto>();
        (data.images || []).forEach((img: any) => {
          const d = new Date(img.createdAt);
          map.set(img.id, {
            id: img.id,
            url: img.signedUrl || `/api/images/${img.id}/view`,
            name: (img.originalFilename || 'Photo').replace(/\.[^/.]+$/, ''),
            date: d.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
          });
        });
        setAllPhotosMap(map);
      })
      .catch((err) => console.error('Failed to load photos map:', err));
  }, []);

  const handleDeleteAlbum = (id: string) => {
    deleteAlbum(id);
    syncAlbums();
    if (activeAlbum?.id === id) {
      setActiveAlbum(null);
    }
    setAlbumToDelete(null);
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
                      onClick={() => setActiveAlbum(album)}
                      className="relative aspect-[16/10] cursor-pointer overflow-hidden bg-[#161821] select-none"
                    >
                      {album.coverPhotoUrl ? (
                        <img
                          src={album.coverPhotoUrl}
                          alt={album.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#8c909f]">
                          <Images className="w-10 h-10 opacity-40" />
                        </div>
                      )}

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
                          onClick={() => setActiveAlbum(album)}
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
                          onClick={() => setActiveAlbum(album)}
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
        onOpenChange={(open) => !open && setActiveAlbum(null)}
      >
        <DialogContent className="max-w-5xl bg-[#121212]/95 backdrop-blur-2xl border-white/10 text-[#e5e2e1] p-6 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/10 space-y-0">
            <div>
              <DialogTitle className="font-[family-name:var(--font-manrope)] text-xl font-bold text-white flex items-center gap-2.5">
                <Images className="w-5 h-5 text-[#3b82f6]" />
                <span>{activeAlbum?.title}</span>
              </DialogTitle>
              {activeAlbum?.description && (
                <p className="text-xs text-[#8c909f] mt-0.5">
                  {activeAlbum.description}
                </p>
              )}
            </div>

            <span className="text-xs font-mono bg-[#3b82f6]/20 text-[#adc6ff] border border-[#3b82f6]/30 px-3 py-1 rounded-full">
              {activeAlbum?.photoIds.length}{' '}
              {activeAlbum?.photoIds.length === 1 ? 'photo' : 'photos'}
            </span>
          </DialogHeader>

          {/* Grid of photos in active album */}
          <div className="flex-1 overflow-y-auto py-4">
            {activeAlbum && activeAlbum.photoIds.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#8c909f]">
                No photos in this album yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {activeAlbum?.photoIds.map((photoId) => {
                  const photo = allPhotosMap.get(photoId);
                  if (!photo) return null;

                  return (
                    <div
                      key={photo.id}
                      onClick={() => setActivePhoto(photo)}
                      className="aspect-square relative rounded-xl overflow-hidden cursor-pointer group border border-white/10 hover:border-white/30 transition-all select-none"
                    >
                      <img
                        src={photo.url}
                        alt={photo.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
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

      {/* ── Single Photo Preview Modal within Album ── */}
      <Dialog
        open={!!activePhoto}
        onOpenChange={(open) => !open && setActivePhoto(null)}
      >
        <DialogContent className="max-w-3xl bg-[#141414]/95 backdrop-blur-2xl border-white/10 text-[#e5e2e1] p-4 rounded-2xl shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{activePhoto?.name || 'Photo'}</DialogTitle>
          </DialogHeader>
          {activePhoto && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-full max-h-[70vh] flex items-center justify-center overflow-hidden rounded-xl bg-black/60 p-2">
                <img
                  src={activePhoto.url}
                  alt={activePhoto.name}
                  className="max-h-[65vh] w-auto object-contain rounded-lg shadow-2xl"
                />
              </div>
              <div className="w-full flex items-center justify-between px-2 pt-2 text-xs">
                <div>
                  <h4 className="font-semibold text-white text-sm">
                    {activePhoto.name}
                  </h4>
                  <p className="text-[11px] text-[#8c909f]">{activePhoto.date}</p>
                </div>
                <Link href={`/editor?photoId=${activePhoto.id}`}>
                  <Button className="btn-vault text-xs rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Open in AI Studio</span>
                  </Button>
                </Link>
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
