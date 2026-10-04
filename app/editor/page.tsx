'use client';

import { Suspense, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Layers,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Eye,
  Split,
  Download,
  AlertCircle,
  Loader2,
  Images,
  Upload,
  Paintbrush,
  SunMedium,
  RefreshCw,
  Wand2,
  UserCheck,
  Target,
  Box,
  Film,
  Camera,
  Disc,
  History,
  Palette,
  Crop,
  Smartphone,
  Square,
  Monitor,
  Image as ImageIcon,
  CircleDot,
  Stamp,
  Clock,
  ShieldCheck,
  MapPin,
  Shield,
  EyeOff,
  Grid,
  FileText,
  Zap,
  Award,
  Cpu,
  Video,
  PlayCircle,
  ImagePlus,
  FastForward,
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UploadMediaDialog } from '@/components/upload-media-dialog';

interface RealPhoto {
  id: string;
  url: string;
  viewUrl: string;
  name: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  date: string;
}

export interface AITool {
  id: string;
  label: string;
  icon: any;
  description: string;
  tag: string;
}

export interface ToolCategory {
  id: string;
  title: string;
  icon: any;
  badge: string;
  color: string;
  tools: AITool[];
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'neural',
    title: '1. AI Neural & Generative',
    icon: Sparkles,
    badge: 'Neural',
    color: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
    tools: [
      {
        id: 'bg-remove',
        label: 'Background Removal',
        icon: Layers,
        description: 'Neural alpha cutout with edge and hair detection',
        tag: 'Alpha AI',
      },
      {
        id: 'magic-enhance',
        label: '1-Tap Magic Enhance',
        icon: Wand2,
        description: 'Auto exposure, color balance & shadow recovery',
        tag: 'Smart Fix',
      },
      {
        id: 'face-crop',
        label: 'Smart Face Portrait',
        icon: UserCheck,
        description: 'AI facial detection for perfect centered avatar crops',
        tag: 'Biometric',
      },
      {
        id: 'smart-focus',
        label: 'Subject & Pet Focus',
        icon: Target,
        description: 'Saliency AI centers primary subject automatically',
        tag: 'Saliency',
      },
      {
        id: 'drop-shadow',
        label: 'Studio Drop Shadow',
        icon: Box,
        description: 'Soft Apple-style floating shadow beneath subject',
        tag: '3D Depth',
      },
    ],
  },
  {
    id: 'film',
    title: '2. Aesthetic Film & Grading',
    icon: Film,
    badge: 'Cinema',
    color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
    tools: [
      {
        id: 'vintage-90s',
        label: 'Vintage Kodak / Polaroid',
        icon: Camera,
        description: 'Nostalgic retro grain, warm saturation & soft highlights',
        tag: 'Analog',
      },
      {
        id: 'golden-hour',
        label: 'Golden Hour Relight',
        icon: SunMedium,
        description: 'Sunset warmth, honey-toned highlights & ambient glow',
        tag: 'Sunset',
      },
      {
        id: 'noir-bw',
        label: 'Dramatic Noir B&W',
        icon: Paintbrush,
        description: 'Deep inky blacks, street photography contrast',
        tag: 'Monochrome',
      },
      {
        id: 'vignette',
        label: 'Vignette Perimeter Focus',
        icon: Disc,
        description: 'Darkened subtle outer perimeter to draw eye to center',
        tag: 'Optics',
      },
      {
        id: 'sepia',
        label: 'Sepia Heirloom',
        icon: History,
        description: 'Warm antique bronze tone for archival family portraits',
        tag: 'Historic',
      },
      {
        id: 'duotone',
        label: 'Duotone Pop Art',
        icon: Palette,
        description: 'Stylized two-tone modern gradient mapping',
        tag: 'Stylized',
      },
    ],
  },
  {
    id: 'canvas',
    title: '3. Smart Framing & Canvases',
    icon: Crop,
    badge: 'Formats',
    color: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
    tools: [
      {
        id: 'canvas-story',
        label: 'Phone Story / Wallpaper (9:16)',
        icon: Smartphone,
        description: 'Fills vertical screens with ambient blurred background',
        tag: 'Mobile',
      },
      {
        id: 'canvas-square',
        label: 'Square Album Cover (1:1)',
        icon: Square,
        description: 'Square framing with ambient glass side padding',
        tag: 'Album',
      },
      {
        id: 'canvas-cinema',
        label: 'Cinema Landscape (16:9)',
        icon: Monitor,
        description: 'Widescreen presentation with blurred ambient fill',
        tag: 'Widescreen',
      },
      {
        id: 'polaroid-frame',
        label: 'Classic Polaroid Border',
        icon: ImageIcon,
        description: 'Authentic white frame with bottom margin for captions',
        tag: 'Frame',
      },
      {
        id: 'circle-avatar',
        label: 'Circular Profile Badge',
        icon: CircleDot,
        description: 'Perfect circular crop for avatars and profile icons',
        tag: 'Avatar',
      },
    ],
  },
  {
    id: 'stamps',
    title: '4. Dynamic Overlays & Stamps',
    icon: Stamp,
    badge: 'Overlays',
    color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
    tools: [
      {
        id: 'retro-date',
        label: 'Retro 90s Film Date',
        icon: Clock,
        description: 'Amber glowing digital clock stamp burned into bottom corner',
        tag: 'Retro Clock',
      },
      {
        id: 'vault-watermark',
        label: 'Vault Copyright Badge',
        icon: ShieldCheck,
        description: 'Subtle translucent watermark protecting family memories',
        tag: 'Security',
      },
      {
        id: 'geotag-badge',
        label: 'Travel Location Geotag',
        icon: MapPin,
        description: 'Sleek frosted pill badge displaying capture location',
        tag: 'Metadata',
      },
    ],
  },
  {
    id: 'privacy',
    title: '5. Privacy & Obfuscation',
    icon: Shield,
    badge: 'Privacy',
    color: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
    tools: [
      {
        id: 'privacy-blur',
        label: 'Identity & Privacy Blur',
        icon: EyeOff,
        description: 'Heavy Gaussian blur to anonymize sensitive subjects',
        tag: 'Anonymize',
      },
      {
        id: 'pixelate',
        label: 'License Plate / Digit Pixelate',
        icon: Grid,
        description: 'Pixel mosaic effect for car plates and numbers',
        tag: 'Mosaic',
      },
      {
        id: 'document-scan',
        label: 'Document Scan / Redact',
        icon: FileText,
        description: 'Ultra-contrast black & white scanner preset for documents',
        tag: 'Scanner',
      },
    ],
  },
  {
    id: 'quality',
    title: '6. Pro Quality & Clarity',
    icon: Zap,
    badge: 'Enhance',
    color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
    tools: [
      {
        id: 'clarity',
        label: 'Neural Clarity & HDR',
        icon: Sparkles,
        description: 'Enhance micro-textures, shadow detail & edge sharpness',
        tag: 'Ultra-HD',
      },
      {
        id: 'ultra-hd',
        label: 'Lossless Fidelity Boost',
        icon: Award,
        description: 'Maximum resolution fidelity preservation with zero noise',
        tag: 'Master',
      },
      {
        id: 'low-res-thumb',
        label: 'Fast LQIP Preview',
        icon: Cpu,
        description: 'Ultra-fast blurred placeholder for instant page loads',
        tag: 'Speed',
      },
    ],
  },
  {
    id: 'motion',
    title: '7. Motion & Dynamic Media',
    icon: Video,
    badge: 'Motion',
    color: 'text-violet-400 bg-violet-500/15 border-violet-500/30',
    tools: [
      {
        id: 'animated-webp',
        label: 'Animated 3s WebP Clip',
        icon: PlayCircle,
        description: 'Converts video highlights into a looping motion sticker',
        tag: 'Loop',
      },
      {
        id: 'video-poster',
        label: 'Video Poster Extraction',
        icon: ImagePlus,
        description: 'Extracts a razor-sharp still photo frame from videos',
        tag: 'Freeze',
      },
      {
        id: 'fast-motion',
        label: 'Mobile Downscale Clip',
        icon: FastForward,
        description: 'Optimizes video dimensions for fast cellular playback',
        tag: 'Compress',
      },
    ],
  },
];

