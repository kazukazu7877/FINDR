"use client";

import React from "react";
import {
  FileText,
  Cpu,
  UserCheck,
  CheckCircle,
  Unlock,
  ArrowRight,
} from "lucide-react";

export function HowItWorksSection() {
  const steps = [
    {
      num: "01",
      icon: FileText,
      title: "Report Belonging",
      desc: "Submit your lost or found item in under 2 minutes. Add images, location, category, and private distinguishing secrets kept safely hidden from public view.",
      color: "from-blue-500/20 to-violet-500/20 text-blue-400 border-blue-500/30",
    },
    {
      num: "02",
      icon: Cpu,
      title: "65–25–10 AI Analysis",
      desc: "FINDR compares 65% multimodal vision embeddings, 25% structured attributes (color, brand, wear), and 10% campus location context to score potential pairings.",
      color: "from-violet-500/20 to-purple-500/20 text-violet-400 border-violet-500/30",
    },
    {
      num: "03",
      icon: UserCheck,
      title: "Human Staff Review",
      desc: "No automated leak of information. Campus supervisors inspect candidate pairings to ensure credibility before notifying the involved students.",
      color: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30",
    },
    {
      num: "04",
      icon: CheckCircle,
      title: "Ownership Verification",
      desc: "The student who lost the item confirms the candidate and provides private proof (hidden marks, stickers, engraving) verified by staff.",
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    },
    {
      num: "05",
      icon: Unlock,
      title: "Safe Return & Reunion",
      desc: "Once verified, authorized contact details unlock on FINDR for both parties to coordinate a safe on-campus return. Case is resolved happily.",
      color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    },
  ];

  return (
    <section id="how-it-works" className="w-full border-t border-[#231a40] bg-[#0f0b1f] py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto">
          <span className="rounded-full border border-violet-500/30 bg-violet-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-300">
            A Clear, Reassuring Journey
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How FINDR Works
          </h2>
          <p className="mt-3 text-base text-zinc-400">
            From the moment you report an item to the moment it is back in your hands,
            every step is transparent, secure, and actively supervised.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-5">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={s.num}
                className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-[#151026]/90 p-5 shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-violet-500/50 hover:bg-[#1a1430] hover:shadow-xl hover:shadow-purple-950/50"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-zinc-500">{s.num}</span>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border bg-gradient-to-br ${s.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-white">{s.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">{s.desc}</p>
                </div>

                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-zinc-600">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
