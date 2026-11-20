"use client";

import React from "react";
import {
  Compass,
  Sparkles,
  Lock,
  UserCheck2,
  Activity,
  Send,
} from "lucide-react";

export function WhyFindrSection() {
  const pillars = [
    {
      icon: Compass,
      title: "Centralized Campus Hub",
      desc: "No more asking across 10 disjointed WhatsApp groups or visiting security desks in 4 different blocks. Everything is organized in one official platform.",
    },
    {
      icon: Sparkles,
      title: "Multi-Factor AI Matching",
      desc: "Our verified 65-25-10 engine combines multimodal vision embeddings, physical attribute tokens, and campus geolocations for unmatched accuracy.",
    },
    {
      icon: Lock,
      title: "Strict Contact Privacy",
      desc: "Personal phone numbers, emails, and student IDs are never visible publicly. Contact information is only shared after official staff verification.",
    },
    {
      icon: UserCheck2,
      title: "Human Supervisory Check",
      desc: "AI suggests; campus supervisors verify. Every match and ownership claim is inspected by authorized university staff before item release.",
    },
    {
      icon: Activity,
      title: "Intelligent Report Tracker",
      desc: "You always know what's happening. Live database tracking shows progress milestones, current actions, and upcoming steps with real timestamps.",
    },
    {
      icon: Send,
      title: "Automated Multi-Channel Alerts",
      desc: "Receive instant updates when a possible match is reviewed or confirmed. Notifications arrive directly through in-app alerts, email, and SMS.",
    },
  ];

  return (
    <section id="why-findr" className="w-full border-t border-[#231a40] bg-[#0d0a1a] py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto">
          <span className="rounded-full border border-violet-500/30 bg-violet-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-300">
            Engineered for Campus Trust
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Why University Campuses Need FINDR
          </h2>
          <p className="mt-3 text-base text-zinc-400">
            A lost item isn&apos;t just an object—it&apos;s someone&apos;s dorm key, project laptop, or campus ID.
            We designed FINDR to make recovery fast, safe, and stress-free.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="rounded-2xl border border-zinc-800/80 bg-[#141026] p-6 shadow-md transition hover:border-violet-500/40 hover:bg-[#18132e]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{p.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
