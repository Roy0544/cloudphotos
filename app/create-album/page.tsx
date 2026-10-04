'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  X,
  Check,
  Filter,
  LayoutGrid,
  Shield,
  Users,
  Image as ImageIcon,
  CheckCheck,
  RotateCcw,
  Loader2,
  Lock,
  Globe,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SelectablePhoto {
  id: number;
  url: string;
  alt: string;
  location: string;
  date: string;
}

const MOCK_PHOTOS: SelectablePhoto[] = [
  {
    id: 0,
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80',
    alt: 'Portrait in natural light',
    location: 'Studio Loft',
    date: 'Aug 20, 2026',
  },
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
    alt: 'Mountain landscape at sunrise',
    location: 'Sierra Peaks',
    date: 'Aug 18, 2026',
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1511895426328-dc8714191011?w=800&auto=format&fit=crop&q=80',
    alt: 'Family laughing indoors',
    location: 'Home Fireside',
    date: 'Aug 16, 2026',
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80',
    alt: 'Vintage Paris cafe',
    location: 'Rue Cler, Paris',
    date: 'Aug 14, 2026',
  },
  {
    id: 4,
    url: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=800&auto=format&fit=crop&q=80',
    alt: 'Golden retriever on rug',
    location: 'Backyard Porch',
    date: 'Aug 12, 2026',
  },
  {
    id: 5,
    url: 'https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=800&auto=format&fit=crop&q=80',
    alt: 'Cabin forest morning',
    location: 'Lake Tahoe Cabin',
    date: 'Aug 10, 2026',
  },
  {
    id: 6,
    url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop&q=80',
    alt: 'Campfire glow at night',
    location: 'Pine Campground',
    date: 'Aug 08, 2026',
  },
  {
    id: 7,
    url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&auto=format&fit=crop&q=80',
    alt: 'Paris cobblestone street at dusk',
    location: 'Montmartre Alley',
    date: 'Aug 06, 2026',
  },
  {
    id: 8,
    url: 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=800&auto=format&fit=crop&q=80',
    alt: 'Misty lake reflection',
    location: 'Fallen Leaf Dock',
    date: 'Aug 04, 2026',
  },
  {
    id: 9,
    url: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=800&auto=format&fit=crop&q=80',
    alt: 'Croissant and coffee breakfast',
    location: 'Cafe de Flore',
    date: 'Aug 02, 2026',
  },
  {
    id: 10,
    url: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=800&auto=format&fit=crop&q=80',
    alt: 'Raindrops on window at night',
    location: 'Bay Window',
    date: 'Jul 30, 2026',
  },
  {
    id: 11,
    url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop&q=80',
    alt: 'Louvre architecture reflection',
    location: 'Pyramid Courtyard',
    date: 'Jul 28, 2026',
  },
];

