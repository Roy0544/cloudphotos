'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileImage,
  Film,
  CheckCircle2,
  Lock,
  ArrowRight,
  Plus,
  Loader2,
  AlertCircle,
  TrendingDown,
  X,
  RotateCcw,
  StopCircle,
  FolderPlus,
  Sparkles,
  HardDrive,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface UploadMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
}

type UploadStatus =
  | 'queued'
  | 'uploading'
  | 'optimizing'
  | 'storing'
  | 'complete'
  | 'error'
  | 'cancelled';

interface UploadingFile {
  id: string;
  file: File;
  name: string;
  rawSize: number;
  originalSize: string;
  compressedSizeBytes?: number;
  compressedSize?: string;
  compressionRatio?: number;
  type: 'image' | 'video';
  progress: number;
  status: UploadStatus;
  previewUrl: string;
  errorMessage?: string;
  uploadedPhotoId?: string;
}

const CONCURRENCY_LIMIT = 3;

const PROGRESS_MAP: Record<UploadStatus, number> = {
  queued: 5,
  uploading: 35,
  optimizing: 65,
  storing: 88,
  complete: 100,
  error: 0,
  cancelled: 0,
};

const STATUS_LABELS: Record<UploadStatus, string> = {
  queued: 'Queued',
  uploading: 'Uploading...',
  optimizing: 'Optimising WebP...',
  storing: 'Saving to R2...',
  complete: 'Vaulted',
  error: 'Failed',
  cancelled: 'Cancelled',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Recursively extracts image files from dropped folders or files.
 */
async function extractFilesFromDataTransfer(
  dataTransfer: DataTransfer
): Promise<File[]> {
  const items = dataTransfer.items;
  if (!items || items.length === 0) {
    return Array.from(dataTransfer.files || []).filter((f) =>
      f.type.startsWith('image/')
    );
  }

  const files: File[] = [];

  const traverseEntry = async (entry: any): Promise<void> => {
    return new Promise((resolve) => {
      if (!entry) return resolve();

      if (entry.isFile) {
        entry.file(
          (file: File) => {
            if (
              file.type.startsWith('image/') ||
              /\.(jpg|jpeg|png|webp|avif|heic|gif)$/i.test(file.name)
            ) {
              files.push(file);
            }
            resolve();
          },
          () => resolve()
        );
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const readEntries = () => {
          dirReader.readEntries(
            async (entries: any[]) => {
              if (!entries || entries.length === 0) {
                resolve();
              } else {
                for (const subEntry of entries) {
                  await traverseEntry(subEntry);
                }
                readEntries();
              }
            },
            () => resolve()
          );
        };
        readEntries();
      } else {
        resolve();
      }
    });
  };

  const promises: Promise<void>[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const entry =
      typeof item.webkitGetAsEntry === 'function'
        ? item.webkitGetAsEntry()
        : null;
    if (entry) {
      promises.push(traverseEntry(entry));
    } else {
      const file = item.getAsFile();
      if (file && file.type.startsWith('image/')) {
        files.push(file);
      }
    }
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }

  return files.length > 0
    ? files
    : Array.from(dataTransfer.files || []).filter((f) =>
        f.type.startsWith('image/')
      );
}

export function UploadMediaDialog({
  open,
  onOpenChange,
  onUploadComplete,
}: UploadMediaDialogProps) {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef(false);
  const activeWorkersCountRef = useRef(0);

  const updateFile = useCallback(
    (id: string, updates: Partial<UploadingFile>) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
    },
    []
  );

  /**
   * Upload single photo to /api/upload with progress stages
   */
  const uploadSinglePhoto = useCallback(
    async (entry: UploadingFile): Promise<string | null> => {
      if (isCancelledRef.current) {
        updateFile(entry.id, { status: 'cancelled', progress: 0 });
        return null;
      }

      const { id, file } = entry;

      try {
        updateFile(id, {
          status: 'uploading',
          progress: PROGRESS_MAP.uploading,
        });

        const formData = new FormData();
        formData.append('file', file);

        updateFile(id, {
          status: 'optimizing',
          progress: PROGRESS_MAP.optimizing,
        });

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (isCancelledRef.current) {
          updateFile(id, { status: 'cancelled', progress: 0 });
          return null;
        }

        updateFile(id, {
          status: 'storing',
          progress: PROGRESS_MAP.storing,
        });

        if (!response.ok) {
          const errorBody = await response
            .json()
            .catch(() => ({ error: 'Upload failed.' }));
          throw new Error(errorBody.error || `HTTP ${response.status}`);
        }

        const result = await response.json();

        updateFile(id, {
          status: 'complete',
          progress: 100,
          compressedSizeBytes: result.compressedSizeBytes,
          compressedSize: formatBytes(result.compressedSizeBytes),
          compressionRatio: result.compressionRatio,
          uploadedPhotoId: result.id,
        });

        return result.id;
      } catch (err: any) {
        updateFile(id, {
          status: 'error',
          progress: 0,
          errorMessage: err.message || 'Upload failed.',
        });
        return null;
      }
    },
    [updateFile]
  );

  /**
   * Concurrency worker pool runner: ensures max 3 parallel uploads
   */
  const runWorkerPool = useCallback(
    async (entriesToProcess: UploadingFile[]) => {
      isCancelledRef.current = false;
      const queue = [...entriesToProcess];
      let queueIndex = 0;

      const worker = async () => {
        while (queueIndex < queue.length && !isCancelledRef.current) {
          const current = queue[queueIndex++];
          activeWorkersCountRef.current++;
          await uploadSinglePhoto(current);
          activeWorkersCountRef.current--;
        }
      };

      const workerCount = Math.min(CONCURRENCY_LIMIT, queue.length);
      const workers = Array.from({ length: workerCount }, () => worker());
      await Promise.all(workers);

      onUploadComplete?.();
    },
    [uploadSinglePhoto, onUploadComplete]
  );

  /**
   * Handle incoming raw files (picker or drop)
   */
  const handleIncomingFiles = useCallback(
    async (fileList: File[]) => {
      if (!fileList || fileList.length === 0) return;

      const newEntries: UploadingFile[] = fileList.map((f, i) => {
        return {
          id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          file: f,
          name: f.name,
          rawSize: f.size,
          originalSize: formatBytes(f.size),
          type: 'image',
          progress: PROGRESS_MAP.queued,
          status: 'queued' as UploadStatus,
          previewUrl: URL.createObjectURL(f),
        };
      });

      setFiles((prev) => [...prev, ...newEntries]);
      await runWorkerPool(newEntries);
    },
    [runWorkerPool]
  );

  // Drag and drop handlers with folder extraction
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    try {
      const extractedFiles = await extractFilesFromDataTransfer(e.dataTransfer);
      if (extractedFiles.length > 0) {
        handleIncomingFiles(extractedFiles);
      }
    } catch (err) {
      console.error('Error reading dropped files/folder:', err);
    }
  };

  // Retry failed items in the queue
  const retryFailed = useCallback(async () => {
    const failedItems = files.filter((f) => f.status === 'error');
    if (failedItems.length === 0) return;

    failedItems.forEach((f) => {
      updateFile(f.id, {
        status: 'queued',
        progress: PROGRESS_MAP.queued,
        errorMessage: undefined,
      });
    });

    const resetItems = failedItems.map((f) => ({
      ...f,
      status: 'queued' as UploadStatus,
      progress: PROGRESS_MAP.queued,
      errorMessage: undefined,
    }));

    await runWorkerPool(resetItems);
  }, [files, updateFile, runWorkerPool]);

  // Cancel any remaining queued files
  const cancelRemaining = () => {
    isCancelledRef.current = true;
    setFiles((prev) =>
      prev.map((f) =>
        f.status === 'queued' ? { ...f, status: 'cancelled', progress: 0 } : f
      )
    );
  };

  const handleReset = () => {
    files.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setFiles([]);
    isCancelledRef.current = false;
  };

  const handleClose = (openState: boolean) => {
    if (!openState) handleReset();
    onOpenChange(openState);
  };

  // Metrics and counts
  const completedFiles = useMemo(
    () => files.filter((f) => f.status === 'complete'),
    [files]
  );
  const completedCount = completedFiles.length;
  const failedCount = useMemo(
    () => files.filter((f) => f.status === 'error').length,
    [files]
  );
  const activeCount = useMemo(
    () =>
      files.filter(
        (f) =>
          f.status === 'queued' ||
          f.status === 'uploading' ||
          f.status === 'optimizing' ||
          f.status === 'storing'
      ).length,
    [files]
  );

  // Overall batch progress percentage
  const overallProgress = useMemo(() => {
    if (files.length === 0) return 0;
    const totalProgress = files.reduce((acc, f) => acc + f.progress, 0);
    return Math.round(totalProgress / files.length);
  }, [files]);

  // Total byte savings calculation
  const savings = useMemo(() => {
    let originalTotal = 0;
    let compressedTotal = 0;
    completedFiles.forEach((f) => {
      originalTotal += f.rawSize;
      compressedTotal += f.compressedSizeBytes || f.rawSize;
    });
    const savedBytes = Math.max(0, originalTotal - compressedTotal);
    const savedRatio =
      originalTotal > 0 ? Math.round((savedBytes / originalTotal) * 100) : 0;

    return {
      originalTotal: formatBytes(originalTotal),
      compressedTotal: formatBytes(compressedTotal),
      savedBytes: formatBytes(savedBytes),
      savedRatio,
    };
  }, [completedFiles]);

  // Array of successfully uploaded IDs for batch album creation
  const uploadedIds = useMemo(() => {
    return completedFiles
      .map((f) => f.uploadedPhotoId)
      .filter((id): id is string => Boolean(id));
  }, [completedFiles]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-[#121212]/95 backdrop-blur-2xl border-white/10 text-[#e5e2e1] p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <DialogTitle className="font-[family-name:var(--font-manrope)] text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#3b82f6]" />
              <span>Direct Batch Photo Upload</span>
            </DialogTitle>
            <p className="text-xs text-[#8c909f] mt-0.5">
              Select multiple photos or drop whole folders. Optimized to WebP and saved in Cloudflare R2.
            </p>
          </div>
        </DialogHeader>

        {/* Hidden Multiple File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleIncomingFiles(Array.from(e.target.files));
            }
          }}
          onClick={(e) => {
            (e.target as HTMLInputElement).value = '';
          }}
        />

        {/* Drag & Drop Area */}
        {files.length === 0 ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group select-none ${
              dragActive
                ? 'border-[#3b82f6] bg-[#3b82f6]/10 scale-[1.01]'
                : 'border-white/15 hover:border-white/30 hover:bg-white/[0.02]'
            }`}
          >
            <div
              className={`w-16 h-16 rounded-2xl bg-[#1e293b]/70 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner ${
                dragActive
                  ? 'scale-110 border-[#3b82f6]/50 bg-[#3b82f6]/10'
                  : ''
              }`}
            >
              <Upload
                className={`w-7 h-7 transition-colors ${
                  dragActive ? 'text-[#3b82f6]' : 'text-[#adc6ff]'
                }`}
              />
            </div>

            <h3 className="font-[family-name:var(--font-manrope)] text-base font-bold text-white">
              {dragActive ? 'Release photos or folders' : 'Drop photos or folders here'}
            </h3>
            <p className="text-xs text-[#8c909f] mt-1 max-w-sm">
              Select 20, 50, or 100+ photos at once. JPEG, PNG, WebP, HEIC supported.
            </p>

            <div className="flex items-center gap-3 mt-5">
              <Button
                type="button"
                className="btn-vault text-xs font-semibold px-5 py-2.5 rounded-xl pointer-events-none shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              >
                Browse Multiple Photos
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[10px] text-[#6b7280]">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#3b82f6]" /> End-to-end encrypted
              </span>
              <span className="flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-emerald-400" /> Auto WebP 82%
              </span>
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-[#adc6ff]" /> 3x Parallel Worker Pool
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* ── Master Batch Dashboard ── */}
            <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col gap-3 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">
                      Batch Progress:
                    </span>
                    <span className="font-mono text-sm font-semibold text-[#adc6ff]">
                      {completedCount} / {files.length} vaulted
                    </span>
                    {activeCount > 0 && (
                      <span className="text-[10px] bg-[#3b82f6]/20 text-[#adc6ff] border border-[#3b82f6]/30 px-2 py-0.5 rounded-full font-mono">
                        {activeCount} in progress
                      </span>
                    )}
                  </div>
                  {completedCount > 0 && savings.savedRatio > 0 && (
                    <p className="text-[11px] text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      <span>
                        Total storage saved: {savings.savedBytes} (-{savings.savedRatio}%)
                      </span>
                    </p>
                  )}
                </div>

                <span className="text-sm font-mono font-bold text-white">
                  {overallProgress}%
                </span>
              </div>

              {/* Master Progress Bar */}
              <Progress
                value={overallProgress}
                className="h-2 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#3b82f6] [&>div]:to-emerald-400 transition-all duration-300"
              />

              {/* Action shortcuts during or after batch */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-2">
                  {failedCount > 0 && (
                    <button
                      type="button"
                      onClick={retryFailed}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold pressable"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry {failedCount} Failed</span>
                    </button>
                  )}
                  {activeCount > 0 && (
                    <button
                      type="button"
                      onClick={cancelRemaining}
                      className="text-[#8c909f] hover:text-rose-400 flex items-center gap-1 pressable"
                    >
                      <StopCircle className="w-3 h-3" />
                      <span>Cancel Remaining</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[#adc6ff] hover:text-white font-medium flex items-center gap-1 pressable ml-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add More Files</span>
                </button>
              </div>
            </div>

            {/* ── Scrollable Queue List ── */}
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`glass-card rounded-xl p-3 border flex gap-3 items-center transition-all ${
                    file.status === 'complete'
                      ? 'border-emerald-500/20 bg-emerald-950/10'
                      : file.status === 'error'
                      ? 'border-red-500/20 bg-red-950/10'
                      : file.status === 'cancelled'
                      ? 'border-white/5 opacity-50'
                      : 'border-white/10'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#1e293b] shrink-0 border border-white/10">
                    {file.previewUrl ? (
                      <img
                        src={file.previewUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileImage className="w-4 h-4 text-[#adc6ff]" />
                      </div>
                    )}
                  </div>

                  {/* Info & Status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-semibold text-white truncate max-w-[60%]">
                        {file.name}
                      </p>

                      <div className="text-right shrink-0">
                        {file.status === 'complete' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Vaulted
                          </span>
                        ) : file.status === 'error' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-400">
                            <AlertCircle className="w-3.5 h-3.5" /> Failed
                          </span>
                        ) : file.status === 'cancelled' ? (
                          <span className="text-[11px] text-[#8c909f]">
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#adc6ff]">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {STATUS_LABELS[file.status]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Size and compression info */}
                    <div className="flex items-center gap-2 text-[10px] text-[#8c909f] mb-1">
                      <span>{file.originalSize}</span>
                      {file.status === 'complete' && file.compressedSize && (
                        <>
                          <span className="text-[#525764]">→</span>
                          <span className="text-emerald-400 font-semibold">
                            {file.compressedSize}
                          </span>
                          {file.compressionRatio !== undefined &&
                            file.compressionRatio > 0 && (
                              <span className="text-emerald-500 font-mono">
                                (-{file.compressionRatio}%)
                              </span>
                            )}
                        </>
                      )}
                    </div>

                    {file.status === 'error' ? (
                      <p className="text-[10px] text-red-400 leading-snug">
                        {file.errorMessage}
                      </p>
                    ) : (
                      <Progress
                        value={file.progress}
                        className={`h-1 bg-white/10 transition-all duration-300 ${
                          file.status === 'complete'
                            ? '[&>div]:bg-emerald-500'
                            : '[&>div]:bg-[#3b82f6]'
                        }`}
                      />
                    )}
                  </div>

                  {/* Remove Button for individual items */}
                  {(file.status === 'error' ||
                    file.status === 'complete' ||
                    file.status === 'cancelled') && (
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((prev) => prev.filter((f) => f.id !== file.id))
                      }
                      className="text-[#525764] hover:text-white transition-colors shrink-0 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* ── Post-Upload Completion Actions ── */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* 1-Click Create Album from this Batch */}
                {completedCount > 0 && activeCount === 0 && (
                  <Link
                    href={`/create-album?preselect=${uploadedIds.join(',')}`}
                    onClick={() => handleClose(false)}
                  >
                    <Button
                      variant="outline"
                      className="glass-button text-xs rounded-xl px-3.5 py-2 font-semibold text-[#adc6ff] border-[#3b82f6]/30 hover:border-[#3b82f6]/60 flex items-center gap-1.5"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-[#3b82f6]" />
                      <span>Create Album ({completedCount})</span>
                    </Button>
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-2">
                {completedCount > 0 && activeCount === 0 && (
                  <Link href="/timeline" onClick={() => handleClose(false)}>
                    <Button className="btn-vault text-xs rounded-xl px-4 py-2 font-semibold shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                      <span>View in Timeline</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                )}

                <Button
                  variant="ghost"
                  onClick={() => handleClose(false)}
                  disabled={activeCount > 0}
                  className="text-xs text-[#8c909f] hover:text-white"
                >
                  {activeCount > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Uploading ({activeCount} left)...
                    </span>
                  ) : (
                    'Close'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
