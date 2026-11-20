"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Search,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Info,
  Calendar,
  MapPin,
  Tag,
  Check,
  Radio,
} from "lucide-react";
import { Report, Match, Claim } from "@/types/database";

interface ReportStatusTrackerProps {
  report: Report;
  match?: Match | null;
  claim?: Claim | null;
  className?: string;
  onViewMatch?: () => void;
  onViewClaim?: () => void;
}

export function ReportStatusTracker({
  report,
  match,
  claim,
  className = "",
  onViewMatch,
  onViewClaim,
}: ReportStatusTrackerProps) {
  const [activeTab, setActiveTab] = useState<"progress" | "details" | "activity">("progress");

  // Determine actual lifecycle milestone based on real database records
  const isLost = report.type === "lost";
  const status = report.status;
  const matchStatus = match?.status;
  const claimStatus = claim?.status;

  let currentStep = 1;
  let statusBadgeLabel = "Submitted & Active";
  let statusBadgeColor = "bg-blue-500/20 text-blue-300 border-blue-500/40";
  let currentActionTitle = "Scanning Campus Reports";
  let currentActionDesc =
    "FINDR AI has recorded your submission and is actively scanning campus records using 65-25-10 multimodal embeddings.";
  let nextActionDesc =
    "When a potential match or claim is identified, campus supervisors will review it before notifying you.";

  if (status === "resolved") {
    currentStep = 5;
    statusBadgeLabel = "Belonging Recovered";
    statusBadgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    currentActionTitle = "Case Successfully Resolved";
    currentActionDesc =
      "This report has been marked as recovered and safely reunited with its owner on campus.";
    nextActionDesc = "No further action needed. Thank you for using FINDR!";
  } else if (status === "matched" || matchStatus === "confirmed" || claimStatus === "approved") {
    currentStep = 4;
    statusBadgeLabel = "Verified Match Available";
    statusBadgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    currentActionTitle = "Staff Verified & Contact Authorized";
    currentActionDesc =
      "Ownership has been officially verified by campus supervisors. Handover authorization is active.";
    nextActionDesc =
      "Coordinate directly with the student or visit the campus supervisor desk for item handover.";
  } else if (matchStatus === "investigating" || claimStatus === "pending") {
    currentStep = 3;
    statusBadgeLabel = "Staff Review Active";
    statusBadgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
    currentActionTitle = "Supervisory Verification in Progress";
    currentActionDesc =
      claimStatus === "pending"
        ? "An ownership claim has been submitted and is currently being inspected by campus staff."
        : "A candidate pair has been flagged by the AI engine and is being reviewed by staff for verification.";
    nextActionDesc = "You will receive an automated notification as soon as staff completes the review.";
  } else if (match || report.embedding) {
    currentStep = 2;
    statusBadgeLabel = "AI Multimodal Indexed";
    statusBadgeColor = "bg-violet-500/20 text-violet-300 border-violet-500/40";
    currentActionTitle = match ? "Candidate Pair Identified" : "Multimodal Vector Indexed";
    currentActionDesc = match
      ? "A high-confidence candidate match has been logged in the staff review queue."
      : "Multimodal image & description features extracted into 768-dimensional vector space.";
    nextActionDesc = "Awaiting campus supervisor review before disclosing student contact details.";
  }

  const milestones = [
    { num: 1, label: "Submitted", desc: "Report created & indexed", done: currentStep >= 1, active: currentStep === 1 },
    { num: 2, label: "AI Analysis", desc: "65-25-10 scan", done: currentStep >= 2, active: currentStep === 2 },
    { num: 3, label: "Staff Review", desc: "Supervisory check", done: currentStep >= 3, active: currentStep === 3 },
    { num: 4, label: "Verified", desc: "Handover unlocked", done: currentStep >= 4, active: currentStep === 4 },
    { num: 5, label: "Recovered", desc: "Reunited with owner", done: currentStep >= 5, active: currentStep === 5 },
  ];

  return (
    <div
      className={`rounded-2xl border border-violet-500/30 bg-[#15102a]/95 p-5 sm:p-6 shadow-xl shadow-purple-950/40 backdrop-blur-md transition-all duration-300 ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-violet-400 bg-violet-950/60 px-2 py-0.5 rounded border border-violet-700/50">
              #FNDR-{isLost ? "L" : "F"}-{report.id.toString().padStart(4, "0")}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-zinc-400 capitalize">{report.category}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-violet-400" />
              {report.location}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white mt-1.5">{report.title}</h3>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold shadow-sm ${statusBadgeColor}`}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
            </span>
            {statusBadgeLabel}
          </span>
        </div>
      </div>

      {/* Interactive Tabs */}
      <div className="mt-4 flex items-center gap-1.5 border-b border-zinc-800/80 pb-2">
        <button
          onClick={() => setActiveTab("progress")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
            activeTab === "progress"
              ? "bg-violet-600/30 text-violet-200 border border-violet-500/30 shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
          }`}
        >
          Lifecycle Tracker
        </button>
        <button
          onClick={() => setActiveTab("details")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
            activeTab === "details"
              ? "bg-violet-600/30 text-violet-200 border border-violet-500/30 shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
          }`}
        >
          Report Specifications
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
            activeTab === "activity"
              ? "bg-violet-600/30 text-violet-200 border border-violet-500/30 shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
          }`}
        >
          Activity Log
        </button>
      </div>

      {/* Tab 1: Visual Lifecycle Stepper */}
      {activeTab === "progress" && (
        <div className="mt-6 space-y-6 animate-fade-in-up">
          {/* Progress Timeline Stepper Bar */}
          <div className="relative pt-2 pb-3">
            <div className="absolute left-4 right-4 top-5 h-1 -translate-y-1/2 bg-zinc-800/80 rounded-full" />
            <div
              className="absolute left-4 top-5 h-1 -translate-y-1/2 bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-500 rounded-full shadow-[0_0_12px_rgba(139,92,246,0.6)] transition-all duration-500"
              style={{ width: `${Math.max(8, ((currentStep - 1) / (milestones.length - 1)) * 92)}%` }}
            />
            <div className="relative flex justify-between">
              {milestones.map((m) => {
                const isCurrent = m.active;
                return (
                  <div key={m.num} className="flex flex-col items-center text-center">
                    <div
                      className={`relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                        isCurrent
                          ? "bg-violet-600 text-white ring-4 ring-violet-500/30 shadow-lg shadow-violet-900/60 scale-110"
                          : m.done
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                          : "border border-zinc-700 bg-[#110d22] text-zinc-500"
                      }`}
                    >
                      {m.done && !isCurrent ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span>{m.num}</span>
                      )}
                      {isCurrent && (
                        <span className="absolute -inset-1 rounded-full border border-violet-400 animate-ping opacity-40" />
                      )}
                    </div>
                    <span
                      className={`mt-2 text-[11px] font-semibold transition ${
                        isCurrent
                          ? "text-violet-300 font-bold"
                          : m.done
                          ? "text-zinc-200"
                          : "text-zinc-600"
                      }`}
                    >
                      {m.label}
                    </span>
                    <span className="text-[9px] text-zinc-500 hidden sm:block mt-0.5">
                      {m.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Action Banner */}
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-950/30 via-[#181133]/50 to-[#120d26]/50 p-4 sm:p-5 shadow-inner">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30 shadow">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400 bg-violet-900/40 px-2 py-0.5 rounded border border-violet-700/40">
                    Current Milestone
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    {currentActionTitle}
                  </h4>
                </div>
                <p className="mt-1.5 text-xs text-zinc-300 leading-relaxed">
                  {currentActionDesc}
                </p>

                <div className="mt-3.5 flex items-start gap-2.5 rounded-xl bg-[#0e0a1c] p-3 border border-zinc-800">
                  <Info className="h-4 w-4 shrink-0 text-violet-400 mt-0.5" />
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    <strong className="text-zinc-200">Next Step: </strong>
                    {nextActionDesc}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Card: If Candidate Match / Verified Claim is Ready */}
          {match && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 to-purple-950/20 p-4 shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-amber-200">
                    AI Potential Match Candidate Ready
                  </h5>
                  <p className="text-[11px] text-zinc-400">
                    Similarity Score: {Math.round((match.similarity_score || 0) * 100)}% · Staff review status:{" "}
                    <span className="capitalize text-amber-300">{match.status}</span>
                  </p>
                </div>
              </div>
              {onViewMatch && (
                <button
                  onClick={onViewMatch}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black transition hover:bg-amber-400 shadow-md shadow-amber-950/50"
                >
                  Review Match Pairing →
                </button>
              )}
            </div>
          )}

          {/* Action Card: If Case is Resolved */}
          {status === "resolved" && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-emerald-200">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-white">Item Successfully Recovered</h5>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Campus supervisors verified ownership and completed the safe return handover.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Report Specs */}
      {activeTab === "details" && (
        <div className="mt-4 space-y-4 text-xs animate-fade-in-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-400">
            <div className="rounded-xl border border-zinc-800 bg-[#0e0a1c] p-3">
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Campus Location</span>
              <p className="text-zinc-200 font-medium mt-0.5">{report.location}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#0e0a1c] p-3">
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Date Lost/Found</span>
              <p className="text-zinc-200 font-medium mt-0.5">
                {report.date_lost_found || report.created_at.slice(0, 10)}
              </p>
            </div>
            {report.brand && (
              <div className="rounded-xl border border-zinc-800 bg-[#0e0a1c] p-3">
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Brand</span>
                <p className="text-zinc-200 font-medium mt-0.5">{report.brand}</p>
              </div>
            )}
            {report.color && (
              <div className="rounded-xl border border-zinc-800 bg-[#0e0a1c] p-3">
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Color</span>
                <p className="text-zinc-200 font-medium mt-0.5">{report.color}</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#0e0a1c] p-3.5">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold mb-1">
              General Description
            </span>
            <p className="text-zinc-200 leading-relaxed">{report.description}</p>
          </div>

          {report.distinctive_features && (
            <div className="rounded-xl border border-zinc-800 bg-[#0e0a1c] p-3.5">
              <span className="text-zinc-500 block text-[10px] uppercase font-bold mb-1">
                Visible Distinguishing Marks
              </span>
              <p className="text-zinc-300">{report.distinctive_features}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Activity Log */}
      {activeTab === "activity" && (
        <div className="mt-4 space-y-3 animate-fade-in-up">
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
            <div className="relative">
              <span className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-violet-500" />
              <p className="text-xs font-semibold text-white">Report Created & Vector Indexed</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {new Date(report.created_at).toLocaleString()}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Report submitted into FINDR database with location &quot;{report.location}&quot;.
              </p>
            </div>

            {match && (
              <div className="relative">
                <span className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-amber-400" />
                <p className="text-xs font-semibold text-white">
                  AI Potential Match Pairing #{match.id}
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {new Date(match.created_at).toLocaleString()}
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  65-25-10 engine computed similarity of {Math.round((match.similarity_score || 0) * 100)}%.
                </p>
              </div>
            )}

            {claim && (
              <div className="relative">
                <span className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-indigo-400" />
                <p className="text-xs font-semibold text-white">
                  Ownership Claim Submitted (#{claim.id})
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {new Date(claim.created_at).toLocaleString()}
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Student provided verification proof. Status: {claim.status}.
                </p>
              </div>
            )}

            {status === "resolved" && (
              <div className="relative">
                <span className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <p className="text-xs font-semibold text-emerald-300">Case Resolved & Reunited</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Verified handover complete</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
