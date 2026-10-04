'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
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

interface AITool {
  id: 'bg-remove' | 'clarity' | 'warmth' | 'monochrome';
  label: string;
  icon: typeof Layers;
  description: string;
  tag: string;
}

const AI_TOOLS: AITool[] = [
  {
    id: 'bg-remove',
    label: 'Background Removal',
    icon: Layers,
    description: 'Neural alpha cutout with edge and hair detection',
    tag: 'Alpha AI',
  },
  {
    id: 'clarity',
    label: 'Neural Clarity & HDR',
    icon: Sparkles,
    description: 'Enhance micro-textures, shadow detail & edge sharpness',
    tag: 'Ultra-HD',
  },
  {
    id: 'warmth',
    label: 'Golden Hour Relight',
    icon: SunMedium,
    description: 'Directional warmth, tone recovery & soft fill lighting',
    tag: 'Portrait',
  },
  {
    id: 'monochrome',
    label: 'Archival Monochrome',
    icon: Paintbrush,
    description: 'Deep blacks, tonal recovery & fine grain vintage B&W',
    tag: 'Fine Art',
  },
];

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

  const [selectedTool, setSelectedTool] = useState<AITool>(AI_TOOLS[0]);
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

          {/* AI Tools Selection Grid */}
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8c909f]">
              Neural AI Transformations
            </p>

            <div className="grid grid-cols-1 gap-2">
              {AI_TOOLS.map((tool) => {
                const isSelected = selectedTool.id === tool.id;
                const Icon = tool.icon;

                return (
                  <button
                    key={tool.id}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      setSelectedTool(tool);
                      if (tool.id === 'bg-remove') {
                        setViewBackground('checkerboard');
                      } else {
                        setViewBackground('solid');
                      }
                    }}
                    className={`flex items-start gap-3.5 p-3 rounded-xl text-left transition-all border pressable ${
                      isSelected
                        ? 'border-[#3b82f6] bg-[#3b82f6]/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                        : 'border-white/10 hover:border-white/20 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-[#3b82f6] border-[#3b82f6] text-white shadow-md'
                          : 'bg-[#1e293b] border-white/10 text-[#adc6ff]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-white truncate">
                          {tool.label}
                        </span>
                        <span className="text-[10px] font-mono text-[#adc6ff] bg-[#3b82f6]/15 px-2 py-0.2 rounded-full border border-[#3b82f6]/20">
                          {tool.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8c909f] leading-snug">
                        {tool.description}
                      </p>
                    </div>
                  </button>
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
