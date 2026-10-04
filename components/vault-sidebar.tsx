'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Clock,
  Heart,
  Sparkles,
  Trash2,
  Upload,
  FolderPlus,
  LogOut,
  HardDrive,
  ArrowRight,
  User,
  Loader2,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { UploadMediaDialog } from '@/components/upload-media-dialog';
import { PhotosLogo } from '@/components/photos-logo';
import { createClient } from '@/lib/supabase/client';
import { getStoredFavorites } from '@/lib/favorites';
import { getStoredAlbums } from '@/lib/albums';

interface VaultSidebarProps {
  currentRoute: 'dashboard' | 'timeline' | 'favorites' | 'editor' | 'albums' | 'create-album' | 'trash';
  activeFilter?: 'all' | 'favs' | string;
  onFilterChange?: (filter: string) => void;
  favoritesCount?: number;
  albumsCount?: number;
}

export function VaultSidebar({
  currentRoute,
  activeFilter,
  onFilterChange,
  favoritesCount,
  albumsCount,
}: VaultSidebarProps) {
  const router = useRouter();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [liveFavCount, setLiveFavCount] = useState(0);
  const [liveAlbumsCount, setLiveAlbumsCount] = useState(0);

  const [storageData, setStorageData] = useState<{
    formattedUsed: string;
    formattedLimit: string;
    formattedRemaining: string;
    usedPercentage: number;
    trashCount: number;
    videoCount?: number;
    imageCount?: number;
    formattedImageBytes?: string;
    formattedVideoBytes?: string;
  }>({
    formattedUsed: '0 MB',
    formattedLimit: '10 GB',
    formattedRemaining: '10 GB',
    usedPercentage: 0,
    trashCount: 0,
    videoCount: 0,
    imageCount: 0,
  });

  const fetchStorage = useCallback(async () => {
    try {
      const res = await fetch('/api/storage');
      if (res.ok) {
        const data = await res.json();
        if (data.storage) {
          setStorageData(data.storage);
        }
      }
    } catch (e) {
      console.error('Failed to fetch storage in sidebar:', e);
    }
  }, []);

  useEffect(() => {
    fetchStorage();
    window.addEventListener('vault-storage-updated', fetchStorage);
    return () => {
      window.removeEventListener('vault-storage-updated', fetchStorage);
    };
  }, [fetchStorage]);

  useEffect(() => {
    const updateFavs = () => {
      setLiveFavCount(getStoredFavorites().size);
    };
    const updateAlbums = () => {
      setLiveAlbumsCount(getStoredAlbums().length);
    };

    updateFavs();
    updateAlbums();

    window.addEventListener('vault-favorites-updated', updateFavs);
    window.addEventListener('vault-albums-updated', updateAlbums);
    return () => {
      window.removeEventListener('vault-favorites-updated', updateFavs);
      window.removeEventListener('vault-albums-updated', updateAlbums);
    };
  }, []);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          setUserEmail(data.user.email);
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUserEmail(session?.user?.email ?? null);
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
    }
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsSigningOut(false);
      router.push('/login');
      router.refresh();
    }
  };

  const isDashboard = currentRoute === 'dashboard';
  const isTimeline = currentRoute === 'timeline' && activeFilter !== 'favs';
  const isAlbums = currentRoute === 'albums';
  const isFavorites = currentRoute === 'favorites' || activeFilter === 'favs';
  const isEditor = currentRoute === 'editor';
  const isTrash = currentRoute === 'trash';

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 h-screen sticky left-0 top-0 glass-panel border-r border-white/10 p-6 gap-6 z-40 shrink-0">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-3 group pressable">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 group-hover:border-white/20 transition-all shadow-inner">
            <PhotosLogo className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-manrope)] text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>Photos</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </h1>
            <p className="text-[11px] text-[#8c909f] font-medium">Cloud Vault</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-1.5">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors pressable ${
              isDashboard
                ? 'text-[#adc6ff] bg-white/10 shadow-sm border border-white/10 font-semibold'
                : 'text-[#c2c6d6] hover:bg-white/5 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-[#adc6ff]" />
            <span>Dashboard</span>
          </Link>

          {/* Timeline / All Photos */}
          <Link
            href="/timeline"
            onClick={() => onFilterChange && onFilterChange('all')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors pressable ${
              isTimeline
                ? 'text-[#adc6ff] bg-white/10 shadow-sm border border-white/10 font-semibold'
                : 'text-[#c2c6d6] hover:bg-white/5 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-[#adc6ff]" />
            <span>Timeline</span>
          </Link>

          {/* My Albums */}
          <Link
            href="/albums"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors pressable ${
              isAlbums
                ? 'text-[#adc6ff] bg-white/10 shadow-sm border border-white/10 font-semibold'
                : 'text-[#c2c6d6] hover:bg-white/5 hover:text-white'
            }`}
          >
            <FolderPlus className="w-4 h-4 text-[#adc6ff]" />
            <span>My Albums</span>
            <span className="ml-auto text-[10px] bg-white/10 text-[#adc6ff] px-2 py-0.5 rounded-full font-mono">
              {albumsCount !== undefined ? albumsCount : liveAlbumsCount}
            </span>
          </Link>

          {/* Favorites */}
          <Link
            href="/favorites"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors pressable ${
              isFavorites
                ? 'text-[#adc6ff] bg-white/10 shadow-sm border border-white/10 font-semibold'
                : 'text-[#c2c6d6] hover:bg-white/5 hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4 text-[#adc6ff]" />
            <span>Favorites</span>
            <span className="ml-auto text-[10px] bg-white/10 text-[#adc6ff] px-2 py-0.5 rounded-full font-mono">
              {favoritesCount !== undefined ? favoritesCount : liveFavCount}
            </span>
          </Link>

          {/* AI Editor Link */}
          <Link
            href="/editor"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors pressable ${
              isEditor
                ? 'text-[#adc6ff] bg-white/10 shadow-sm border border-white/10 font-semibold'
                : 'text-[#c2c6d6] hover:bg-white/5 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#adc6ff]" />
            <span>AI Editor</span>
            <span className="ml-auto text-[10px] bg-[#adc6ff]/15 text-[#adc6ff] px-1.5 py-0.5 rounded font-mono">
              PRO
            </span>
          </Link>

          {/* Trash */}
          <Link
            href="/trash"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors w-full text-left pressable ${
              isTrash
                ? 'text-red-300 bg-red-950/30 border border-red-500/20 font-semibold shadow-sm'
                : 'text-[#8c909f] hover:bg-white/5 hover:text-[#c2c6d6]'
            }`}
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Trash</span>
            {storageData.trashCount > 0 && (
              <span className="ml-auto text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full font-mono font-semibold">
                {storageData.trashCount}
              </span>
            )}
          </Link>
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-4">
          {/* Real Storage Meter (10 GB Top Limit) */}
          <div className="flex flex-col gap-2 p-3 glass-card rounded-xl border border-white/5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8c909f] flex items-center gap-1.5 font-medium">
                <HardDrive className="w-3.5 h-3.5" /> Storage
              </span>
              <span className="font-mono text-[#e5e2e1] font-semibold">
                {storageData.formattedUsed} / 10 GB
              </span>
            </div>
            <Progress
              value={Math.max(0.5, storageData.usedPercentage)}
              className="h-1.5 bg-[#2a2a2a] [&>div]:bg-gradient-to-r [&>div]:from-[#3b82f6] [&>div]:to-emerald-400 transition-all duration-700"
            />
            <p className="text-[10px] text-[#8c909f]">
              {storageData.usedPercentage}% used • {storageData.formattedRemaining} free
            </p>
            {storageData.videoCount && storageData.videoCount > 0 && storageData.formattedVideoBytes ? (
              <p className="text-[9px] text-[#8c909f]/80 font-mono truncate">
                {storageData.formattedImageBytes} photos • {storageData.formattedVideoBytes} videos
              </p>
            ) : null}
          </div>

          {/* Action 1: Upload Media Button */}
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="w-full py-5 btn-vault rounded-xl text-sm font-semibold flex items-center justify-center gap-2 pressable shadow-[0_0_20px_rgba(59,130,246,0.25)]"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Media</span>
          </Button>

          {/* Action 2: Create Album Button */}
          <Link href="/create-album" className="w-full">
            <Button
              variant="outline"
              className="w-full py-5 glass-button rounded-xl text-xs font-semibold flex items-center justify-center gap-2 pressable text-[#e5e2e1] hover:text-white border-white/15"
            >
              <FolderPlus className="w-4 h-4 text-[#adc6ff]" />
              <span>Create Album</span>
            </Button>
          </Link>

          {/* User Profile & Sign out */}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
            {userEmail && (
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 overflow-hidden">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-[#adc6ff] flex items-center justify-center text-[10px] font-bold shrink-0">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <span className="text-[11px] text-[#c2c6d6] truncate font-mono">
                  {userEmail}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#8c909f] hover:text-[#f87171] hover:bg-red-950/20 transition-colors pressable w-full text-left disabled:opacity-50"
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#adc6ff]" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Lock & Sign Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Direct Upload Dialog */}
      <UploadMediaDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUploadComplete={() => {
          fetchStorage();
          router.refresh();
        }}
      />
    </>
  );
}
