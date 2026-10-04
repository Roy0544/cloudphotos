'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Menu,
  Search,
  Bell,
  Heart,
  Play,
  LogOut,
  Upload,
  Shield,
  Sparkles,
  SlidersHorizontal,
  Calendar,
  MapPin,
  Camera,
  Maximize2,
  X,
  Share2,
  Grid3X3,
  LayoutGrid,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { VaultSidebar } from '@/components/vault-sidebar';
import { VaultMobileNav } from '@/components/vault-mobile-nav';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PhotoItem {
  id: string;
  src: string;
  caption: string;
  location: string;
  date: string;
  time: string;
  camera: string;
  tags: string[];
}

interface DateGroup {
  month: string;
  year: string;
  label: string;
  count: number;
  photos: PhotoItem[];
}

const TIMELINE_DATA: DateGroup[] = [
  {
    month: 'August',
    year: '2026',
    label: 'Paris Family Trip',
    count: 6,
    photos: [
      {
        id: 'aug-1',
        src: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&auto=format&fit=crop&q=85',
        caption: 'Morning in Le Marais',
        location: 'Paris, France',
        date: 'Aug 18, 2026',
        time: '08:42 AM',
        camera: 'Leica Q3 • 28mm f/1.7',
        tags: ['Travel', 'Elena', 'Breakfast'],
      },
      {
        id: 'aug-2',
        src: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&auto=format&fit=crop&q=85',
        caption: 'Strolling through Montmartre',
        location: 'Montmartre, Paris',
        date: 'Aug 16, 2026',
        time: '06:15 PM',
        camera: 'Sony A7 IV • 50mm f/1.4 GM',
        tags: ['Sunset', 'Kids', 'Architecture'],
      },
      {
        id: 'aug-3',
        src: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=1200&auto=format&fit=crop&q=85',
        caption: 'Fresh Baguettes & Espresso',
        location: 'Rue Cler, Paris',
        date: 'Aug 15, 2026',
        time: '09:10 AM',
        camera: 'Fujifilm X100V • 23mm f/2',
        tags: ['Food', 'Morning'],
      },
      {
        id: 'aug-4',
        src: 'https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=1200&auto=format&fit=crop&q=85',
        caption: 'Eiffel Illuminations',
        location: 'Champ de Mars, Paris',
        date: 'Aug 14, 2026',
        time: '10:30 PM',
        camera: 'Sony A7 IV • 24-70mm f/2.8',
        tags: ['Night', 'Elena', 'Celebration'],
      },
      {
        id: 'aug-5',
        src: 'https://images.unsplash.com/photo-1567959672803-d7d71f244e1f?w=1200&auto=format&fit=crop&q=85',
        caption: 'Glass Pyramid Symmetry',
        location: 'Musée du Louvre, Paris',
        date: 'Aug 12, 2026',
        time: '03:45 PM',
        camera: 'Leica Q3 • 28mm f/1.7',
        tags: ['Museum', 'Art'],
      },
      {
        id: 'aug-6',
        src: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&auto=format&fit=crop&q=85',
        caption: 'TGV to the Countryside',
        location: 'Gare de Lyon, Paris',
        date: 'Aug 10, 2026',
        time: '11:20 AM',
        camera: 'Fujifilm X100V • 23mm f/2',
        tags: ['Transit', 'Landscape'],
      },
    ],
  },
  {
    month: 'July',
    year: '2026',
    label: 'Cabin Weekend & Pines',
    count: 5,
    photos: [
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
      {
        id: 'jul-8',
        src: 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=1200&auto=format&fit=crop&q=85',
        caption: 'Evening Campfire Stories',
        location: 'Emerald Bay Cabin',
        date: 'Jul 25, 2026',
        time: '09:05 PM',
        camera: 'Fujifilm X100V • 23mm f/2',
        tags: ['Family', 'Bonfire', 'Kids'],
      },
      {
        id: 'jul-9',
        src: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200&auto=format&fit=crop&q=85',
        caption: 'Rest on the Granite Trail',
        location: 'Sierra Nevada Trail',
        date: 'Jul 24, 2026',
        time: '01:30 PM',
        camera: 'Sony A7 IV • 35mm f/1.4',
        tags: ['Hiking', 'Adventure'],
      },
      {
        id: 'jul-10',
        src: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&auto=format&fit=crop&q=85',
        caption: 'Pine Needle Forest Canopy',
        location: 'Tahoe National Forest',
        date: 'Jul 23, 2026',
        time: '11:15 AM',
        camera: 'Canon EOS R5 • 50mm f/1.2',
        tags: ['Forest', 'Macro'],
      },
      {
        id: 'jul-11',
        src: 'https://images.unsplash.com/photo-1444080748397-f442aa105c77?w=1200&auto=format&fit=crop&q=85',
        caption: 'Midnight Dock Stargazing',
        location: 'Fallen Leaf Lake',
        date: 'Jul 22, 2026',
        time: '11:50 PM',
        camera: 'Sony A7 IV • 14mm f/1.8 GM',
        tags: ['Stars', 'LongExposure', 'Elena'],
      },
    ],
  },
  {
    month: 'May',
    year: '2026',
    label: 'Home & Backyard Garden',
    count: 4,
    photos: [
      {
        id: 'may-12',
        src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&auto=format&fit=crop&q=85',
        caption: 'Barnaby Dozing in Morning Sun',
        location: 'Living Room Hearth',
        date: 'May 17, 2026',
        time: '07:40 AM',
        camera: 'Leica Q3 • 28mm f/1.7',
        tags: ['Pets', 'Barnaby', 'Cozy'],
      },
      {
        id: 'may-13',
        src: 'https://images.unsplash.com/photo-1521747116042-5a810fda9664?w=1200&auto=format&fit=crop&q=85',
        caption: 'Late Night Reading Nook',
        location: 'Study & Library',
        date: 'May 12, 2026',
        time: '11:10 PM',
        camera: 'Fujifilm X100V • 23mm f/2',
        tags: ['Books', 'StillLife'],
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
        id: 'may-15',
        src: 'https://images.unsplash.com/photo-1416169607655-0c2b3ce2e1cc?w=1200&auto=format&fit=crop&q=85',
        caption: 'First Heirloom Tomato Sprouts',
        location: 'Backyard Greenhouse',
        date: 'May 02, 2026',
        time: '10:00 AM',
        camera: 'Leica Q3 • 28mm f/1.7',
        tags: ['Garden', 'Greenhouse', 'Spring'],
      },
    ],
  },
];

