'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Layers,
  Maximize2,
  Paintbrush,
  Save,
  Sparkles,
  Coins,
  Settings,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Eye,
  SunMedium,
  Contrast,
  Split,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface AITool {
  id: string;
  label: string;
  icon: typeof Layers;
  description: string;
  appliedClass: string;
  tag: string;
}

const AI_TOOLS: AITool[] = [
  {
    id: 'remove-bg',
    label: 'Remove Background',
    icon: Layers,
    description: 'Alpha cutout with fine hair & edge neural detection',
    appliedClass: 'drop-shadow-[0_25px_50px_rgba(59,130,246,0.35)] contrast-125 saturate-110',
    tag: 'Alpha 2.0',
  },
  {
    id: 'upscale',
    label: 'Neural 4x Super-Res',
    icon: Maximize2,
    description: 'Reconstruct high-frequency micro textures & eyes',
    appliedClass: 'contrast-115 brightness-105 saturate-105 sharp-filter',
    tag: 'Ultra-HD',
  },
  {
    id: 'relight',
    label: 'Generative Relight',
    icon: Paintbrush,
    description: 'Golden hour directional warmth and soft fill lighting',
    appliedClass: 'sepia-25 hue-rotate-[-10deg] saturate-130 brightness-105 contrast-110',
    tag: 'Lighting',
  },
  {
    id: 'color-restore',
    label: 'Vintage Color Restore',
    icon: Sparkles,
    description: 'Correct faded dyes, recover skin tones & deep blacks',
    appliedClass: 'saturate-135 contrast-120 brightness-100',
    tag: 'Archival',
  },
];