export default function CreateAlbumPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set([0, 1, 2]));
  const [privacy, setPrivacy] = useState<'family' | 'private'>('family');
  const [isSaving, setIsSaving] = useState(false);
  const [justToggledId, setJustToggledId] = useState<number | null>(null);

  const togglePhoto = (id: number) => {
    setJustToggledId(id);
    setTimeout(() => setJustToggledId(null), 250);

    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPhotos(new Set(MOCK_PHOTOS.map((p) => p.id)));
  };

  const clearSelection = () => {
    setSelectedPhotos(new Set());
  };

  const handleSave = () => {
    if (isSaving) return;
    setIsSaving(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 900);
  };

  // Find cover photo (first selected photo)
  const coverPhoto = MOCK_PHOTOS.find((p) => selectedPhotos.has(p.id)) || MOCK_PHOTOS[0];

  return (
    <div className="bg-[#0a0a0a] text-[#e5e2e1] min-h-screen flex flex-col font-[family-name:var(--font-inter)] selection:bg-[#4d8eff]/30 selection:text-white">
      {/* ── Sticky Top Bar ── */}
      <header className="sticky top-0 z-50 glass-panel border-x-0 border-t-0 border-b border-white/10 px-4 md:px-8 py-3.5 flex justify-between items-center w-full backdrop-blur-2xl">
        <Link href="/dashboard">
          <Button
            variant="ghost"
            className="glass-button text-[#c2c6d6] hover:text-white px-3.5 py-1.5 rounded-xl font-medium text-xs flex items-center gap-1.5 pressable"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </Button>
        </Link>

        <div className="text-center">
          <h1 className="font-[family-name:var(--font-manrope)] text-base md:text-lg font-bold text-[#e5e2e1]">
            Create Vault Album
          </h1>
          <p className="text-[11px] text-[#8c909f]">
            {selectedPhotos.size} {selectedPhotos.size === 1 ? 'memory' : 'memories'} selected
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || selectedPhotos.size === 0}
          className="btn-vault px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-2 pressable shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Vaulting...</span>
            </>
          ) : (
            <>
              <span>Save Album</span>
              <Check className="w-3.5 h-3.5" />
            </>
          )}
        </Button>
      </header>

      {/* ── Main Canvas ── */}
      <main className="flex-grow max-w-6xl mx-auto w-full px-4 md:px-10 py-8 flex flex-col gap-8">
        {/* Dynamic Cover Card & Inputs */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Live Album Cover Art Preview */}
          <div className="md:col-span-1 rounded-2xl glass-card overflow-hidden p-2 relative flex flex-col justify-end border border-white/10 min-h-[220px]">
            <img
              src={coverPhoto.url}
              alt="Album Cover Preview"
              className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent rounded-xl" />

            <div className="relative z-10 p-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#adc6ff] bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                Live Cover Art
              </span>
              <h3 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-white mt-1.5 line-clamp-1">
                {title.trim() || 'Untitled Album'}
              </h3>
              <p className="text-xs text-[#c2c6d6] line-clamp-1">
                {description.trim() || 'No description yet'}
              </p>
            </div>
          </div>

          {/* Album Metadata Fields */}
          <div className="md:col-span-2 flex flex-col justify-between gap-4 p-5 glass-panel rounded-2xl border border-white/10">
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#8c909f] block mb-1">
                  Album Name
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Summer Vacation 2026"
                  className="w-full bg-transparent border-b border-white/10 py-1.5 focus:border-[#3b82f6] font-[family-name:var(--font-manrope)] text-2xl md:text-3xl font-bold text-[#e5e2e1] placeholder:text-[#424754] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#8c909f] block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details, places, or context for family…"
                  className="w-full bg-transparent border-b border-white/10 py-1.5 focus:border-[#3b82f6] text-sm text-[#c2c6d6] placeholder:text-[#424754] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Privacy Circle Selector */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
              <span className="text-xs font-medium text-[#8c909f] mr-1">Sharing:</span>
              <button
                type="button"
                onClick={() => setPrivacy('family')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all pressable ${
                  privacy === 'family'
                    ? 'bg-[#3b82f6] text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                    : 'glass-panel text-[#8c909f] hover:text-white border-white/10'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Family Circle (Shared)</span>
              </button>

              <button
                type="button"
                onClick={() => setPrivacy('private')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all pressable ${
                  privacy === 'private'
                    ? 'bg-[#3b82f6] text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                    : 'glass-panel text-[#8c909f] hover:text-white border-white/10'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Private Only</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── Selection Action Bar (Sticky Subheader) ── */}
        <section className="sticky top-[61px] z-40 bg-[#0a0a0a]/90 backdrop-blur-xl py-3 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <h2 className="font-[family-name:var(--font-manrope)] text-base md:text-lg font-bold text-[#e5e2e1] flex items-center gap-2">
              <span>Select Photos</span>
              <span className="text-xs font-mono bg-[#3b82f6]/20 text-[#adc6ff] border border-[#3b82f6]/30 px-2.5 py-0.5 rounded-full">
                {selectedPhotos.size} chosen
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-[#c2c6d6] hover:text-white glass-button px-3 py-1.5 rounded-xl pressable"
            >
              Select All
            </button>
            {selectedPhotos.size > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-[#8c909f] hover:text-rose-400 glass-button px-3 py-1.5 rounded-xl pressable"
              >
                Clear
              </button>
            )}
          </div>
        </section>

        {/* ── Photo Grid with Tactile Selection Indicators ── */}
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pb-16">
          {MOCK_PHOTOS.map((photo, idx) => {
            const isSelected = selectedPhotos.has(photo.id);
            const isBumping = justToggledId === photo.id;
            const staggerDelay = Math.min(idx * 30, 250);

            return (
              <div
                key={photo.id}
                style={{ animationDelay: `${staggerDelay}ms` }}
                onClick={() => togglePhoto(photo.id)}
                className={`timeline-card-enter relative aspect-square cursor-pointer rounded-2xl overflow-hidden transition-all duration-200 select-none group border ${
                  isSelected
                    ? 'ring-2 ring-[#3b82f6] border-[#3b82f6] scale-[0.96] shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                    : 'border-white/10 hover:border-white/25 hover:scale-[0.99]'
                }`}
              >
                <img
                  src={photo.url}
                  alt={photo.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Selection Checkmark Button with Spring Pop */}
                <div
                  className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 z-20 ${
                    isSelected
                      ? 'bg-[#3b82f6] border border-[#3b82f6] text-white shadow-lg'
                      : 'bg-black/40 backdrop-blur-md border border-white/50 text-transparent group-hover:border-white'
                  } ${isBumping ? 'scale-125' : 'scale-100'}`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>

                {/* Photo Location & Date Caption on Hover */}
                <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] text-white font-medium truncate">{photo.location}</p>
                  <p className="text-[9px] text-[#8c909f]">{photo.date}</p>
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