const FILTER_PILLS = [
  { id: 'all', label: 'All Memories' },
  { id: 'favs', label: 'Favorites' },
  { id: 'paris', label: 'Paris 2026' },
  { id: 'cabin', label: 'Cabin Weekend' },
  { id: 'home', label: 'Home' },
];

export default function TimelinePage() {
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(['aug-3', 'jul-8', 'may-14'])
  );
  const [activePill, setActivePill] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [gridDensity, setGridDensity] = useState<'cozy' | 'compact'>('cozy');
  const [activePhoto, setActivePhoto] = useState<PhotoItem | null>(null);
  const [justToggledId, setJustToggledId] = useState<string | null>(null);

  const toggleFav = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    setJustToggledId(id);
    setTimeout(() => setJustToggledId(null), 300);

    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter groups
  const filteredGroups = useMemo(() => {
    return TIMELINE_DATA.map((group) => {
      const photos = group.photos.filter((p) => {
        // Search text matching
        const matchesSearch =
          p.caption.toLowerCase().includes(search.toLowerCase()) ||
          p.location.toLowerCase().includes(search.toLowerCase()) ||
          p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
          group.month.toLowerCase().includes(search.toLowerCase()) ||
          group.label.toLowerCase().includes(search.toLowerCase());

        if (!matchesSearch) return false;

        // Pill matching
        if (activePill === 'favs') return favorites.has(p.id);
        if (activePill === 'paris') return group.label.includes('Paris');
        if (activePill === 'cabin') return group.label.includes('Cabin');
        if (activePill === 'home') return group.label.includes('Home');
        return true;
      });
      return { ...group, photos };
    }).filter((g) => g.photos.length > 0);
  }, [search, activePill, favorites]);

  const totalFilteredPhotos = useMemo(() => {
    return filteredGroups.reduce((acc, g) => acc + g.photos.length, 0);
  }, [filteredGroups]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-[#e5e2e1] font-[family-name:var(--font-inter)] selection:bg-[#4d8eff]/30 selection:text-white">
      {/* ── Desktop Sidebar (Consistent across Dashboard & Timeline) ── */}
      <VaultSidebar
        currentRoute="timeline"
        activeFilter={activePill}
        onFilterChange={setActivePill}
        favoritesCount={favorites.size}
      />

      {/* ── Main Viewport ── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* ── Floating Header (Frosted glass chrome with top reflection) ── */}
        <header className="sticky top-0 z-40 glass-panel border-b border-white/10 border-t border-t-white/15 px-4 md:px-8 py-3.5 flex justify-between items-center shrink-0 backdrop-blur-2xl">
          {/* Left Title / Breadcrumb */}
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
                {totalFilteredPhotos} memories securely preserved
              </p>
            </div>
          </div>

          {/* Right Tools (Search, Density Switcher, Profile) */}
          <div className="flex items-center gap-2.5">
            {/* Search Bar */}
            <div className="glass-panel rounded-full px-3.5 py-1.5 hidden sm:flex items-center gap-2 w-48 lg:w-64 border border-white/10 focus-within:border-[#3b82f6]/50 focus-within:ring-2 focus-within:ring-[#3b82f6]/20 transition-all">
              <Search className="w-4 h-4 text-[#8c909f] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search places, family, tags…"
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

            {/* Notification Bell */}
            <button
              className="text-[#c2c6d6] hover:text-white hover:bg-white/5 p-2 rounded-full transition-colors pressable"
              title="Recent Activity"
            >
              <Bell className="w-4 h-4" />
            </button>

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
          {FILTER_PILLS.map((pill) => {
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
          {filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-[#8c909f]" />
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-lg font-semibold text-[#e5e2e1]">
                No memories found
              </h3>
              <p className="text-xs text-[#8c909f] mt-1.5 leading-relaxed">
                We couldn&apos;t find any photos matching &ldquo;{search}&rdquo;. Try another
                keyword or reset your filter pill.
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
            filteredGroups.map((group, groupIdx) => (
              <section key={group.month + group.year} className="mb-10 relative">
                {/* Floating Date Header */}
                <div className="sticky top-[108px] z-20 glass-panel -mx-4 md:mx-0 px-4 md:px-6 py-2.5 mb-3.5 rounded-none md:rounded-xl flex items-center justify-between border-x-0 md:border-x border-white/10 shadow-lg">
                  <div className="flex items-baseline gap-2.5">
                    <h2 className="font-[family-name:var(--font-manrope)] text-base md:text-lg font-bold text-[#e5e2e1]">
                      {group.month} {group.year}
                    </h2>
                    <span className="text-[11px] text-[#adc6ff] font-medium tracking-wide">
                      {group.label}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8c909f] font-mono">
                    {group.photos.length} {group.photos.length === 1 ? 'photo' : 'photos'}
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

                    // Stagger delay calculation for smooth cascading entrance
                    const staggerDelay = Math.min((groupIdx * 4 + photoIdx) * 35, 300);

                    return (
                      <div
                        key={photo.id}
                        style={{ animationDelay: `${staggerDelay}ms` }}
                        onClick={() => setActivePhoto(photo)}
                        className="timeline-card-enter memory-card aspect-square group cursor-pointer relative block select-none overflow-hidden"
                      >
                        {/* Photo Image with smooth hardware scale */}
                        <img
                          src={photo.src}
                          alt={photo.caption}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        />

                        {/* Top Gradient for Favorite Button Visibility */}
                        <div className="absolute top-0 inset-x-0 h-14 bg-gradient-to-b from-black/60 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                        {/* Favorite Button with Spring Micro-Bounce */}
                        <button
                          type="button"
                          onClick={(e) => toggleFav(e, photo.id)}
                          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          className={`fav-icon absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all duration-200 ${
                            isFav
                              ? 'bg-black/60 text-[#adc6ff] opacity-100'
                              : 'bg-black/40 text-white hover:bg-black/60'
                          } ${isBumping ? 'scale-125' : 'scale-100'}`}
                        >
                          <Heart
                            className={`w-4 h-4 transition-colors ${
                              isFav ? 'fill-[#adc6ff] text-[#adc6ff]' : 'text-white'
                            }`}
                          />
                        </button>

                        {/* Bottom Metadata Overlay */}
                        <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex flex-col justify-end">
                          <p className="text-xs font-semibold text-white line-clamp-1">
                            {photo.caption}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-[#c2c6d6] mt-0.5">
                            <MapPin className="w-3 h-3 text-[#adc6ff] shrink-0" />
                            <span className="truncate">{photo.location}</span>
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

      {/* ── Apple-Grade Photo Inspector / Lightbox Modal ── */}
      <Dialog open={!!activePhoto} onOpenChange={(open) => !open && setActivePhoto(null)}>
        <DialogContent className="max-w-4xl bg-[#131313]/95 backdrop-blur-2xl border-white/10 text-[#e5e2e1] p-0 overflow-hidden rounded-2xl shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{activePhoto?.caption || 'Photo Details'}</DialogTitle>
          </DialogHeader>

          {activePhoto && (
            <div className="flex flex-col lg:flex-row h-full max-h-[85vh]">
              {/* Photo Display */}
              <div className="flex-1 bg-black/60 flex items-center justify-center p-4 relative min-h-[300px] lg:min-h-[500px]">
                <img
                  src={activePhoto.src}
                  alt={activePhoto.caption}
                  className="max-h-[60vh] lg:max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
                />
              </div>

              {/* Inspector Metadata Sidebar */}
              <div className="w-full lg:w-80 p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10 bg-[#1c1b1b]/70 overflow-y-auto">
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

                  {/* Metadata Specs (Apple Photos Info Panel Style) */}
                  <div className="glass-panel rounded-xl p-3.5 flex flex-col gap-2.5 border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8c909f] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Date Taken
                      </span>
                      <span className="font-mono text-[#e5e2e1]">
                        {activePhoto.date} • {activePhoto.time}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8c909f] flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" /> Camera Lens
                      </span>
                      <span className="text-right text-[#e5e2e1] truncate max-w-[140px]">
                        {activePhoto.camera}
                      </span>
                    </div>
                  </div>

                  {/* Family & Content Tags */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8c909f] mb-2">
                      Sanctuary Tags
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
                  <Link href="/editor" className="w-full">
                    <Button className="w-full py-5 btn-vault rounded-xl text-sm font-semibold flex items-center justify-center gap-2 pressable shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                      <Sparkles className="w-4 h-4" />
                      <span>Open in AI Photo Editor</span>
                    </Button>
                  </Link>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={(e) => toggleFav(e, activePhoto.id)}
                      className={`flex-1 glass-button rounded-xl text-xs gap-1.5 ${
                        favorites.has(activePhoto.id) ? 'text-[#adc6ff]' : 'text-[#c2c6d6]'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          favorites.has(activePhoto.id) ? 'fill-[#adc6ff]' : ''
                        }`}
                      />
                      <span>
                        {favorites.has(activePhoto.id) ? 'Favorited' : 'Favorite'}
                      </span>
                    </Button>

                    <Button
                      variant="outline"
                      className="glass-button rounded-xl text-xs px-3 text-[#c2c6d6]"
                      title="Share link"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Mobile Bottom Navigation (Consistent Home, Timeline, Favorites, AI Studio, Upload) ── */}
      <VaultMobileNav
        currentRoute="timeline"
        activeFilter={activePill}
        onFilterChange={setActivePill}
      />
    </div>
  );
}
