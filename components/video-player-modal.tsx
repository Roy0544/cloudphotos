'use client';

import { useEffect, useState } from 'react';
import {
  X,
  Heart,
  Download,
  Trash2,
  Film,
  Calendar,
  Clock,
  HardDrive,
  Maximize2,
  AlertCircle,
  Share2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface VideoItem {
  id: string;
  streamVideoId: string;
  originalFilename: string;
  durationSeconds: number;
  status: string;
  readyAt?: string;
  createdAt: string;
  posterUrl: string;
  previewUrl: string;
  hlsUrl: string;
  embedUrl: string;
}

interface VideoPlayerModalProps {
  video: VideoItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTrash?: (videoId: string) => void;
  onToggleFavorite?: (videoId: string) => void;
  isFavorite?: boolean;
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

export function VideoPlayerModal({
  video,
  open,
  onOpenChange,
  onTrash,
  onToggleFavorite,
  isFavorite = false,
}: VideoPlayerModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!video) return null;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.originalFilename,
          url: window.location.href,
        });
      } catch {
        // Ignored or cancelled
      }
    } else {
      await navigator.clipboard.writeText(video.embedUrl || window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const uploadDate = new Date(video.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-5xl w-[96vw] bg-[#0c0c0e]/95 backdrop-blur-3xl border border-white/10 text-white p-3 sm:p-6 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col gap-4 overflow-hidden z-50 focus:outline-none"
      >
        <DialogHeader className="p-0 flex flex-row items-center justify-between gap-3 text-left border-b border-white/10 pb-3 sm:pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center shrink-0">
              <Film className="w-4 h-4 text-[#adc6ff]" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm sm:text-base font-bold text-white truncate max-w-[240px] sm:max-w-md md:max-w-lg">
                {video.originalFilename}
              </DialogTitle>
              <div className="flex items-center gap-2 text-[11px] text-[#8c909f] mt-0.5">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-[#adc6ff]" />
                  {formatDuration(video.durationSeconds)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {uploadDate}
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">Bunny Stream HLS</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {onToggleFavorite && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleFavorite(video.id)}
                className={`glass-button rounded-xl p-2 h-8 sm:h-9 border-white/10 ${
                  isFavorite ? 'text-rose-400 border-rose-500/30 bg-rose-500/10' : 'text-[#c2c6d6] hover:text-white'
                }`}
                title="Favorite"
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="glass-button rounded-xl p-2 h-8 sm:h-9 border-white/10 text-[#c2c6d6] hover:text-white"
              title="Share or Copy Link"
            >
              <Share2 className="w-3.5 h-3.5" />
            </Button>

            {onTrash && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTrash(video.id)}
                className="glass-button rounded-xl p-2 h-8 sm:h-9 border-white/10 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                title="Move to Trash"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="glass-button rounded-xl p-2 h-8 sm:h-9 border-white/10 text-[#c2c6d6] hover:text-white"
              title="Close Player"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Video Player Frame */}
        <div className="relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-black/90 border border-white/10 shadow-2xl flex items-center justify-center">
          {video.status === 'pending' || video.status === 'processing' ? (
            <div className="flex flex-col items-center justify-center text-center p-6 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center animate-pulse">
                <Film className="w-6 h-6 text-[#adc6ff]" />
              </div>
              <h4 className="text-sm font-bold text-white">Transcoding Video on Bunny Stream...</h4>
              <p className="text-xs text-[#8c909f] max-w-sm">
                Bunny is currently encoding your video into multi-bitrate adaptive HLS streams. This typically takes 10 to 60 seconds depending on video length.
              </p>
            </div>
          ) : video.status === 'failed' || video.status === 'error' ? (
            <div className="flex flex-col items-center justify-center text-center p-6 gap-2">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <h4 className="text-sm font-bold text-white">Encoding Failed</h4>
              <p className="text-xs text-red-300/80">The video codec was not supported or the file was corrupted.</p>
            </div>
          ) : (
            <iframe
              src={video.embedUrl}
              loading="lazy"
              className="border-0 absolute top-0 left-0 w-full h-full rounded-xl sm:rounded-2xl shadow-inner"
              allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
              allowFullScreen={true}
            />
          )}
        </div>

        {/* Share toast feedback */}
        {copied && (
          <div className="text-center text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 py-1.5 rounded-xl">
            Embed link copied to clipboard!
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
