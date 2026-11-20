"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Key,
  Briefcase,
  Headphones,
  CreditCard,
  CheckCircle2,
  MapPin,
  Laptop,
  Check,
  Radio,
} from "lucide-react";

interface LandingHeroProps {
  onGetStarted: () => void;
  onExplore: () => void;
}

interface TelemetryItem {
  id: string;
  name: string;
  icon: React.ElementType;
  location: string;
  status: string;
  statusColor: string;
  x: string;
  y?: string;
  delay: string;
}

const CAMPUS_ITEMS: TelemetryItem[] = [
  {
    id: "backpack",
    name: "Laptop Backpack",
    icon: Briefcase,
    location: "CS Block 3rd Floor",
    status: "AI Candidate Match",
    statusColor: "text-violet-300 bg-violet-950/60 border-violet-500/40",
    x: "left-4 top-6 sm:left-6 sm:top-8",
    delay: "animate-float-slow",
  },
  {
    id: "buds",
    name: "Sony ANC Buds",
    icon: Headphones,
    location: "Central Library",
    status: "Staff Verified",
    statusColor: "text-amber-300 bg-amber-950/60 border-amber-500/40",
    x: "right-4 top-10 sm:right-6 sm:top-12",
    delay: "animate-float-delayed",
  },
  {
    id: "keys",
    name: "Hostel Room Keys",
    icon: Key,
    location: "Hostel Block B",
    status: "Reunited Safely",
    statusColor: "text-emerald-300 bg-emerald-950/60 border-emerald-500/40",
    x: "left-6 bottom-10 sm:left-10 sm:bottom-12",
    delay: "animate-float-delayed",
  },
  {
    id: "idcard",
    name: "Student ID Card",
    icon: CreditCard,
    location: "Cafeteria Quad",
    status: "Verified Handover",
    statusColor: "text-emerald-300 bg-emerald-950/60 border-emerald-500/40",
    x: "right-6 bottom-8 sm:right-8 sm:bottom-10",
    delay: "animate-float-slow",
  },
];

const TELEMETRY_FEED = [
  "Signal verified: HP Laptop in Central Library Reading Room",
  "Staff authorized: Dorm key handover at Security Desk A",
  "High-confidence candidate match logged: CS Quad Entrance",
  "Verified recovery: Blue Hydro Flask safely returned to student",
];

