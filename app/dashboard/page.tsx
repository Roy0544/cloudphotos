'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Play,
  Heart,
  Trash2,
  Upload,
  LogOut,
  Sparkles,
  Bell,
  Info,
  Shield,
  Clock,
  HardDrive,
  Users,
  ArrowRight,
  FolderPlus,
  Maximize2,
  Layers,
  Wand2,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { VaultSidebar } from '@/components/vault-sidebar';
import { VaultMobileNav } from '@/components/vault-mobile-nav';
import { UploadMediaDialog } from '@/components/upload-media-dialog';

const FAMILY_MEMBERS = [
  { name: 'Mom', role: 'Vault Admin', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80', online: true },
  { name: 'Dad', role: 'Contributor', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', online: true },
  { name: 'Elena', role: 'Contributor', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80', online: false },
  { name: 'Grandma', role: 'Viewer', avatar: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=100&auto=format&fit=crop&q=80', online: false },
];

export default function DashboardPage() {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-[#e5e2e1] font-[family-name:var(--font-inter)] selection:bg-[#4d8eff]/30 selection:text-white">
      {/* ── Desktop Sidebar (Consistent across Dashboard & Timeline) ── */}
      <VaultSidebar currentRoute="dashboard" />

      {/* ── Main Canvas Viewport ── */}
      <main className="flex-1 overflow-y-auto bg-[#0a0a0a] flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 glass-panel border-b border-white/10 px-4 py-3.5 flex justify-between items-center backdrop-blur-xl">
          <Link href="/" className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#adc6ff]">
            Family Cloud
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="text-[#c2c6d6] p-2 hover:bg-white/5 rounded-full pressable"
            >
              <Bell className="w-5 h-5" />
            </button>
            <Avatar className="w-7 h-7 border border-white/20">
              <AvatarFallback className="bg-[#201f1f] text-[#adc6ff] text-xs">FC</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 md:p-10 lg:p-12 pb-24 md:pb-12 max-w-[1440px] mx-auto w-full flex flex-col gap-6">
          {/* Welcome & Security Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="font-[family-name:var(--font-manrope)] text-2xl md:text-3xl font-bold text-[#e5e2e1] tracking-tight">
                  Sanctuary Overview
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Encrypted & Active
                </span>
              </div>
              <p className="text-xs md:text-sm text-[#8c909f]">
                Private archival vault for irreplaceable family memories.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link href="/create-album">
                <Button className="btn-vault py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 pressable shadow-[0_0_20px_rgba(59,130,246,0.25)]">
                  <FolderPlus className="w-4 h-4" />
                  <span>New Album</span>
                </Button>
              </Link>
              <Link href="/editor">
                <Button variant="outline" className="glass-button text-xs font-semibold py-2.5 px-4 rounded-xl pressable text-[#adc6ff]">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  <span>AI Studio</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Metrics Cards (Stagger Entrance) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="glass-card rounded-2xl p-4 flex flex-col justify-between border-white/10 timeline-card-enter">
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#8c909f] font-medium">Total Memories</span>
                <Clock className="w-4 h-4 text-[#adc6ff]" />
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-[#e5e2e1]">1,428</p>
                <p className="text-[11px] text-emerald-400 mt-0.5">+24 this week</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 flex flex-col justify-between border-white/10 timeline-card-enter" style={{ animationDelay: '40ms' }}>
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#8c909f] font-medium">Cloud Vault</span>
                <Shield className="w-4 h-4 text-[#3b82f6]" />
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-[#e5e2e1]">AES-256</p>
                <p className="text-[11px] text-[#8c909f] mt-0.5">R2 Zero-Knowledge</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 flex flex-col justify-between border-white/10 timeline-card-enter" style={{ animationDelay: '80ms' }}>
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#8c909f] font-medium">Family Circle</span>
                <Users className="w-4 h-4 text-[#adc6ff]" />
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-[#e5e2e1]">4 Members</p>
                <div className="flex -space-x-1.5 mt-1">
                  {FAMILY_MEMBERS.map((m) => (
                    <Avatar key={m.name} className="w-5 h-5 border border-black/80">
                      <AvatarImage src={m.avatar} alt={m.name} />
                      <AvatarFallback className="text-[9px] bg-slate-800">{m.name[0]}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 flex flex-col justify-between border-white/10 timeline-card-enter" style={{ animationDelay: '120ms' }}>
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#8c909f] font-medium">AI Credits</span>
                <Sparkles className="w-4 h-4 text-[#adc6ff]" />
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold font-[family-name:var(--font-manrope)] text-[#adc6ff]">45 Left</p>
                <p className="text-[11px] text-[#8c909f] mt-0.5">Renews in 12 days</p>
              </div>
            </div>
          </div>

          {/* ── Main Bento Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Large Card: Latest Featured Memory */}
            <Link
              href="/timeline"
              className="md:col-span-2 glass-card rounded-2xl p-1 overflow-hidden relative group cursor-pointer block border border-white/10 hover:border-white/20 transition-all timeline-card-enter pressable"
              style={{ animationDelay: '160ms' }}
            >
              <div className="relative h-72 md:h-96 w-full overflow-hidden rounded-[14px]">
                <img
                  src="https://images.unsplash.com/photo-1511895426328-dc8714191011?w=1400&auto=format&fit=crop&q=85"
                  alt="Summer Vacation 2023"
                  className="w-full h-full object-cover rounded-[14px] opacity-80 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-700 ease-out"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-6 md:p-8 flex flex-col justify-end">
                  <div className="inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs text-[#adc6ff] border border-white/10 w-fit mb-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Preserved August 2026</span>
                  </div>

                  <h3 className="font-[family-name:var(--font-manrope)] text-2xl md:text-3xl font-bold text-white tracking-tight">
                    Paris Family Holiday
                  </h3>
                  <p className="text-xs md:text-sm text-[#c2c6d6] mt-1 max-w-lg">
                    42 high-resolution candids captured across Le Marais, Montmartre, and the Louvre.
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#adc6ff] group-hover:translate-x-1 transition-transform">
                    <span>Explore in Timeline Gallery</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Right Column Stack */}
            <div className="flex flex-col gap-5">
              {/* AI Photo Studio Quick Card */}
              <Link
                href="/editor"
                className="glass-card rounded-2xl p-5 border border-white/10 hover:border-[#3b82f6]/40 transition-all flex flex-col justify-between timeline-card-enter pressable group"
                style={{ animationDelay: '200ms' }}
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center mb-3">
                    <Wand2 className="w-4 h-4 text-[#adc6ff]" />
                  </div>
                  <h4 className="font-[family-name:var(--font-manrope)] text-base font-bold text-[#e5e2e1] group-hover:text-white transition-colors">
                    Neural AI Studio
                  </h4>
                  <p className="text-xs text-[#8c909f] mt-1 leading-relaxed">
                    Instant background removal, 4x neural upscaling, and generative lighting.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-[#adc6ff]">
                  <span>Launch Editor</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Upload Drop Zone Card - Direct Upload for Photos & Videos */}
              <div
                onClick={() => setIsUploadOpen(true)}
                className="glass-card rounded-2xl p-5 border border-dashed border-white/15 hover:border-[#3b82f6]/50 hover:bg-white/[0.03] transition-all flex flex-col items-center justify-center text-center timeline-card-enter pressable group gap-2 cursor-pointer"
                style={{ animationDelay: '240ms' }}
              >
                <div className="w-12 h-12 rounded-full bg-[#201f1f] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                  <Upload className="w-5 h-5 text-[#4d8eff]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#e5e2e1] group-hover:text-white transition-colors">
                    Upload Photos & Videos
                  </p>
                  <p className="text-[11px] text-[#8c909f] mt-0.5">
                    Direct vault upload • No album needed
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Family Circle Synced Devices Row ── */}
          <div className="glass-card rounded-2xl p-5 border border-white/10 timeline-card-enter" style={{ animationDelay: '280ms' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#adc6ff]" />
                <h4 className="font-[family-name:var(--font-manrope)] text-sm font-bold text-[#e5e2e1]">
                  Connected Family Sanctuary
                </h4>
              </div>
              <span className="text-xs text-[#8c909f]">Auto-synced via private keys</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {FAMILY_MEMBERS.map((member) => (
                <div key={member.name} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="relative">
                    <Avatar className="w-9 h-9 border border-white/15">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>{member.name[0]}</AvatarFallback>
                    </Avatar>
                    {member.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#131313]" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#e5e2e1]">{member.name}</p>
                    <p className="text-[10px] text-[#8c909f]">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ── Mobile Bottom Navigation (Consistent Home, Timeline, Favorites, AI Studio, Upload) ── */}
      <VaultMobileNav currentRoute="dashboard" />

      {/* Direct Upload Dialog */}
      <UploadMediaDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} />
    </div>
  );
}
