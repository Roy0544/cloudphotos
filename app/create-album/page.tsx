'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  X,
  Check,
  Upload,
  Users,
  Image as ImageIcon,
  Loader2,
  Lock,
  Sparkles,
  AlertCircle,
  FolderPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadMediaDialog } from '@/components/upload-media-dialog';
import { createAlbum } from '@/lib/albums';

interface RealPhoto {
  id: string;
  url: string;
  name: string;
  location: string;
  date: string;
}

function CreateAlbumInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectParam = searchParams.get('preselect');

  const [photos, setPhotos] = useState<RealPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<'family' | 'private'>('family');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [justToggledId, setJustToggledId] = useState<string | null>(null);

  // If navigated with preselected batch IDs
  useEffect(() => {
    if (preselectParam) {
      const ids = preselectParam.split(',').filter(Boolean);
      if (ids.length > 0) {
        setSelectedPhotos(new Set(ids));
        setCoverPhotoId(ids[0]);
      }
    }
  }, [preselectParam]);

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
        throw new Error(`Failed to load photos (HTTP ${res.status})`);
      }

      const data = await res.json();
      const rawImages: any[] = data.images || [];

      const mapped: RealPhoto[] = rawImages.map((img: any) => {
        const d = new Date(img.createdAt);
        return {
          id: img.id,
          url: img.signedUrl || `/api/images/${img.id}/view`,
          name: (img.originalFilename || 'Photo').replace(/\.[^/.]+$/, ''),
          location: 'Cloud Vault',
          date: d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        };
      });

      setPhotos(mapped);

      // Auto-select first photo if available and none selected yet and no preselect
      if (!preselectParam && mapped.length > 0 && selectedPhotos.size === 0) {
        setSelectedPhotos(new Set([mapped[0].id]));
        setCoverPhotoId(mapped[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve photos.');
    } finally {
      setIsLoading(false);
    }
  }, [router, preselectParam, selectedPhotos.size]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const togglePhoto = (id: string) => {
    setJustToggledId(id);
    setTimeout(() => setJustToggledId(null), 250);

    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (coverPhotoId === id) {
          const remaining = Array.from(next);
          setCoverPhotoId(remaining.length > 0 ? remaining[0] : null);
        }
      } else {
        next.add(id);
        if (!coverPhotoId) {
          setCoverPhotoId(id);
        }
      }
      return next;
    });
  };

  const selectAll = () => {
    const allIds = new Set(photos.map((p) => p.id));
    setSelectedPhotos(allIds);
    if (!coverPhotoId && photos.length > 0) {
      setCoverPhotoId(photos[0].id);
    }
  };

  const clearSelection = () => {
    setSelectedPhotos(new Set());
    setCoverPhotoId(null);
  };

  const handleSave = () => {
    if (isSaving || selectedPhotos.size === 0) return;
    setIsSaving(true);

    try {
      const chosenPhoto =
        photos.find((p) => p.id === coverPhotoId) ||
        photos.find((p) => selectedPhotos.has(p.id)) ||
        photos[0];

      const chosenCoverId = chosenPhoto?.id;
      const chosenCover =
        chosenPhoto?.url || (chosenCoverId ? `/api/images/${chosenCoverId}/view` : '');

      createAlbum({
        title: title.trim() || 'Untitled Vault Album',
        description: description.trim(),
        coverPhotoUrl: chosenCover,
        coverPhotoId: chosenCoverId,
        photoIds: Array.from(selectedPhotos),
        privacy,
      });

      setTimeout(() => {
        router.push('/albums');
      }, 500);
    } catch (err) {
      console.error('Failed to save album:', err);
      setIsSaving(false);
    }
  };

  // Find cover photo object
  const coverPhoto = useMemo(() => {
    if (coverPhotoId) {
      const found = photos.find((p) => p.id === coverPhotoId);
      if (found) return found;
    }
    const firstSelected = photos.find((p) => selectedPhotos.has(p.id));
    if (firstSelected) return firstSelected;
    return photos[0] || null;
  }, [coverPhotoId, selectedPhotos, photos]);

  return (
    <div className="bg-[#0a0a0a] text-[#e5e2e1] min-h-screen flex flex-col font-[family-name:var(--font-inter)] selection:bg-[#4d8eff]/30 selection:text-white">
      {/* ── Sticky Top Bar ── */}
      <header className="sticky top-0 z-50 glass-panel border-x-0 border-t-0 border-b border-white/10 px-4 md:px-8 py-3.5 flex justify-between items-center w-full backdrop-blur-2xl">
        <Link href="/albums">
          <Button
            variant="ghost"
            className="glass-button text-[#c2c6d6] hover:text-white px-3.5 py-1.5 rounded-xl font-medium text-xs flex items-center gap-1.5 pressable border-white/15"
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
            {selectedPhotos.size} {selectedPhotos.size === 1 ? 'photo' : 'photos'} selected
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
              <span>Saving...</span>
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
            {coverPhoto ? (
              <img
                src={coverPhoto.url}
                alt={coverPhoto.name}
                className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-60 transition-opacity duration-300"
              />
            ) : (
              <div className="absolute inset-0 bg-[#141923] flex items-center justify-center text-[#8c909f]">
                <FolderPlus className="w-12 h-12 stroke-[1.5]" />
              </div>
            )}
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

            {/* Privacy Selector */}
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
              <span>Select Real Photos</span>
              <span className="text-xs font-mono bg-[#3b82f6]/20 text-[#adc6ff] border border-[#3b82f6]/30 px-2.5 py-0.5 rounded-full">
                {selectedPhotos.size} of {photos.length} chosen
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              disabled={photos.length === 0}
              className="text-xs text-[#c2c6d6] hover:text-white glass-button px-3 py-1.5 rounded-xl pressable border-white/15 disabled:opacity-40"
            >
              Select All
            </button>
            {selectedPhotos.size > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-[#8c909f] hover:text-rose-400 glass-button px-3 py-1.5 rounded-xl pressable border-white/15"
              >
                Clear
              </button>
            )}
          </div>
        </section>

        {/* ── Photo Grid with Tactile Selection Indicators ── */}
        {isLoading && photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin mb-3" />
            <p className="text-sm font-semibold text-[#e5e2e1]">
              Loading your vault photos...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto">
            <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
            <p className="text-sm text-red-300">{error}</p>
            <Button onClick={fetchPhotos} className="mt-3 btn-vault text-xs rounded-xl">
              Retry
            </Button>
          </div>
        ) : photos.length === 0 ? (
          /* Empty state when 0 photos uploaded */
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#1e293b]/70 border border-white/10 flex items-center justify-center mb-3">
              <Upload className="w-7 h-7 text-[#adc6ff]" />
            </div>
            <h3 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-white">
              No photos in your vault yet
            </h3>
            <p className="text-xs text-[#8c909f] mt-1 leading-relaxed">
              Upload your family photos to Cloudflare R2 first, then select them here to curate an album.
            </p>
            <Button
              onClick={() => setIsUploadOpen(true)}
              className="mt-4 btn-vault text-xs rounded-xl px-5 py-2.5 font-semibold"
            >
              <Upload className="w-4 h-4 mr-2" />
              <span>Upload Photos Now</span>
            </Button>
          </div>
        ) : (
          <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pb-16">
            {photos.map((photo, idx) => {
              const isSelected = selectedPhotos.has(photo.id);
              const isCover = coverPhotoId === photo.id;
              const isBumping = justToggledId === photo.id;
              const staggerDelay = Math.min(idx * 25, 250);

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
                    alt={photo.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Cover Photo Badge */}
                  {isCover && (
                    <div className="absolute top-2.5 left-2.5 z-20 bg-blue-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md backdrop-blur-md">
                      COVER
                    </div>
                  )}

                  {/* Selection Checkmark Button */}
                  <div
                    className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 z-20 ${
                      isSelected
                        ? 'bg-[#3b82f6] border border-[#3b82f6] text-white shadow-lg'
                        : 'bg-black/40 backdrop-blur-md border border-white/50 text-transparent group-hover:border-white'
                    } ${isBumping ? 'scale-125' : 'scale-100'}`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>

                  {/* Photo Caption & Date on Hover */}
                  <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white font-medium truncate">
                      {photo.name}
                    </p>
                    <p className="text-[9px] text-[#8c909f]">{photo.date}</p>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>

      {/* Direct Upload Modal if user has no photos */}
      <UploadMediaDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUploadComplete={fetchPhotos}
      />
    </div>
  );
}

export default function CreateAlbumPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-[#3b82f6]" />
        </div>
      }
    >
      <CreateAlbumInner />
    </Suspense>
  );
}