export function LandingHero({ onGetStarted, onExplore }: LandingHeroProps) {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [feedIndex, setFeedIndex] = useState(0);

  // Rotate telemetry updates smoothly
  useEffect(() => {
    const timer = setInterval(() => {
      setFeedIndex((prev) => (prev + 1) % TELEMETRY_FEED.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-[92svh] w-full overflow-hidden bg-gradient-to-b from-[#0a0715] via-[#120d26] to-[#0a0715] px-4 py-12 sm:px-6 md:py-20 lg:px-8">
      {/* ── Ambient Radial Lighting Orbs ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/4 top-16 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[140px] animate-pulse-slow"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-10 top-1/3 h-[550px] w-[550px] rounded-full bg-purple-700/15 blur-[160px] animate-drift"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 bottom-0 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-600/10 blur-[130px]"
      />

      {/* Subtle Ambient Background Grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#8b5cf6_1px,transparent_1px),linear-gradient(to_bottom,#8b5cf6_1px,transparent_1px)] bg-[size:4rem_4rem]"
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* ── Left Column: High-Impact Typography & Core Guarantees ── */}
          <div className="lg:col-span-7 z-10">
            {/* Campus Trust Beacon */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-violet-500/30 bg-violet-950/50 px-4 py-1.5 text-xs text-violet-200 shadow-lg shadow-purple-950/40 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-semibold tracking-wider uppercase text-[11px] text-violet-300">
                Campus AI Intelligence Active
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-300">Human Staff Supervised</span>
            </div>

            {/* Main Headline */}
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[4.2rem] lg:leading-[1.08]">
              Lost something on campus? <br />
              <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-indigo-200 bg-clip-text text-transparent">
                Let&apos;s help you find it.
              </span>
            </h1>

            {/* Supporting Prose */}
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              FINDR connects lost and found belongings across campus using intelligent multimodal
              AI matching and human supervisory verification — bringing recovery into one seamless platform.
            </p>

            {/* Interactive Live Telemetry Ticker */}
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-violet-500/20 bg-[#16102c]/60 px-4 py-2.5 max-w-xl backdrop-blur-md">
              <Radio className="h-4 w-4 text-violet-400 animate-pulse shrink-0" />
              <div className="overflow-hidden">
                <p className="text-xs text-zinc-300 truncate transition-all duration-500">
                  <span className="text-violet-400 font-semibold uppercase tracking-wider text-[10px] mr-1.5">
                    Live Feed:
                  </span>
                  {TELEMETRY_FEED[feedIndex]}
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4 sm:mt-10">
              <button
                onClick={onGetStarted}
                className="group relative flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-purple-950/60 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-violet-600/30 focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>

              <button
                onClick={onExplore}
                className="rounded-2xl border border-violet-500/30 bg-violet-950/30 px-7 py-4 text-sm font-semibold text-violet-200 transition-all duration-200 hover:border-violet-400/60 hover:bg-violet-900/40 hover:text-white focus:outline-none"
              >
                How It Works
              </button>
            </div>

            {/* 3 Core Trust Guarantees */}
            <div className="mt-12 grid grid-cols-1 gap-4 border-t border-zinc-800/80 pt-8 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-[#140e26]/40 p-3 transition hover:border-violet-500/30">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-950/80 border border-violet-700/40 text-violet-400 shadow">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Private & Secure</h4>
                  <p className="text-[11px] text-zinc-400">Zero public contact leakage</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-[#140e26]/40 p-3 transition hover:border-violet-500/30">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-950/80 border border-violet-700/40 text-violet-400 shadow">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">65–25–10 AI Engine</h4>
                  <p className="text-[11px] text-zinc-400">Multimodal vision + context</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-[#140e26]/40 p-3 transition hover:border-violet-500/30">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-950/80 border border-violet-700/40 text-violet-400 shadow">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Staff Supervised</h4>
                  <p className="text-[11px] text-zinc-400">Verified campus handovers</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Interactive Campus Belonging Convergence Visual ── */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto flex h-[460px] w-full max-w-[480px] items-center justify-center rounded-3xl border border-violet-500/30 bg-gradient-to-b from-[#191136]/90 via-[#130d2a]/95 to-[#0e0920] p-6 shadow-2xl shadow-purple-950/70 backdrop-blur-2xl overflow-hidden">
              {/* Radar Discovery Scanning Grid & Concentric Waves */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {/* Slow Rotating Scanning Grid Ring */}
                <div className="h-[380px] w-[380px] rounded-full border border-violet-500/10 animate-radar-sweep" />
                <div className="absolute h-72 w-72 rounded-full border border-dashed border-violet-400/20 animate-spin [animation-duration:50s]" />
                <div className="absolute h-52 w-52 rounded-full border border-violet-500/25" />
                <div className="absolute h-32 w-32 rounded-full border border-violet-400/30 bg-violet-600/5 animate-radar-ping" />
              </div>

              {/* Connecting Glowing Signal Vectors */}
              <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                <line x1="20%" y1="20%" x2="50%" y2="50%" stroke="rgba(139, 92, 246, 0.25)" strokeWidth="1.5" strokeDasharray="4 4" />
                <line x1="80%" y1="22%" x2="50%" y2="50%" stroke="rgba(139, 92, 246, 0.25)" strokeWidth="1.5" strokeDasharray="4 4" />
                <line x1="22%" y1="80%" x2="50%" y2="50%" stroke="rgba(139, 92, 246, 0.25)" strokeWidth="1.5" strokeDasharray="4 4" />
                <line x1="78%" y1="78%" x2="50%" y2="50%" stroke="rgba(139, 92, 246, 0.25)" strokeWidth="1.5" strokeDasharray="4 4" />
              </svg>

              {/* Central Hub Node: FINDR Multimodal Core */}
              <div className="relative z-10 flex flex-col items-center justify-center rounded-2xl border border-violet-400/50 bg-gradient-to-tr from-violet-700 via-purple-600 to-indigo-600 p-5 text-center shadow-2xl shadow-purple-950/80 transition-transform duration-300 hover:scale-105 cursor-pointer">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur shadow-inner">
                  <Sparkles className="h-7 w-7 text-white animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
                  </span>
                </div>
                <span className="mt-2.5 text-xs font-extrabold uppercase tracking-widest text-white">
                  FINDR AI CORE
                </span>
                <span className="text-[10px] text-violet-200 mt-0.5">
                  65-25-10 Convergence
                </span>
              </div>

              {/* Floating Campus Belonging Telemetry Cards */}
              {CAMPUS_ITEMS.map((item) => {
                const IconComponent = item.icon;
                const isHovered = activeItem === item.id;
                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setActiveItem(item.id)}
                    onMouseLeave={() => setActiveItem(null)}
                    className={`absolute ${item.x} ${item.delay} z-20 flex items-center gap-2.5 rounded-2xl border border-zinc-700/70 bg-[#1d163a]/90 p-3 shadow-xl shadow-black/50 backdrop-blur-md transition-all duration-300 cursor-pointer ${
                      isHovered
                        ? "scale-110 border-violet-400/80 shadow-violet-900/60"
                        : "hover:scale-105 hover:border-violet-500/50"
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-900/50 border border-violet-700/40 text-violet-300">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white leading-tight">{item.name}</p>
                      <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-2.5 w-2.5 text-violet-400" />
                        {item.location}
                      </p>
                      <span className={`mt-1 inline-block rounded px-1.5 py-0.2 text-[9px] font-semibold border ${item.statusColor}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
