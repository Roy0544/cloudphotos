'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  Search,
  Sparkles,
  MapPin,
  Calendar,
  Camera,
  Share2,
  Trash2,
  SlidersHorizontal,
  LayoutGrid,
  Grid3X3,
  X,
  Play,
  ArrowRight,
  Shield,
  Menu,
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

interface FavoritePhoto {
  id: string;
  src: string;
  caption: string;
  location: string;
  date: string;
  time: string;
  camera: string;
  tags: string[];
  aspect?: string;
}

const INITIAL_FAVORITES: FavoritePhoto[] = [
  {
    id: 'aug-3',
    src: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=1200&auto=format&fit=crop&q=85',
    caption: 'Fresh Baguettes & Espresso',
    location: 'Rue Cler, Paris',
    date: 'Aug 15, 2026',
    time: '09:10 AM',
    camera: 'Fujifilm X100V • 23mm f/2',
    tags: ['Food', 'Morning', 'Elena'],
  },
  {
    id: 'jul-8',
    src: 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=1200&auto=format&fit=crop&q=85',
    caption: 'Evening Campfire Stories',
    location: 'Emerald Bay Cabin, Lake Tahoe',
    date: 'Jul 25, 2026',
    time: '09:05 PM',
    camera: 'Fujifilm X100V • 23mm f/2',
    tags: ['Family', 'Bonfire', 'Kids'],
  },
  {
    id: 'may-14',
    src: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=1200&auto=format&fit=crop&q=85',
    caption: 'Spring Rainfall on Windowpane',
    location: 'Kitchen Bay Window',
    date: 'May 08, 2026',
    time: '04:22 PM',
    camera: 'Sony A7 IV • 90mm Macro f/2.8',
    tags: ['Rain', 'Macro', 'Reflections'],
  },
  {
    id: 'aug-4',
    src: 'https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=1200&auto=format&fit=crop&q=85',
    caption: 'Eiffel Illuminations',
    location: 'Champ de Mars, Paris',
    date: 'Aug 14, 2026',
    time: '10:30 PM',
    camera: 'Sony A7 IV • 24-70mm f/2.8',
    tags: ['Night', 'Celebration'],
  },
  {
    id: 'jul-7',
    src: 'https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=1200&auto=format&fit=crop&q=85',
    caption: 'Misty Dawn by the Lake',
    location: 'Lake Tahoe, CA',
    date: 'Jul 26, 2026',
    time: '05:55 AM',
    camera: 'Canon EOS R5 • 24-105mm f/4',
    tags: ['Nature', 'Peaceful'],
  },
];

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoritePhoto[]>(INITIAL_FAVORITES);
  const [search, setSearch] = useState('');
  const [gridDensity, setGridDensity] = useState<'cozy' | 'compact'>('cozy');
  const [activePhoto, setActivePhoto] = useState<FavoritePhoto | null>(null);
  const [unfavoritingId, setUnfavoritingId] = useState<string | null>(null);

  const removeFavorite = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    setUnfavoritingId(id);
    setTimeout(() => {
      setFavorites((prev) => prev.filter((p) => p.id !== id));
      setUnfavoritingId(null);
    }, 200);
  };

  const filteredPhotos = favorites.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.caption.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-[#e5e2e1] font-[family-name:var(--font-inter)] selection:bg-[#4d8eff]/30 selection:text-white">
      {/* ── Desktop Sidebar ── */}
      <VaultSidebar currentRoute="favorites" favoritesCount={favorites.length} />

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
                  {favorites.length}
                </span>
              </div>
              <p className="text-[11px] text-[#8c909f] hidden sm:block">
                Star moments archived in lossless cloud storage
              </p>
            </div>
          </div>

          {/* Right Tools (Search, Density) */}
          <div className="flex items-center gap-2.5">
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
                <button onClick={() => setSearch('')} className="text-[#8c909f] hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Density Toggle */}
            <div className="glass-panel rounded-lg p-0.5 border border-white/10 hidden md:flex items-center">
              <button
                onClick={() => setGridDensity('cozy')}
                className={`p-1.5 rounded-md transition-colors pressable ${
                  gridDensity === 'cozy' ? 'bg-white/15 text-white' : 'text-[#8c909f] hover:text-[#c2c6d6]'
                }`}
                title="Comfortable Gallery"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setGridDensity('compact')}
                className={`p-1.5 rounded-md transition-colors pressable ${
                  gridDensity === 'compact' ? 'bg-white/15 text-white' : 'text-[#8c909f] hover:text-[#c2c6d6]'
                }`}
                title="Compact Grid"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>

            {/* Back to timeline quick shortcut */}
            <Link href="/timeline">
              <Button variant="outline" className="glass-button text-xs rounded-xl px-3 py-1.5 pressable text-[#adc6ff]">
                <span>All Memories</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </header>

        {/* ── Scrollable Favorites Gallery ── */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-12 pb-24 md:pb-12 pt-6">
          {filteredPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#adc6ff]/10 border border-[#adc6ff]/20 flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 text-[#adc6ff]" />
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#e5e2e1]">
                No favorites to display
              </h3>
              <p className="text-xs text-[#8c909f] mt-1.5 leading-relaxed">
                Tap the heart on any photo in your timeline to curate special family memories here.
              </p>
              <Link href="/timeline" className="mt-5">
                <Button className="btn-vault rounded-xl text-xs px-5 py-2.5 pressable shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  Browse Timeline Gallery
                </Button>
              </Link>
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
                const staggerDelay = Math.min(idx * 35, 300);

                return (
                  <div
                    key={photo.id}
                    style={{
                      animationDelay: `${staggerDelay}ms`,
                      opacity: isBeingRemoved ? 0 : 1,
                      transform: isBeingRemoved ? 'scale(0.92)' : 'none',
                      transition: 'opacity 200ms var(--ease-out), transform 200ms var(--ease-out)',
                    }}
                    onClick={() => setActivePhoto(photo)}
                    className="timeline-card-enter memory-card aspect-[4/3] group cursor-pointer relative block select-none overflow-hidden rounded-2xl border border-white/10"
                  >
                    <img
                      src={photo.src}
                      alt={photo.caption}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40 p-4 flex flex-col justify-between">
                      {/* Top tags and favorite heart button */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 text-white/90">
                          {photo.date}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => removeFavorite(e, photo.id)}
                          className="fav-icon p-2 rounded-full bg-black/60 backdrop-blur-md transition-all duration-200 hover:scale-110 pressable text-[#adc6ff]"
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
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate text-[11px]">{photo.location}</span>
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

      {/* ── Photo Details Dialog Lightbox ── */}
      <Dialog open={!!activePhoto} onOpenChange={(open) => !open && setActivePhoto(null)}>
        <DialogContent className="max-w-4xl bg-[#131313]/95 backdrop-blur-2xl border-white/10 text-[#e5e2e1] p-0 overflow-hidden rounded-2xl shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{activePhoto?.caption || 'Favorite Memory'}</DialogTitle>
          </DialogHeader>

          {activePhoto && (
            <div className="flex flex-col lg:flex-row h-full max-h-[85vh]">
              {/* Photo Display */}
              <div className="flex-1 bg-black/70 flex items-center justify-center p-4 relative min-h-[300px] lg:min-h-[500px]">
                <img
                  src={activePhoto.src}
                  alt={activePhoto.caption}
                  className="max-h-[60vh] lg:max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
                />
              </div>

              {/* Inspector Sidebar */}
              <div className="w-full lg:w-80 p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10 bg-[#1c1b1b]/70 overflow-y-auto">
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
                        <Calendar className="w-3.5 h-3.5" /> Date
                      </span>
                      <span className="font-mono text-[#e5e2e1]">
                        {activePhoto.date} • {activePhoto.time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8c909f] flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" /> Hardware
                      </span>
                      <span className="text-[#e5e2e1] truncate max-w-[140px] text-right">
                        {activePhoto.camera}
                      </span>
                    </div>
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
                  <Link href="/editor" className="w-full">
                    <Button className="w-full py-5 btn-vault rounded-xl text-sm font-semibold flex items-center justify-center gap-2 pressable shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                      <Sparkles className="w-4 h-4" />
                      <span>Open in AI Photo Studio</span>
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    onClick={(e) => {
                      removeFavorite(e, activePhoto.id);
                      setActivePhoto(null);
                    }}
                    className="glass-button text-xs rounded-xl gap-2 text-rose-400 hover:text-rose-300"
                  >
                    <Heart className="w-3.5 h-3.5 fill-current" />
                    <span>Remove from Favorites</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Mobile Bottom Navigation ── */}
      <VaultMobileNav currentRoute="favorites" />
    </div>
  );
}
