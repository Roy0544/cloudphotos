'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Heart,
  Upload,
  Sparkles,
  Shield,
  Clock,
  HardDrive,
  ArrowRight,
  FolderPlus,
  Wand2,
  Lock,
  CheckCircle2,
  TrendingDown,
  Images,
  Trash2,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { VaultSidebar } from '@/components/vault-sidebar';
import { VaultMobileNav } from '@/components/vault-mobile-nav';
import { UploadMediaDialog } from '@/components/upload-media-dialog';
import { getStoredAlbums } from '@/lib/albums';
import { getStoredFavorites } from '@/lib/favorites';

interface DashboardPhoto {
  id: string;
  name: string;
  src: string;
  thumbnailSrc?: string;
  viewUrl: string;
  date: string;
  sizeBytes: number;
}

interface StorageStats {
  formattedUsed: string;
  formattedLimit: string;
  formattedRemaining: string;
  usedPercentage: number;
  imageCount: number;
  trashCount: number;
  totalOriginalBytes: number;
  totalBytes: number;
  savedBytes: number;
  savedPercent: number;
}

export default function DashboardPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [photos, setPhotos] = useState<DashboardPhoto[]>([]);
  const [albumsCount, setAlbumsCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [storage, setStorage] = useState<StorageStats>({
    formattedUsed: '0 MB',
    formattedLimit: '10 GB',
    formattedRemaining: '10 GB',
    usedPercentage: 0,
    imageCount: 0,
    trashCount: 0,
    totalOriginalBytes: 0,
    totalBytes: 0,
    savedBytes: 0,
    savedPercent: 0,
  });

  const fetchData = useCallback(async () => {
    // 1. Fetch storage stats
    try {
      const res = await fetch('/api/storage');
      if (res.ok) {
        const data = await res.json();
        if (data.storage) {
          setStorage(data.storage);
        }
      }
    } catch (e) {
      console.error('Failed to load storage stats:', e);
    }

    // 2. Fetch real photos
    try {
      const res = await fetch('/api/images?per_page=12');
      if (res.ok) {
        const data = await res.json();
        const mapped: DashboardPhoto[] = (data.images || []).map((img: any) => {
          const d = new Date(img.createdAt);
          return {
            id: img.id,
            name: (img.originalFilename || 'Photo').replace(/\.[^/.]+$/, ''),
            src: img.signedUrl || `/api/images/${img.id}/view`,
            thumbnailSrc:
              img.thumbnailUrl ||
              img.thumbnailViewUrl ||
              img.signedUrl ||
              `/api/images/${img.id}/view?thumb=true`,
            viewUrl: `/api/images/${img.id}/view`,
            date: d.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            sizeBytes: img.compressedSizeBytes || img.originalSizeBytes || 0,
          };
        });
        setPhotos(mapped);
      }
    } catch (e) {
      console.error('Failed to load dashboard photos:', e);
    }

    // 3. Local stats
    setAlbumsCount(getStoredAlbums().length);
    setFavoritesCount(getStoredFavorites().size);
  }, []);

  useEffect(() => {
    fetchData();

    const handleStorageUpdate = () => fetchData();
    const handleFavUpdate = () => setFavoritesCount(getStoredFavorites().size);
    const handleAlbumsUpdate = () => setAlbumsCount(getStoredAlbums().length);

    window.addEventListener('vault-storage-updated', handleStorageUpdate);
    window.addEventListener('vault-favorites-updated', handleFavUpdate);
    window.addEventListener('vault-albums-updated', handleAlbumsUpdate);

    return () => {
      window.removeEventListener('vault-storage-updated', handleStorageUpdate);
      window.removeEventListener('vault-favorites-updated', handleFavUpdate);
      window.removeEventListener('vault-albums-updated', handleAlbumsUpdate);
    };
  }, [fetchData]);

  const latestPhoto = photos[0];
  const recentPhotos = photos.slice(0, 6);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-[#e5e2e1] font-[family-name:var(--font-inter)] selection:bg-[#4d8eff]/30 selection:text-white">
      {/* ── Desktop Sidebar ── */}
      <VaultSidebar currentRoute="dashboard" />

      {/* ── Main Canvas Viewport ── */}
      <main className="flex-1 overflow-y-auto bg-[#0a0a0a] flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 glass-panel border-b border-white/10 px-4 py-3.5 flex justify-between items-center backdrop-blur-xl">
          <Link href="/dashboard" className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#adc6ff]">
            Family Cloud
          </Link>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsUploadOpen(true)}
              className="btn-vault text-xs rounded-xl px-3 py-1 flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload</span>
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 md:p-10 lg:p-12 pb-24 md:pb-12 max-w-[1440px] mx-auto w-full flex flex-col gap-6">
          {/* Welcome & Security Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="font-[family-name:var(--font-manrope)] text-2xl md:text-3xl font-bold text-[#e5e2e1] tracking-tight">
                  Vault Overview
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  R2 Encrypted & Active
                </span>
              </div>
              <p className="text-xs md:text-sm text-[#8c909f]">
                Private archival cloud for high-resolution family photos and memories.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                onClick={() => setIsUploadOpen(true)}
                className="btn-vault py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 pressable shadow-[0_0_20px_rgba(59,130,246,0.25)]"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Media</span>
              </Button>

              <Link href="/create-album">
                <Button variant="outline" className="glass-button text-xs font-semibold py-2.5 px-4 rounded-xl pressable text-[#e5e2e1] hover:text-white border-white/15">
                  <FolderPlus className="w-4 h-4 mr-1.5 text-[#adc6ff]" />
                  <span>New Album</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Real Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {/* Total Memories */}
            <Link
              href="/timeline"
              className="glass-card rounded-2xl p-4 flex flex-col justify-between border-white/10 hover:border-white/20 transition-all pressable"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#8c909f] font-medium">Total Memories</span>
                <Clock className="w-4 h-4 text-[#adc6ff]" />
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-[#e5e2e1]">
                  {storage.imageCount}
                </p>
                <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
                  <span>Archived in Vault</span>
                  <ArrowRight className="w-3 h-3" />
                </p>
              </div>
            </Link>

            {/* Real Storage (10 GB Top Limit) */}
            <div className="glass-card rounded-2xl p-4 flex flex-col justify-between border-white/10">
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#8c909f] font-medium">Vault Storage</span>
                <HardDrive className="w-4 h-4 text-[#3b82f6]" />
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-[#e5e2e1]">
                  {storage.formattedUsed}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Progress
                    value={Math.max(1, storage.usedPercentage)}
                    className="h-1 flex-1 bg-[#2a2a2a] [&>div]:bg-emerald-400"
                  />
                  <span className="text-[10px] text-[#8c909f] font-mono">
                    of 10 GB
                  </span>
                </div>
              </div>
            </div>

            {/* Albums & Collections */}
            <Link
              href="/albums"
              className="glass-card rounded-2xl p-4 flex flex-col justify-between border-white/10 hover:border-white/20 transition-all pressable"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#8c909f] font-medium">My Albums</span>
                <FolderPlus className="w-4 h-4 text-[#adc6ff]" />
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-[#e5e2e1]">
                  {albumsCount}
                </p>
                <p className="text-[11px] text-[#adc6ff] mt-0.5 flex items-center gap-1">
                  <span>View Collections</span>
                  <ArrowRight className="w-3 h-3" />
                </p>
              </div>
            </Link>

            {/* Starred Favorites */}
            <Link
              href="/favorites"
              className="glass-card rounded-2xl p-4 flex flex-col justify-between border-white/10 hover:border-white/20 transition-all pressable"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#8c909f] font-medium">Favorites</span>
                <Heart className="w-4 h-4 text-[#adc6ff]" />
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-[#adc6ff]">
                  {favoritesCount}
                </p>
                <p className="text-[11px] text-[#8c909f] mt-0.5 flex items-center gap-1">
                  <span>Starred Memories</span>
                  <ArrowRight className="w-3 h-3" />
                </p>
              </div>
            </Link>
          </div>

          {/* ── Main Bento Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Large Card: Latest Real Photo Highlight */}
            {latestPhoto ? (
              <Link
                href="/timeline"
                className="md:col-span-2 glass-card rounded-2xl p-1 overflow-hidden relative group cursor-pointer block border border-white/10 hover:border-white/20 transition-all pressable"
              >
                <div className="relative h-72 md:h-96 w-full overflow-hidden rounded-[14px] bg-[#121212]">
                  <img
                    src={latestPhoto.src}
                    alt={latestPhoto.name}
                    onError={(e) => {
                      if (e.currentTarget.src !== window.location.origin + latestPhoto.viewUrl) {
                        e.currentTarget.src = latestPhoto.viewUrl;
                      }
                    }}
                    className="w-full h-full object-cover rounded-[14px] opacity-80 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-700 ease-out"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-6 md:p-8 flex flex-col justify-end">
                    <div className="inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs text-[#adc6ff] border border-white/10 w-fit mb-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Preserved {latestPhoto.date}</span>
                    </div>

                    <h3 className="font-[family-name:var(--font-manrope)] text-2xl md:text-3xl font-bold text-white tracking-tight">
                      {latestPhoto.name}
                    </h3>
                    <p className="text-xs md:text-sm text-[#c2c6d6] mt-1 max-w-lg">
                      Archived in full high-resolution with lossless WebP compression.
                    </p>

                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#adc6ff] group-hover:translate-x-1 transition-transform">
                      <span>Explore in Timeline Gallery</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div
                onClick={() => setIsUploadOpen(true)}
                className="md:col-span-2 glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer border border-dashed border-white/15 hover:border-[#3b82f6]/50 transition-all h-72 md:h-96"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#1e293b]/70 border border-white/10 flex items-center justify-center mb-4">
                  <Images className="w-8 h-8 text-[#adc6ff]" />
                </div>
                <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-white">
                  Start Your Family Vault
                </h3>
                <p className="text-xs text-[#8c909f] mt-1.5 max-w-md">
                  Upload your first batch of photos. They will be compressed, archived in Cloudflare R2, and displayed on your timeline.
                </p>
                <Button className="btn-vault text-xs rounded-xl px-5 py-2.5 mt-5 flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photos Now</span>
                </Button>
              </div>
            )}

            {/* Right Column Stack */}
            <div className="flex flex-col gap-5">
              {/* AI Photo Studio Quick Card */}
              <Link
                href="/editor"
                className="glass-card rounded-2xl p-5 border border-white/10 hover:border-[#3b82f6]/40 transition-all flex flex-col justify-between pressable group"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center mb-3">
                    <Wand2 className="w-4 h-4 text-[#adc6ff]" />
                  </div>
                  <h4 className="font-[family-name:var(--font-manrope)] text-base font-bold text-[#e5e2e1] group-hover:text-white transition-colors">
                    AI Photo Studio
                  </h4>
                  <p className="text-xs text-[#8c909f] mt-1 leading-relaxed">
                    Background removal, neural HDR clarity, and directional relighting.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-[#adc6ff]">
                  <span>Launch Studio</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Direct Upload Card */}
              <div
                onClick={() => setIsUploadOpen(true)}
                className="glass-card rounded-2xl p-5 border border-dashed border-white/15 hover:border-[#3b82f6]/50 hover:bg-white/[0.03] transition-all flex flex-col items-center justify-center text-center pressable group gap-2 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-[#201f1f] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                  <Upload className="w-5 h-5 text-[#4d8eff]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#e5e2e1] group-hover:text-white transition-colors">
                    Upload Photos & Folders
                  </p>
                  <p className="text-[11px] text-[#8c909f] mt-0.5">
                    Drag & drop folders or files • 3x concurrency
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Recent Vault Uploads Showcase (Replaced Family Sanctuary) ── */}
          {recentPhotos.length > 0 && (
            <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Images className="w-4 h-4 text-[#adc6ff]" />
                  <h4 className="font-[family-name:var(--font-manrope)] text-sm font-bold text-white">
                    Recent Vault Uploads
                  </h4>
                </div>
                <Link
                  href="/timeline"
                  className="text-xs text-[#adc6ff] hover:text-white flex items-center gap-1 font-medium pressable"
                >
                  <span>View All Timeline</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {recentPhotos.map((photo) => (
                  <Link
                    key={photo.id}
                    href={`/editor?photoId=${photo.id}`}
                    className="aspect-square relative rounded-xl overflow-hidden cursor-pointer group border border-white/10 hover:border-white/30 transition-all select-none bg-black/40 block"
                  >
                    <img
                      src={photo.thumbnailSrc || photo.src}
                      alt={photo.name}
                      onError={(e) => {
                        if (e.currentTarget.src !== window.location.origin + photo.viewUrl) {
                          e.currentTarget.src = photo.viewUrl;
                        }
                      }}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                      <p className="text-[10px] text-white font-medium truncate">
                        {photo.name}
                      </p>
                      <p className="text-[9px] text-[#8c909f]">{photo.date}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Vault Cloud Optimization & Storage Insights (Replaced Family Circle) ── */}
          <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <TrendingDown className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-[family-name:var(--font-manrope)] text-sm font-bold text-white">
                  Cloudflare R2 Storage Efficiency
                </h4>
                <p className="text-xs text-[#8c909f] mt-0.5">
                  WebP neural compression reduces photo payload size by up to {storage.savedPercent || 65}% while preserving archival clarity.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link href="/timeline">
                <Button variant="outline" className="glass-button text-xs rounded-xl px-4 py-2 border-white/15">
                  Browse Timeline
                </Button>
              </Link>
              <Link href="/trash">
                <Button variant="outline" className="glass-button text-xs rounded-xl px-4 py-2 border-red-500/20 text-red-300 hover:text-red-200">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  <span>Trash ({storage.trashCount})</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* ── Mobile Navigation ── */}
      <VaultMobileNav currentRoute="dashboard" />

      {/* Direct Upload Dialog */}
      <UploadMediaDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUploadComplete={fetchData}
      />
    </div>
  );
}
