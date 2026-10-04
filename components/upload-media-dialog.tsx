'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Upload,
  X,
  FileImage,
  Film,
  CheckCircle2,
  Lock,
  ArrowRight,
  Plus,
  Loader2,
  HardDrive,
  ShieldCheck,
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
}

interface UploadingFile {
  id: string;
  name: string;
  size: string;
  type: 'image' | 'video';
  progress: number;
  status: 'uploading' | 'encrypting' | 'complete';
}

export function UploadMediaDialog({ open, onOpenChange }: UploadMediaDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (incomingFiles: FileList | null) => {
    if (!incomingFiles || incomingFiles.length === 0) return;

    const newFiles: UploadingFile[] = Array.from(incomingFiles).map((f, i) => {
      const isVideo = f.type.startsWith('video/') || f.name.endsWith('.mp4') || f.name.endsWith('.mov');
      const sizeMB = (f.size / (1024 * 1024)).toFixed(1);
      return {
        id: `${Date.now()}-${i}`,
        name: f.name,
        size: `${sizeMB} MB`,
        type: isVideo ? 'video' : 'image',
        progress: 15,
        status: 'uploading',
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);
    setIsUploading(true);

    // Simulate progressive upload & encryption animation
    setTimeout(() => {
      setFiles((prev) =>
        prev.map((file) => ({
          ...file,
          progress: 65,
          status: 'encrypting',
        }))
      );
    }, 700);

    setTimeout(() => {
      setFiles((prev) =>
        prev.map((file) => ({
          ...file,
          progress: 100,
          status: 'complete',
        }))
      );
      setIsUploading(false);
    }, 1500);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const triggerPicker = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setFiles([]);
    setIsUploading(false);
  };

  const completedCount = files.filter((f) => f.status === 'complete').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#121212]/95 backdrop-blur-2xl border-white/10 text-[#e5e2e1] p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <DialogTitle className="font-[family-name:var(--font-manrope)] text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#3b82f6]" />
              <span>Direct Media Upload</span>
            </DialogTitle>
            <p className="text-xs text-[#8c909f] mt-0.5">
              Upload raw photos and 4K videos directly to your timeline. No album needed.
            </p>
          </div>
        </DialogHeader>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {/* Drag & Drop Area */}
        {files.length === 0 ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={triggerPicker}
            className={`border-2 border-dashed rounded-2xl p-8 md:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group select-none ${
              dragActive
                ? 'border-[#3b82f6] bg-[#3b82f6]/10 scale-[1.01]'
                : 'border-white/15 hover:border-white/30 hover:bg-white/[0.02]'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-[#1e293b]/70 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
              <Upload className="w-7 h-7 text-[#adc6ff]" />
            </div>

            <h3 className="font-[family-name:var(--font-manrope)] text-base font-bold text-white">
              Drop photos or videos here
            </h3>
            <p className="text-xs text-[#8c909f] mt-1 max-w-xs">
              Supports JPEG, PNG, HEIC, MP4, MOV. Direct end-to-end cloud encryption.
            </p>

            <Button
              type="button"
              className="mt-5 btn-vault text-xs font-semibold px-4 py-2 rounded-xl pointer-events-none shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              Browse Files from Device
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Upload Queue List */}
            <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="glass-card rounded-xl p-3.5 border border-white/10 flex flex-col gap-2 timeline-card-enter"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 truncate max-w-[80%]">
                      <div className="w-7 h-7 rounded-lg bg-[#1e293b] flex items-center justify-center shrink-0">
                        {file.type === 'video' ? (
                          <Film className="w-4 h-4 text-[#adc6ff]" />
                        ) : (
                          <FileImage className="w-4 h-4 text-[#adc6ff]" />
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">{file.name}</p>
                        <p className="text-[10px] text-[#8c909f]">{file.size}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      {file.status === 'complete' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Vaulted
                        </span>
                      ) : file.status === 'encrypting' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#adc6ff]">
                          <Lock className="w-3 h-3 animate-pulse" /> Encrypting...
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-[#8c909f]">
                          {file.progress}%
                        </span>
                      )}
                    </div>
                  </div>

                  <Progress
                    value={file.progress}
                    className="h-1 bg-white/10 [&>div]:bg-[#3b82f6] transition-all duration-300"
                  />
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={triggerPicker}
                disabled={isUploading}
                className="glass-button text-xs rounded-xl px-3 py-1.5 text-[#c2c6d6]"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Add More</span>
              </Button>

              <div className="flex items-center gap-2">
                {completedCount > 0 && !isUploading && (
                  <Link href="/timeline" onClick={() => onOpenChange(false)}>
                    <Button className="btn-vault text-xs rounded-xl px-4 py-2 font-semibold shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                      <span>View in Timeline</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                )}

                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="text-xs text-[#8c909f] hover:text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
