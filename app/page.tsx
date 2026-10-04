import Link from "next/link";
import { Shield, Play, Plus, Sparkles, BookImage, Heart } from "lucide-react";

const screens = [
  {
    href: "/login",
    icon: Shield,
    title: "Login",
    description: "Passwordless login with glassmorphic vault aesthetic",
    badge: "Auth",
  },
  {
    href: "/dashboard",
    icon: BookImage,
    title: "Dashboard",
    description: "Bento grid layout with sidebar navigation and storage stats",
    badge: "Home",
  },
  {
    href: "/timeline",
    icon: Play,
    title: "Timeline Gallery",
    description: "Date-grouped photo grid with hover favorites and sticky headers",
    badge: "Gallery",
  },
  {
    href: "/favorites",
    icon: Heart,
    title: "Curated Favorites",
    description: "Starred family moments with instant un-favoriting and density toggle",
    badge: "Favorites",
  },
  {
    href: "/create-album",
    icon: Plus,
    title: "Create Album",
    description: "Multi-select photo picker with live cover art preview & privacy circles",
    badge: "Create",
  },
  {
    href: "/editor",
    icon: Sparkles,
    title: "AI Photo Editor",
    description: "Immersive editor with AI tool panel and processing overlay",
    badge: "Editor",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e2e1] flex flex-col items-center justify-center px-5 py-16 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/6 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-[#201f1f] border border-white/5 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-[#3b82f6]" />
        </div>
        <h1
          className="text-5xl font-bold tracking-tight text-[#e5e2e1] mb-3"
          style={{ fontFamily: "var(--font-manrope)" }}
        >
          Family Photo Vault 2.0
        </h1>
        <p className="text-base text-[#c2c6d6] max-w-md mx-auto" style={{ fontFamily: "var(--font-inter)" }}>
          Ethereal Archive design system — dark glassmorphic vault aesthetic built with Next.js &amp; shadcn/ui
        </p>
      </div>

      {/* Screen Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
        {screens.map((screen) => {
          const Icon = screen.icon;
          return (
            <Link
              key={screen.href}
              href={screen.href}
              className="glass-card rounded-2xl p-6 flex flex-col gap-4 group hover:border-[#3b82f6]/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center group-hover:bg-[#3b82f6]/20 transition-colors">
                  <Icon className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <span className="text-xs font-semibold text-[#adc6ff] bg-[#adc6ff]/10 px-2.5 py-1 rounded-full" style={{ fontFamily: "var(--font-inter)" }}>
                  {screen.badge}
                </span>
              </div>
              <div>
                <h2
                  className="text-lg font-semibold text-[#e5e2e1] mb-1 group-hover:text-white transition-colors"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {screen.title}
                </h2>
                <p className="text-sm text-[#8c909f] leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>
                  {screen.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