// Flat lookup of all tools for selection convenience
export const ALL_TOOLS: AITool[] = TOOL_CATEGORIES.flatMap((c) => c.tools);

function AIEditorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetPhotoId = searchParams.get('photoId');

  const [allPhotos, setAllPhotos] = useState<RealPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<RealPhoto | null>(null);
  const [selectedPhotoSrc, setSelectedPhotoSrc] = useState<string>('');
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [isPhotoLoading, setIsPhotoLoading] = useState(true);
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedTool, setSelectedTool] = useState<AITool>(ALL_TOOLS[0]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    neural: true,
  });
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCategory = useCallback((catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  }, []);

  const expandAll = useCallback(() => {
    const all: Record<string, boolean> = {};
    TOOL_CATEGORIES.forEach((c) => (all[c.id] = true));
    setExpandedCategories(all);
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedCategories({});
  }, []);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [editedPhoto, setEditedPhoto] = useState<{
    id: string;
    url: string;
    viewUrl: string;
    transform: string;
  } | null>(null);
  const [editedPhotoSrc, setEditedPhotoSrc] = useState<string>('');

  const [splitPosition, setSplitPosition] = useState(50);
  const [isComparing, setIsComparing] = useState(false);
  const [peekOriginal, setPeekOriginal] = useState(false);
  const [intensity, setIntensity] = useState([100]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [viewBackground, setViewBackground] = useState<'solid' | 'checkerboard'>('solid');

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSplit = useRef(false);

  const handleReset = useCallback(() => {
    setEditedPhoto(null);
    setEditedPhotoSrc('');
    setIsComparing(false);
    setViewBackground('solid');
    setSavedSuccess(false);
    setErrorMessage(null);
  }, []);

  const selectPhoto = useCallback(
    (photo: RealPhoto) => {
      setSelectedPhoto(photo);
      setSelectedPhotoSrc(photo.url || photo.viewUrl);
      setIsPhotoLoading(true);
      handleReset();
    },
    [handleReset]
  );

  // Load photos from vault
  const loadVaultData = useCallback(async () => {
    setIsLoadingPhotos(true);
    setLoadError(null);

    try {
      let directMatch: RealPhoto | null = null;

      // 1. If a specific photo ID is requested, fetch it directly
      if (targetPhotoId) {
        try {
          const directRes = await fetch(`/api/images/${targetPhotoId}`);
          if (directRes.ok) {
            const directData = await directRes.json();
            const img = directData.image;
            if (img) {
              const d = new Date(img.createdAt);
              directMatch = {
                id: img.id,
                url: img.signedUrl || `/api/images/${img.id}/view`,
                viewUrl: `/api/images/${img.id}/view`,
                name: (img.originalFilename || 'Photo').replace(/\.[^/.]+$/, ''),
                width: img.width,
                height: img.height,
                sizeBytes: img.compressedSizeBytes || img.originalSizeBytes,
                date: d.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }),
              };
              setSelectedPhoto(directMatch);
              setSelectedPhotoSrc(directMatch.url || directMatch.viewUrl);
              setIsPhotoLoading(true);
            }
          }
        } catch (e) {
          console.warn('Could not fetch target photo directly:', e);
        }
      }

      // 2. Fetch full list of vault photos
      const res = await fetch('/api/images');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(`Failed to load photos (HTTP ${res.status})`);
      }

      const data = await res.json();
      const mapped: RealPhoto[] = (data.images || []).map((img: any) => {
        const d = new Date(img.createdAt);
        return {
          id: img.id,
          url: img.signedUrl || `/api/images/${img.id}/view`,
          viewUrl: `/api/images/${img.id}/view`,
          name: (img.originalFilename || 'Photo').replace(/\.[^/.]+$/, ''),
          width: img.width,
          height: img.height,
          sizeBytes: img.compressedSizeBytes || img.originalSizeBytes,
          date: d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        };
      });

      // If directMatch was found, make sure it's also present in allPhotos
      if (directMatch && !mapped.some((p) => p.id === directMatch!.id)) {
        setAllPhotos([directMatch, ...mapped]);
      } else {
        setAllPhotos(mapped);
      }

      // If no photo was pre-selected yet, select target or default first
      if (!directMatch) {
        if (targetPhotoId) {
          const match = mapped.find((p) => p.id === targetPhotoId);
          if (match) {
            setSelectedPhoto(match);
            setSelectedPhotoSrc(match.url || match.viewUrl);
            setIsPhotoLoading(true);
          } else if (mapped.length > 0) {
            setSelectedPhoto(mapped[0]);
            setSelectedPhotoSrc(mapped[0].url || mapped[0].viewUrl);
            setIsPhotoLoading(true);
          }
        } else if (mapped.length > 0) {
          setSelectedPhoto(mapped[0]);
          setSelectedPhotoSrc(mapped[0].url || mapped[0].viewUrl);
          setIsPhotoLoading(true);
        }
      }
    } catch (err: any) {
      console.error('Error loading vault photos:', err);
      setLoadError(err.message || 'Failed to load photos from your vault.');
    } finally {
      setIsLoadingPhotos(false);
    }
  }, [targetPhotoId, router]);

  useEffect(() => {
    loadVaultData();
  }, [loadVaultData]);

  // Apply AI Transformation
  const handleApplyTransform = async () => {
    if (!selectedPhoto || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setSavedSuccess(false);

    if (selectedTool.id === 'bg-remove') {
      setViewBackground('checkerboard');
    }

    try {
      setProcessingStage('Retrieving original from R2...');
      await new Promise((r) => setTimeout(r, 400));

      setProcessingStage('Running ImageKit AI neural processor...');

      const response = await fetch(`/api/images/${selectedPhoto.id}/ai-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transform: selectedTool.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      setProcessingStage('Saving non-destructive version to vault...');
      const result = await response.json();

      const newEdited = {
        id: result.id,
        url: result.signedUrl || `/api/images/${result.id}/view`,
        viewUrl: `/api/images/${result.id}/view`,
        transform: selectedTool.id,
      };

      setEditedPhoto(newEdited);
      setEditedPhotoSrc(newEdited.url);

      // Add newly created version into allPhotos
      const d = new Date(result.createdAt || Date.now());
      const newVersionPhoto: RealPhoto = {
        id: result.id,
        url: result.signedUrl || `/api/images/${result.id}/view`,
        viewUrl: `/api/images/${result.id}/view`,
        name: (result.filename || 'Edited Photo').replace(/\.[^/.]+$/, ''),
        width: result.width,
        height: result.height,
        sizeBytes: result.compressedSizeBytes,
        date: d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      };

      setAllPhotos((prev) => [newVersionPhoto, ...prev]);
      setIsComparing(true);
      setSavedSuccess(true);
    } catch (err: any) {
      console.error('AI transformation error:', err);
      setErrorMessage(err.message || 'Transformation failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  // Drag handler for Split Slider
  const handlePointerDown = () => {
    isDraggingSplit.current = true;
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingSplit.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = Math.round((x / rect.width) * 100);
      setSplitPosition(percentage);
    };

    const handlePointerUp = () => {
      isDraggingSplit.current = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  return (
    <div className="bg-[#0a0a0a] text-[#e5e2e1] h-screen overflow-hidden antialiased font-[family-name:var(--font-inter)] selection:bg-[#4d8eff]/30 selection:text-white flex flex-col md:flex-row relative">
      {/* ── Main Canvas Viewport ── */}
      <main className="flex-1 min-w-0 min-h-0 relative h-[60vh] md:h-full w-full flex items-center justify-center p-3 md:p-8 lg:p-12 bg-[#090909]">
        {/* Top Floating Control Bar */}
        <div className="absolute top-4 inset-x-4 md:top-6 md:inset-x-8 z-30 flex items-center justify-between pointer-events-none">
          {/* Back button */}
          <Link
            href="/timeline"
            className="pointer-events-auto flex items-center gap-2 glass-button px-4 py-2 rounded-full text-xs font-semibold text-[#e5e2e1] hover:text-white transition-all hover:scale-105 shadow-xl pressable border-white/15"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </Link>

          {/* Switch Photo Button */}
          {allPhotos.length > 1 && (
            <button
              onClick={() => setIsPhotoPickerOpen(true)}
              className="pointer-events-auto flex items-center gap-2 glass-button px-3.5 py-1.5 rounded-full text-xs font-medium text-[#adc6ff] hover:text-white border-white/15 pressable shadow-xl"
            >
              <Images className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Switch Photo</span>
              <span className="text-[10px] text-[#8c909f] font-mono">
                ({allPhotos.length})
              </span>
            </button>
          )}

          {/* Quick comparison pills */}
          {editedPhoto && !isProcessing && (
            <div className="pointer-events-auto flex items-center gap-2 bg-[#1c1b1b]/80 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-full shadow-2xl">
              <button
                onMouseDown={() => setPeekOriginal(true)}
                onMouseUp={() => setPeekOriginal(false)}
                onTouchStart={() => setPeekOriginal(true)}
                onTouchEnd={() => setPeekOriginal(false)}
                className="flex items-center gap-1.5 text-xs font-medium text-[#c2c6d6] hover:text-white pressable"
                title="Hold to view original"
              >
                <Eye className="w-3.5 h-3.5 text-[#adc6ff]" />
                <span>{peekOriginal ? 'Original' : 'Hold to Peek'}</span>
              </button>

              <div className="w-[1px] h-3.5 bg-white/20" />

              <button
                onClick={() => setIsComparing(!isComparing)}
                className={`flex items-center gap-1.5 text-xs font-medium pressable ${
                  isComparing ? 'text-[#3b82f6]' : 'text-[#8c909f] hover:text-white'
                }`}
                title="Toggle Before/After Split"
              >
                <Split className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Split View</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Interactive Image Canvas with Split Slider ── */}
        {isLoadingPhotos ? (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#3b82f6] mb-3" />
            <p className="text-sm font-semibold text-white">Loading vault photo...</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto p-6">
            <div className="w-14 h-14 rounded-2xl bg-red-950/40 border border-red-500/30 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Failed to Load Photo</h3>
            <p className="text-xs text-[#8c909f] mb-4">{loadError}</p>
            <Button
              onClick={loadVaultData}
              className="btn-vault rounded-xl text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </Button>
          </div>
        ) : !selectedPhoto ? (
          <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto p-6">
            <div className="w-16 h-16 rounded-2xl bg-[#1e293b]/70 border border-white/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-[#adc6ff]" />
            </div>
            <h3 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-white">
              No Photos in Vault
            </h3>
            <p className="text-xs text-[#8c909f] mt-1.5 leading-relaxed">
              Upload photos to your vault timeline to edit them here in AI Studio.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <Button
                onClick={() => setIsUploadOpen(true)}
                className="btn-vault rounded-xl text-xs px-5 py-2.5 flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photos</span>
              </Button>
              <Link href="/timeline">
                <Button variant="outline" className="glass-button rounded-xl text-xs px-4 py-2.5 border-white/10">
                  Timeline
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            className={`relative w-full h-full max-w-5xl max-h-[820px] min-h-[360px] md:min-h-[500px] rounded-2xl glass-panel p-2 md:p-3 shadow-2xl flex items-center justify-center overflow-hidden border border-white/10 select-none ${
              viewBackground === 'checkerboard'
                ? 'bg-[linear-gradient(45deg,#1f2937_25%,transparent_25%),linear-gradient(-45deg,#1f2937_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1f2937_75%),linear-gradient(-45deg,transparent_75%,#1f2937_75%)] bg-[size:20px_20px] bg-[#111827]'
                : 'bg-[#101010]'
            }`}
          >
            {/* Loading Indicator for Image */}
            {isPhotoLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs rounded-xl z-10 pointer-events-none">
                <Loader2 className="w-8 h-8 animate-spin text-[#3b82f6] mb-2" />
                <span className="text-xs font-medium text-white/80">Loading image...</span>
              </div>
            )}

            {/* Base Layer: Original Photo */}
            <img
              src={selectedPhotoSrc}
              alt={selectedPhoto.name}
              onLoad={() => setIsPhotoLoading(false)}
              onError={() => {
                // If signed URL fails (CORS/adblocker/expiry), immediately fallback to streaming proxy
                if (selectedPhoto && selectedPhotoSrc !== selectedPhoto.viewUrl) {
                  setSelectedPhotoSrc(selectedPhoto.viewUrl);
                } else {
                  setIsPhotoLoading(false);
                }
              }}
              className={`w-full h-full object-contain rounded-xl pointer-events-none transition-opacity duration-300 ${
                isPhotoLoading ? 'opacity-0' : 'opacity-100'
              }`}
            />

            {/* Overlay Layer: AI Enhanced Photo with Clip-Path Split Slider */}
            {editedPhoto && !peekOriginal && (
              <div
                className="absolute inset-0 p-2 md:p-3 overflow-hidden pointer-events-none"
                style={{
                  clipPath: isComparing
                    ? `inset(0 0 0 ${splitPosition}%)`
                    : 'inset(0 0 0 0)',
                  transition: isDraggingSplit.current
                    ? 'none'
                    : 'clip-path 200ms var(--ease-out)',
                }}
              >
                <img
                  src={editedPhotoSrc}
                  alt="AI Enhanced Result"
                  onError={() => {
                    if (editedPhoto && editedPhotoSrc !== editedPhoto.viewUrl) {
                      setEditedPhotoSrc(editedPhoto.viewUrl);
                    }
                  }}
                  className="w-full h-full object-contain rounded-xl transition-all duration-300"
                  style={{
                    opacity: intensity[0] / 100,
                  }}
                />
              </div>
            )}

            {/* Interactive Split Divider Handle */}
            {editedPhoto && isComparing && !peekOriginal && (
              <div
                onPointerDown={handlePointerDown}
                style={{ left: `${splitPosition}%` }}
                className="absolute inset-y-0 w-8 -ml-4 flex items-center justify-center cursor-ew-resize z-20 group"
              >
                <div className="w-[2px] h-full bg-white/90 group-hover:bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-colors" />
                <div className="w-8 h-8 rounded-full bg-[#1e293b] border-2 border-white/90 group-hover:border-[#3b82f6] flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                  <Split className="w-4 h-4 text-white" />
                </div>
              </div>
            )}

            {/* Laser Scan Beam during AI processing */}
            {isProcessing && (
              <div className="absolute inset-0 z-30 pointer-events-none rounded-xl overflow-hidden bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#3b82f6] to-transparent shadow-[0_0_20px_#3b82f6] animate-pulse" />
                <div className="bg-[#121212]/90 border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-2xl mt-4">
                  <Loader2 className="w-5 h-5 text-[#3b82f6] animate-spin shrink-0" />
                  <span className="text-xs font-medium text-white">
                    {processingStage}
                  </span>
                </div>
              </div>
            )}

            {/* Photo Specs Badge */}
            <div className="absolute bottom-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] text-[#c2c6d6] flex items-center gap-2">
              <span className="font-semibold text-white">{selectedPhoto.name}</span>
              {selectedPhoto.width && selectedPhoto.height && (
                <>
                  <span className="text-[#525764]">•</span>
                  <span className="font-mono">
                    {selectedPhoto.width} × {selectedPhoto.height}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── AI Tools Sidebar Controls ── */}
      <aside className="w-full md:w-96 lg:w-[420px] bg-[#121212]/95 backdrop-blur-2xl border-t md:border-t-0 md:border-l border-white/10 p-5 md:p-6 flex flex-col justify-between z-40 overflow-y-auto">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#adc6ff]" />
              </div>
              <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-white tracking-tight">
                AI Photo Studio
              </h2>
            </div>

            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              Neural Engine Ready
            </span>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* AI Tools Selection Accordion (7 Categories) */}
          <div className="flex flex-col gap-3">
            {/* Search and Expand Controls */}
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c909f]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search all 29 tools..."
                  className="w-full bg-[#1b1f2b]/80 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#8c909f] focus:outline-none focus:border-[#3b82f6]/60 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#8c909f] px-1">
                <span>7 Sections ({ALL_TOOLS.length} Presets)</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Expand All
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Collapse All
                  </button>
                </div>
              </div>
            </div>

            {/* Accordion Categories */}
            <div className="flex flex-col gap-2.5">
              {TOOL_CATEGORIES.map((category) => {
                const isSearching = searchQuery.trim().length > 0;
                const filteredTools = isSearching
                  ? category.tools.filter(
                      (t) =>
                        t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.tag.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  : category.tools;

                if (isSearching && filteredTools.length === 0) return null;

                const isExpanded = isSearching || Boolean(expandedCategories[category.id]);
                const CatIcon = category.icon;
                const hasSelectedTool = category.tools.some((t) => t.id === selectedTool.id);

                return (
                  <div
                    key={category.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      hasSelectedTool
                        ? 'border-[#3b82f6]/40 bg-[#161922]'
                        : 'border-white/10 bg-[#141720]/60 hover:border-white/20'
                    }`}
                  >
                    {/* Dropdown Header Button */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      className="w-full px-3.5 py-3 flex items-center justify-between text-left cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${category.color}`}
                        >
                          <CatIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-bold text-white tracking-tight group-hover:text-blue-300 transition-colors">
                            {category.title}
                          </span>
                          <span className="text-[10px] text-[#8c909f] ml-2">
                            ({filteredTools.length})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono text-[#8c909f] bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/5">
                          {category.badge}
                        </span>
                        <div
                          className={`text-[#8c909f] transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-white' : 'rotate-0'
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </button>

                    {/* Collapsible Dropdown Content */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 flex flex-col gap-1.5 border-t border-white/5">
                        {filteredTools.map((tool) => {
                          const isSelected = selectedTool.id === tool.id;
                          const ToolIcon = tool.icon;

                          return (
                            <button
                              key={tool.id}
                              type="button"
                              disabled={isProcessing}
                              onClick={() => {
                                setSelectedTool(tool);
                                if (tool.id === 'bg-remove' || tool.id === 'circle-avatar') {
                                  setViewBackground('checkerboard');
                                } else {
                                  setViewBackground('solid');
                                }
                              }}
                              className={`flex items-start gap-3 p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                                isSelected
                                  ? 'border-[#3b82f6] bg-[#3b82f6]/15 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                                  : 'border-white/5 hover:border-white/15 hover:bg-white/[0.03]'
                              }`}
                            >
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
                                  isSelected
                                    ? 'bg-[#3b82f6] border-[#3b82f6] text-white shadow-md'
                                    : 'bg-[#1e2433] border-white/10 text-[#adc6ff]'
                                }`}
                              >
                                <ToolIcon className="w-3.5 h-3.5" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-xs font-semibold text-white truncate">
                                    {tool.label}
                                  </span>
                                  <span className="text-[9px] font-mono text-[#adc6ff] bg-[#3b82f6]/15 px-1.5 py-0.2 rounded-full border border-[#3b82f6]/20 shrink-0 ml-1">
                                    {tool.tag}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#8c909f] leading-snug line-clamp-2">
                                  {tool.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Intensity Slider */}
          {editedPhoto && (
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8c909f] font-medium flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" /> Effect Intensity
                </span>
                <span className="font-mono text-white">{intensity[0]}%</span>
              </div>
              <Slider
                value={intensity}
                onValueChange={(val) =>
                  setIntensity(Array.isArray(val) ? [...val] : [Number(val)])
                }
                max={100}
                min={10}
                step={5}
                className="py-1"
              />
            </div>
          )}

          {/* Canvas View Switcher (Solid vs Checkerboard) */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
            <span className="text-[#8c909f]">Canvas Backdrop</span>
            <div className="flex items-center gap-1 bg-[#1a1a1a] p-0.5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setViewBackground('solid')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  viewBackground === 'solid'
                    ? 'bg-white/15 text-white'
                    : 'text-[#8c909f] hover:text-white'
                }`}
              >
                Solid
              </button>
              <button
                type="button"
                onClick={() => setViewBackground('checkerboard')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  viewBackground === 'checkerboard'
                    ? 'bg-white/15 text-white'
                    : 'text-[#8c909f] hover:text-white'
                }`}
              >
                Grid
              </button>
            </div>
          </div>
        </div>

        {/* ── Bottom Actions ── */}
        <div className="flex flex-col gap-2.5 pt-5 mt-4 border-t border-white/10">
          {editedPhoto ? (
            <>
              {savedSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Saved to your vault as a linked version!</span>
                </div>
              )}

              <div className="flex gap-2">
                <a
                  href={`/api/images/${editedPhoto.id}/download`}
                  download={`${selectedPhoto?.name}-ai-${editedPhoto.transform}.webp`}
                  className="flex-1"
                >
                  <Button className="w-full btn-vault py-5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    <Download className="w-4 h-4" />
                    <span>Download Result</span>
                  </Button>
                </a>

                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="glass-button rounded-xl text-xs px-3 text-[#c2c6d6] hover:text-white border-white/15"
                  title="Revert edit"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>

              <Link href="/timeline" className="w-full">
                <Button
                  variant="outline"
                  className="w-full glass-button rounded-xl text-xs py-2 text-[#adc6ff] border-white/15"
                >
                  <span>Open in Timeline</span>
                </Button>
              </Link>
            </>
          ) : (
            <Button
              onClick={handleApplyTransform}
              disabled={isProcessing || !selectedPhoto}
              className="w-full py-6 btn-vault rounded-xl text-sm font-semibold flex items-center justify-center gap-2 pressable shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Neural Edit...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Apply {selectedTool.label}</span>
                </>
              )}
            </Button>
          )}
        </div>
      </aside>

      {/* ── Switch Photo Dialog ── */}
      <Dialog open={isPhotoPickerOpen} onOpenChange={setIsPhotoPickerOpen}>
        <DialogContent className="max-w-2xl bg-[#121212]/95 backdrop-blur-2xl border-white/10 text-[#e5e2e1] p-6 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Images className="w-5 h-5 text-[#3b82f6]" />
              <span>Choose Photo to Edit</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {allPhotos.map((photo) => {
                const isCurrent = selectedPhoto?.id === photo.id;
                return (
                  <div
                    key={photo.id}
                    onClick={() => {
                      selectPhoto(photo);
                      setIsPhotoPickerOpen(false);
                      if (typeof window !== 'undefined') {
                        window.history.replaceState(null, '', `/editor?photoId=${photo.id}`);
                      }
                    }}
                    className={`aspect-square relative rounded-xl overflow-hidden cursor-pointer group border select-none transition-all ${
                      isCurrent
                        ? 'border-[#3b82f6] ring-2 ring-[#3b82f6] scale-[0.97]'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      onError={(e) => {
                        if (e.currentTarget.src !== window.location.origin + photo.viewUrl) {
                          e.currentTarget.src = photo.viewUrl;
                        }
                      }}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-2 flex flex-col justify-end">
                      <p className="text-[10px] text-white font-medium truncate">
                        {photo.name}
                      </p>
                      <p className="text-[9px] text-[#8c909f]">{photo.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Upload Media Dialog Fallback ── */}
      <UploadMediaDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUploadComplete={loadVaultData}
      />
    </div>
  );
}

export default function AIEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-[#3b82f6]" />
        </div>
      }
    >
      <AIEditorInner />
    </Suspense>
  );
}