export default function AIEditorPage() {
  const [selectedTool, setSelectedTool] = useState<AITool | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [appliedTool, setAppliedTool] = useState<AITool | null>(null);
  const [credits, setCredits] = useState(45);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isComparing, setIsComparing] = useState(false);
  const [peekOriginal, setPeekOriginal] = useState(false);
  const [intensity, setIntensity] = useState([85]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [viewBackground, setViewBackground] = useState<'solid' | 'checkerboard'>('solid');

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSplit = useRef(false);

  const applyTool = (tool: AITool) => {
    if (isProcessing) return;
    setSelectedTool(tool);
    setIsProcessing(true);
    setSavedSuccess(false);

    // If removing background, auto-switch preview to checkerboard
    if (tool.id === 'remove-bg') {
      setViewBackground('checkerboard');
    } else {
      setViewBackground('solid');
    }

    setTimeout(() => {
      setAppliedTool(tool);
      setCredits((c) => Math.max(0, c - 1));
      setIsProcessing(false);
      setIsComparing(true);
    }, 1600);
  };

  const handleReset = () => {
    setAppliedTool(null);
    setSelectedTool(null);
    setIsComparing(false);
    setViewBackground('solid');
    setSavedSuccess(false);
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
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
      <main className="flex-1 relative h-[60vh] md:h-full w-full flex items-center justify-center p-3 md:p-8 lg:p-12 bg-[#090909]">
        {/* Top Control Bar Floating over Canvas */}
        <div className="absolute top-4 inset-x-4 md:top-6 md:inset-x-8 z-30 flex items-center justify-between pointer-events-none">
          {/* Back button */}
          <Link
            href="/timeline"
            className="pointer-events-auto flex items-center gap-2 glass-button px-4 py-2 rounded-full text-xs font-semibold text-[#e5e2e1] hover:text-white transition-all hover:scale-105 shadow-xl pressable"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </Link>

          {/* Quick comparison pills */}
          {appliedTool && !isProcessing && (
            <div className="pointer-events-auto flex items-center gap-2 bg-[#1c1b1b]/80 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-full shadow-2xl">
              <button
                onMouseDown={() => setPeekOriginal(true)}
                onMouseUp={() => setPeekOriginal(false)}
                onTouchStart={() => setPeekOriginal(true)}
                onTouchEnd={() => setPeekOriginal(false)}
                className="flex items-center gap-1.5 text-xs font-medium text-[#c2c6d6] hover:text-white pressable"
                title="Hold to see original"
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
              >
                <Split className="w-3.5 h-3.5" />
                <span>Split View</span>
              </button>

              <div className="w-[1px] h-3.5 bg-white/20" />

              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-xs font-medium text-[#8c909f] hover:text-rose-400 transition-colors pressable"
                title="Reset original photo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Interactive Image Canvas with Split Slider ── */}
        <div
          ref={containerRef}
          className={`relative w-full h-full max-w-5xl max-h-[820px] rounded-2xl glass-panel p-2 md:p-3 shadow-2xl flex items-center justify-center overflow-hidden border border-white/10 select-none ${
            viewBackground === 'checkerboard' ? 'bg-checkerboard' : 'bg-[#101010]'
          }`}
        >
          {/* Base Layer: Original Image */}
          <img
            src="https://images.unsplash.com/photo-1511895426328-dc8714191011?w=1600&auto=format&fit=crop&q=85"
            alt="Original Memory"
            className="w-full h-full object-contain rounded-xl pointer-events-none"
          />

          {/* Overlay Layer: AI Enhanced Image with Clip-Path Split Slider */}
          {appliedTool && !peekOriginal && (
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
                src="https://images.unsplash.com/photo-1511895426328-dc8714191011?w=1600&auto=format&fit=crop&q=85"
                alt="AI Enhanced Result"
                className={`w-full h-full object-contain rounded-xl transition-all duration-500 ${
                  appliedTool.appliedClass
                }`}
                style={{
                  filter: `opacity(${intensity[0]}%)`,
                }}
              />
            </div>
          )}

          {/* Interactive Split Divider Handle (Emil Kowalski / Apple design recipe) */}
          {appliedTool && isComparing && !peekOriginal && (
            <div
              onPointerDown={handlePointerDown}
              style={{ left: `${splitPosition}%` }}
              className="absolute inset-y-0 w-8 -ml-4 flex items-center justify-center cursor-ew-resize z-20 group"
            >
              {/* Vertical line */}
              <div className="w-[2px] h-full bg-white/80 group-hover:bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.6)] transition-colors" />

              {/* Center thumb knob */}
              <div className="w-8 h-8 rounded-full bg-[#1e293b] border-2 border-white/80 group-hover:border-[#3b82f6] flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                <Split className="w-4 h-4 text-white" />
              </div>
            </div>
          )}

          {/* Neural Laser Scan Beam during AI processing */}
          {isProcessing && (
            <div className="absolute inset-0 z-30 pointer-events-none rounded-xl overflow-hidden">
              {/* Backdrop blur while processing */}
              <div className="absolute inset-0 bg-[#0a0a0a]/50 backdrop-blur-sm transition-all" />

              {/* Scanning laser beam line */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#3b82f6] to-transparent shadow-[0_0_20px_#3b82f6] ai-scan-beam" />

              {/* Center status badge */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-[#181818]/90 border border-white/10 backdrop-blur-xl shadow-2xl">
                <div className="relative mb-3">
                  <Settings className="w-10 h-10 text-[#adc6ff] spinner" />
                  <Sparkles className="w-4 h-4 text-[#3b82f6] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <p className="text-sm font-semibold text-white tracking-tight">
                  {selectedTool?.label || 'Running Neural Network'}
                </p>
                <p className="text-[11px] text-[#8c909f] mt-1">
                  Synthesizing lighting, edges & pixel weights
                </p>
              </div>
            </div>
          )}

          {/* Save Success Toast */}
          {savedSuccess && (
            <div className="absolute bottom-6 z-30 flex items-center gap-2 bg-[#1c1b1b]/95 border border-emerald-500/40 text-emerald-400 px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold">Saved to R2 Encrypted Vault</span>
            </div>
          )}
        </div>
      </main>

      {/* ── AI Studio Control Panel (Sidebar on desktop / sheet on mobile) ── */}
      <aside className="w-full md:w-80 lg:w-96 flex flex-col glass-panel border-l-0 md:border-l border-t md:border-t-0 border-white/10 fixed md:relative bottom-0 h-[42vh] md:h-full z-30 rounded-t-3xl md:rounded-none shrink-0 shadow-2xl md:shadow-none bg-[#101010]/95 md:bg-transparent backdrop-blur-2xl">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-1 md:hidden" />

        <div className="p-4 md:p-6 flex-1 flex flex-col gap-5 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#e5e2e1] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#adc6ff]" />
                Neural AI Studio
              </h2>
              <p className="text-xs text-[#8c909f]">Non-destructive vault enhancements</p>
            </div>

            {/* Credit Pill */}
            <div className="flex items-center gap-1.5 bg-[#adc6ff]/10 rounded-full px-2.5 py-1 border border-[#adc6ff]/20">
              <Coins className="w-3.5 h-3.5 text-[#adc6ff]" />
              <span className="text-xs font-mono font-semibold text-[#adc6ff]">{credits}</span>
            </div>
          </div>

          {/* AI Neural Tools Grid */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold text-[#8c909f] uppercase tracking-wider">
              Enhancement Models
            </p>

            {AI_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive = appliedTool?.id === tool.id;

              return (
                <button
                  key={tool.id}
                  onClick={() => applyTool(tool)}
                  disabled={isProcessing}
                  className={`group relative flex items-center justify-between w-full p-3 rounded-xl text-left transition-all duration-200 pressable border ${
                    isActive
                      ? 'bg-white/10 border-[#3b82f6]/60 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                      : 'glass-button border-white/10 hover:border-white/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isActive ? 'bg-[#3b82f6] text-white' : 'bg-[#201f1f] text-[#c2c6d6]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-[#e5e2e1]">{tool.label}</p>
                        <span className="text-[9px] bg-white/10 text-[#adc6ff] px-1.5 py-0.2 rounded font-mono">
                          {tool.tag}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#8c909f] line-clamp-1">{tool.description}</p>
                    </div>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${
                      isActive ? 'text-[#adc6ff] rotate-90' : 'text-[#8c909f] group-hover:translate-x-1'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Fine Tuning Intensity Controls (Visible when effect applied) */}
          {appliedTool && (
            <div className="glass-card rounded-xl p-3.5 border border-white/10 flex flex-col gap-3 timeline-card-enter">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8c909f] flex items-center gap-1.5 font-medium">
                  <Sliders className="w-3.5 h-3.5" /> Effect Intensity
                </span>
                <span className="font-mono text-[#adc6ff] font-semibold">{intensity[0]}%</span>
              </div>
              <Slider
                value={intensity}
                onValueChange={(val) => setIntensity(Array.isArray(val) ? [...val] : [val])}
                min={20}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-6 pt-3 border-t border-white/10 bg-[#141414]/80 flex flex-col gap-2">
          <Button
            onClick={handleSave}
            disabled={isProcessing}
            className="w-full py-5 rounded-xl btn-vault font-semibold text-xs flex items-center justify-center gap-2 pressable shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            <Save className="w-4 h-4" />
            <span>Save to R2 Vault</span>
          </Button>
          <p className="text-[10px] text-center text-[#8c909f]">
            Preserved losslessly with version history
          </p>
        </div>
      </aside>
    </div>
  );
}
