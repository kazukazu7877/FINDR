"use client";

import React from "react";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Search,
  Key,
  Briefcase,
  Headphones,
  BookOpen,
  CreditCard,
  MapPin,
  CheckCircle2,
} from "lucide-react";

interface LandingHeroProps {
  onGetStarted: () => void;
  onExplore: () => void;
}

export function LandingHero({ onGetStarted, onExplore }: LandingHeroProps) {
  return (
    <section className="relative min-h-[90svh] w-full overflow-hidden bg-gradient-to-b from-[#0d0a1a] via-[#120d24] to-[#0d0a1a] px-4 py-12 sm:px-6 md:py-20 lg:px-8">
      {/* Subtle atmospheric ambient glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/4 top-10 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/15 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-10 top-1/3 h-96 w-96 rounded-full bg-purple-700/15 blur-[140px]"
      />

      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Typography & CTAs (Inspired by BlackHoleHero's clear focus) */}
          <div className="lg:col-span-7">
            {/* Campus Trust Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-950/40 px-3.5 py-1.5 text-xs text-violet-300 shadow-inner">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold tracking-wide uppercase text-[11px]">
                Campus AI Intelligence Active
              </span>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-300">Human Staff Verified</span>
            </div>

            {/* Main Headline */}
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[4rem] lg:leading-[1.1]">
              Lost something on campus? <br />
              <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                Let&apos;s help you find it.
              </span>
            </h1>

            {/* Supporting Prose */}
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              FINDR connects lost and found belongings across campus using intelligent
              matching and human verification, making recovery simpler for everyone.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4 sm:mt-10">
              <button
                onClick={onGetStarted}
                className="group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-purple-950/50 transition hover:from-violet-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={onExplore}
                className="rounded-full border border-violet-500/30 bg-violet-950/20 px-6 py-3.5 text-sm font-medium text-violet-200 transition hover:border-violet-400/60 hover:bg-violet-900/40 focus:outline-none"
              >
                How It Works
              </button>
            </div>

            {/* 3 Core Trust Guarantees */}
            <div className="mt-12 grid grid-cols-1 gap-4 border-t border-zinc-800/80 pt-8 sm:grid-cols-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-950 border border-violet-700/40 text-violet-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Private & Secure</h4>
                  <p className="text-[11px] text-zinc-400">Zero public contact leakage</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-950 border border-violet-700/40 text-violet-400">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">65–25–10 AI Match</h4>
                  <p className="text-[11px] text-zinc-400">Multimodal vision + context</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-950 border border-violet-700/40 text-violet-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Staff Supervised</h4>
                  <p className="text-[11px] text-zinc-400">Human verified claims</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Campus Belonging Constellation Visual (NO black hole!) */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto flex h-[420px] w-full max-w-[460px] items-center justify-center rounded-3xl border border-violet-500/20 bg-gradient-to-b from-[#181232]/80 to-[#100c22]/90 p-6 shadow-2xl backdrop-blur-xl">
              {/* Radar Discovery Circles */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-80 w-80 rounded-full border border-violet-500/10 animate-[spin_40s_linear_infinite]" />
                <div className="absolute h-60 w-60 rounded-full border border-dashed border-violet-400/20" />
                <div className="absolute h-40 w-40 rounded-full border border-violet-500/20" />
                <div className="absolute h-20 w-20 rounded-full bg-violet-600/10 blur-sm" />
              </div>

              {/* Central Campus Hub Node */}
              <div className="relative z-10 flex flex-col items-center justify-center rounded-2xl border border-violet-400/40 bg-gradient-to-tr from-violet-700 to-indigo-600 p-4 text-center shadow-xl shadow-purple-900/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur">
                  <Sparkles className="h-6 w-6" />
                </div>
                <span className="mt-2 text-xs font-bold uppercase tracking-wider text-white">
                  FINDR AI CORE
                </span>
                <span className="text-[10px] text-violet-200">Reuniting Belongings</span>
              </div>

              {/* Constellation Orbit Item: Backpack */}
              <div className="absolute left-6 top-8 flex items-center gap-2 rounded-2xl border border-zinc-700/60 bg-[#1e173b]/90 p-2.5 shadow-lg shadow-black/40 transition hover:scale-105">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Laptop Backpack</p>
                  <p className="text-[10px] text-emerald-400">● AI Match Candidate</p>
                </div>
              </div>

              {/* Constellation Orbit Item: Headphones */}
              <div className="absolute right-6 top-16 flex items-center gap-2 rounded-2xl border border-zinc-700/60 bg-[#1e173b]/90 p-2.5 shadow-lg shadow-black/40 transition hover:scale-105">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                  <Headphones className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Sony ANC Buds</p>
                  <p className="text-[10px] text-zinc-400">Library 2nd Floor</p>
                </div>
              </div>

              {/* Constellation Orbit Item: Dorm Keys */}
              <div className="absolute left-8 bottom-12 flex items-center gap-2 rounded-2xl border border-zinc-700/60 bg-[#1e173b]/90 p-2.5 shadow-lg shadow-black/40 transition hover:scale-105">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Hostel Keys</p>
                  <p className="text-[10px] text-violet-300">Staff Verified</p>
                </div>
              </div>

              {/* Constellation Orbit Item: Student ID Card */}
              <div className="absolute right-8 bottom-10 flex items-center gap-2 rounded-2xl border border-zinc-700/60 bg-[#1e173b]/90 p-2.5 shadow-lg shadow-black/40 transition hover:scale-105">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/20 text-pink-300">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Campus ID Card</p>
                  <p className="text-[10px] text-emerald-400">Reunited Today</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
