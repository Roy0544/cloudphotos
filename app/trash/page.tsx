'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Trash2,
  RotateCcw,
  AlertCircle,
  Loader2,
  HardDrive,
  Calendar,
  CheckCircle2,
  Images,
  ArrowLeft,
  Film,
  Play,
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

interface TrashedItem {
  id: string;
  originalFilename: string;
  compressedSizeBytes: number;
  signedUrl: string | null;
  viewUrl: string;
  createdAt: string;
  aiTransformType?: string;
  mediaType?: 'photo' | 'video';
  streamVideoId?: string;
  durationSeconds?: number;
  embedUrl?: string;
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

export default function TrashPage() {
  const [trashedItems, setTrashedItems] = useState<TrashedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState<TrashedItem | null>(null);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [permanentDeleteItem, setPermanentDeleteItem] = useState<TrashedItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchTrash = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/trash');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTrashedItems(data.items || []);
    } catch (err: any) {
      console.error('Failed to load trash:', err);
      setError('Unable to load trashed items.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  // Restore item
  const handleRestore = async (item: TrashedItem) => {
    setActionLoadingId(item.id);
    try {
      const endpoint =
        item.mediaType === 'video'
          ? `/api/videos/${item.id}/restore`
          : `/api/images/${item.id}/restore`;
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to restore');
      setTrashedItems((prev) => prev.filter((i) => i.id !== item.id));
      if (activePhoto?.id === item.id) setActivePhoto(null);
      window.dispatchEvent(new Event('vault-storage-updated'));
    } catch (err: any) {
      console.error('Restore error:', err);
      alert(`Failed to restore ${item.mediaType === 'video' ? 'video' : 'photo'}: ` + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Permanently delete item
  const handlePermanentDelete = async (item: TrashedItem) => {
    setActionLoadingId(item.id);
    try {
      const endpoint =
        item.mediaType === 'video'
          ? `/api/videos/${item.id}?permanent=true`
          : `/api/images/${item.id}?permanent=true`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete permanently');
      setTrashedItems((prev) => prev.filter((i) => i.id !== item.id));
      if (activePhoto?.id === item.id) setActivePhoto(null);
      setPermanentDeleteItem(null);
      window.dispatchEvent(new Event('vault-storage-updated'));
    } catch (err: any) {
      console.error('Permanent delete error:', err);
      alert(`Failed to permanently delete ${item.mediaType === 'video' ? 'video' : 'photo'}: ` + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Empty entire trash
  const handleEmptyTrash = async () => {
    setIsEmptyingTrash(true);
    try {
      const res = await fetch('/api/trash/empty', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to empty trash');
      setTrashedItems([]);
      setShowEmptyConfirm(false);
      window.dispatchEvent(new Event('vault-storage-updated'));
    } catch (err: any) {
      console.error('Empty trash error:', err);
      alert('Failed to empty trash: ' + err.message);
    } finally {
      setIsEmptyingTrash(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-[#e5e2e1] font-[family-name:var(--font-inter)] selection:bg-[#4d8eff]/30 selection:text-white">
      {/* ── Sidebar ── */}
      <VaultSidebar currentRoute="trash" />

      {/* ── Main Viewport ── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Floating Header */}
        <header className="sticky top-0 z-40 glass-panel border-b border-white/10 px-4 md:px-8 py-3.5 flex justify-between items-center shrink-0 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <Link
              href="/timeline"
              className="md:hidden text-[#adc6ff] p-1.5 hover:bg-white/5 rounded-lg transition-colors pressable"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                <h1 className="font-[family-name:var(--font-manrope)] text-lg md:text-xl font-bold text-white tracking-tight">
                  Trash
                </h1>
                <span className="bg-red-500/15 text-red-300 text-xs font-semibold px-2 py-0.5 rounded-full border border-red-500/20 font-mono">
                  {trashedItems.length}
                </span>
              </div>
              <p className="text-[11px] text-[#8c909f] hidden sm:block">
                Items here can be restored or purged permanently from Cloud Vault & Bunny Stream
              </p>
            </div>
          </div>

          {/* Top Actions */}
          {trashedItems.length > 0 && (
            <Button
              onClick={() => setShowEmptyConfirm(true)}
              variant="outline"
              className="glass-button text-xs rounded-xl px-4 py-2 font-semibold text-red-300 hover:text-red-200 border-red-500/30 hover:bg-red-950/30 flex items-center gap-1.5 pressable"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Empty Trash</span>
            </Button>
          )}
        </header>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-12 pb-24 md:pb-12 pt-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#3b82f6] mb-3" />
              <p className="text-xs text-[#8c909f]">Loading trashed items...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
              <p className="text-xs text-red-300 mb-3">{error}</p>
              <Button onClick={fetchTrash} className="btn-vault text-xs rounded-xl px-4 py-2">
                Retry
              </Button>
            </div>
          ) : trashedItems.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-28 text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Trash2 className="w-8 h-8 text-[#8c909f]" />
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-white">
                Trash is Empty
              </h3>
              <p className="text-xs text-[#8c909f] mt-1.5 leading-relaxed">
                Photos and videos you delete will appear here before they are permanently purged.
              </p>
              <Link href="/timeline" className="mt-5">
                <Button className="btn-vault rounded-xl text-xs px-5 py-2.5 pressable shadow-[0_0_20px_rgba(59,130,246,0.25)]">
                  Go to Timeline
                </Button>
              </Link>
            </div>
          ) : (
            /* Trashed Media Grid */
            <div className="flex flex-col gap-6">
              {/* Notice Banner */}
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200/90 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Items in trash are hidden from your timeline. Permanently deleting items will immediately free up space in your vault and Bunny Stream CDN.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {trashedItems.map((item) => {
                  const compKB = Math.round((item.compressedSizeBytes || 0) / 1024);
                  const isActioning = actionLoadingId === item.id;
                  const imgSrc = item.signedUrl || item.viewUrl;
                  const isVideo = item.mediaType === 'video';

                  return (
                    <div
                      key={item.id}
                      className="glass-card rounded-xl overflow-hidden border border-white/10 flex flex-col justify-between group hover:border-white/20 transition-all select-none"
                    >
                      {/* Media Thumbnail */}
                      <div
                        onClick={() => setActivePhoto(item)}
                        className="aspect-square relative cursor-pointer overflow-hidden bg-black/40"
                      >
                        <img
                          src={imgSrc}
                          alt={item.originalFilename}
                          onError={(e) => {
                            if (!isVideo && e.currentTarget.src !== window.location.origin + item.viewUrl) {
                              e.currentTarget.src = item.viewUrl;
                            }
                          }}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                        />

                        {/* Video Duration Badge */}
                        {isVideo && (
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-md border border-white/15 px-2 py-0.5 rounded-md text-[10px] font-mono text-white font-medium">
                            <Film className="w-2.5 h-2.5 text-[#adc6ff]" />
                            <span>{formatDuration(item.durationSeconds || 0)}</span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                          <p className="text-[10px] text-white font-medium truncate">
                            {item.originalFilename}
                          </p>
                          <p className="text-[9px] text-[#8c909f] font-mono">
                            {isVideo ? 'Bunny Stream' : `${compKB} KB`}
                          </p>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="p-2.5 flex items-center justify-between border-t border-white/5 bg-black/20 gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isActioning}
                          onClick={() => handleRestore(item)}
                          className="flex-1 text-[11px] h-7 px-2 text-[#adc6ff] hover:text-white hover:bg-white/10 rounded-lg flex items-center justify-center gap-1"
                          title="Restore to Timeline"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isActioning}
                          onClick={() => setPermanentDeleteItem(item)}
                          className="text-[11px] h-7 px-2 text-[#8c909f] hover:text-red-400 hover:bg-red-950/20 rounded-lg"
                          title="Delete Permanently"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Empty Trash Confirmation Modal ── */}
      <Dialog open={showEmptyConfirm} onOpenChange={setShowEmptyConfirm}>
        <DialogContent className="max-w-md bg-[#141414] border-white/10 text-[#e5e2e1] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              <span>Empty Trash Permanently?</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#8c909f] mt-1 leading-relaxed">
            This will permanently delete all {trashedItems.length} photos and videos and their storage files from Cloud Vault and Bunny Stream. This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2.5 mt-5">
            <Button
              variant="outline"
              disabled={isEmptyingTrash}
              onClick={() => setShowEmptyConfirm(false)}
              className="glass-button text-xs rounded-xl border-white/15"
            >
              Cancel
            </Button>
            <Button
              disabled={isEmptyingTrash}
              onClick={handleEmptyTrash}
              className="bg-red-600 hover:bg-red-700 text-white text-xs rounded-xl font-semibold px-4 flex items-center gap-1.5"
            >
              {isEmptyingTrash ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Purging Vault & Bunny...</span>
                </>
              ) : (
                <span>Empty Trash</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Single Item Permanent Delete Modal ── */}
      <Dialog open={!!permanentDeleteItem} onOpenChange={(open) => !open && setPermanentDeleteItem(null)}>
        <DialogContent className="max-w-md bg-[#141414] border-white/10 text-[#e5e2e1] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span>
                Permanently Delete {permanentDeleteItem?.mediaType === 'video' ? 'Video' : 'Photo'}?
              </span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#8c909f] mt-1 leading-relaxed">
            {permanentDeleteItem?.mediaType === 'video'
              ? 'This video will be permanently erased from Bunny.net Stream CDN and cannot be recovered.'
              : 'This photo will be erased from Cloudflare R2 storage permanently and cannot be recovered.'}
          </p>
          <div className="flex items-center justify-end gap-2.5 mt-5">
            <Button
              variant="outline"
              onClick={() => setPermanentDeleteItem(null)}
              className="glass-button text-xs rounded-xl border-white/15"
            >
              Cancel
            </Button>
            <Button
              onClick={() => permanentDeleteItem && handlePermanentDelete(permanentDeleteItem)}
              className="bg-red-600 hover:bg-red-700 text-white text-xs rounded-xl font-semibold px-4"
            >
              Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Mobile Nav ── */}
      <VaultMobileNav currentRoute="trash" />
    </div>
  );
}
