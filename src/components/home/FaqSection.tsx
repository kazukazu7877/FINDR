"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does FINDR protect my personal phone number and email?",
      a: "Personal details (mobile number, student email, academic section) are never exposed publicly on campus browse boards or unauthenticated APIs. Only after an ownership claim is verified and authorized by campus staff do the two involved students receive authorized contact details to coordinate return.",
    },
    {
      q: "What should I do if I see my belonging in 'Browse Campus Reports'?",
      a: "Click 'This Might Be Mine' on the found item card. This opens an ownership claim form where you provide private identifying details (such as a unique sticker, engraving, scratch, or contents). Campus supervisors review your submission before unlocking communication.",
    },
    {
      q: "How does FINDR's 65–25–10 AI matching system work?",
      a: "FINDR computes a weighted composite similarity score: 65% from Google Gemini Embedding 2 multimodal vectors, 25% from structured visual attributes (color, brand, wear, category), and 10% from campus location proximity. High-scoring candidates are flagged for Staff Review.",
    },
    {
      q: "What if I don't have a photograph of the item I lost?",
      a: "Photos are completely optional for lost reports! You can provide a detailed text description, brand, color, last known campus location, and private distinguishing secrets. The AI engine embeds textual descriptions and compares them against photos submitted by finders.",
    },
    {
      q: "Who verifies claims and what happens if someone makes a false claim?",
      a: "All candidate matches and manual claims require human staff supervision. Staff members review the claimant's private identifying details against the item. If someone submits a false claim without verifiable evidence, staff rejects the claim and audits the incident.",
    },
    {
      q: "Do I have to keep checking the website to know if my item was found?",
      a: "No! FINDR has an automated multi-channel notification engine. When staff reviews and approves a possible match for your lost item, you receive automated alerts via in-app notification, email, and SMS so you can review and confirm immediately.",
    },
  ];

  return (
    <section id="faqs" className="w-full border-t border-[#231a40] bg-[#0f0b1f] py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <span className="rounded-full border border-violet-500/30 bg-violet-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-300">
            Common Questions
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            Everything you need to know about campus privacy, AI matching, and safe recovery.
          </p>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((f, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={f.q}
                className="rounded-2xl border border-zinc-800/80 bg-[#151128] overflow-hidden transition"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between p-5 text-left focus:outline-none"
                >
                  <span className="text-sm font-semibold text-white pr-4">{f.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-violet-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs leading-relaxed text-zinc-300 border-t border-zinc-800/60 bg-[#120e22]">
                    {f.a}
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
