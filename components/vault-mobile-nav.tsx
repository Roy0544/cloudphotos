'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Clock, Heart, Sparkles, Upload, FolderPlus } from 'lucide-react';
import { UploadMediaDialog } from '@/components/upload-media-dialog';

interface VaultMobileNavProps {
  currentRoute: 'dashboard' | 'timeline' | 'favorites' | 'editor';
  activeFilter?: 'all' | 'favs' | string;
  onFilterChange?: (filter: string) => void;
}

export function VaultMobileNav({
  currentRoute,
  activeFilter,
  onFilterChange,
}: VaultMobileNavProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const isDashboard = currentRoute === 'dashboard';
  const isTimeline = currentRoute === 'timeline' && activeFilter !== 'favs';
  const isFavorites = currentRoute === 'favorites' || activeFilter === 'favs';
  const isEditor = currentRoute === 'editor';

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 pb-4 pt-2 glass-panel border-t border-white/10 rounded-t-2xl shadow-2xl backdrop-blur-2xl bg-[#0e0e0e]/95">
        {/* Dashboard */}
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-1 rounded-xl p-2 w-14 pressable ${
            isDashboard ? 'bg-[#3b82f6] text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]' : 'text-[#8c909f]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Home</span>
        </Link>

        {/* Timeline */}
        <Link
          href="/timeline"
          onClick={() => onFilterChange && onFilterChange('all')}
          className={`flex flex-col items-center gap-1 rounded-xl p-2 w-14 pressable ${
            isTimeline ? 'bg-[#3b82f6] text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]' : 'text-[#8c909f]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Timeline</span>
        </Link>

        {/* Direct Upload (Photos & Videos without making an album) */}
        <button
          type="button"
          onClick={() => setIsUploadOpen(true)}
          className="flex flex-col items-center gap-1 text-[#adc6ff] p-2 w-14 pressable hover:text-white"
        >
          <div className="w-6 h-6 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/40 flex items-center justify-center">
            <Upload className="w-3.5 h-3.5 text-[#3b82f6]" />
          </div>
          <span className="text-[10px] font-semibold">Upload</span>
        </button>

        {/* Favorites */}
        <Link
          href="/favorites"
          className={`flex flex-col items-center gap-1 rounded-xl p-2 w-14 pressable ${
            isFavorites ? 'bg-[#3b82f6] text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]' : 'text-[#8c909f]'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorites ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-semibold">Favorites</span>
        </Link>

        {/* Create Album */}
        <Link
          href="/create-album"
          className="flex flex-col items-center gap-1 text-[#8c909f] p-2 w-14 pressable hover:text-white"
        >
          <FolderPlus className="w-4 h-4" />
          <span className="text-[10px]">Album</span>
        </Link>
      </nav>

      {/* Direct Upload Dialog */}
      <UploadMediaDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} />
    </>
  );
}
