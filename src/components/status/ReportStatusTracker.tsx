"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Search,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronRight,
  Info,
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
  const status = report.status; // 'active' | 'matched' | 'resolved' | 'withdrawn' | 'investigating'
  const matchStatus = match?.status; // 'pending' | 'confirmed' | 'dismissed' | 'investigating'
  const claimStatus = claim?.status; // 'pending' | 'approved' | 'rejected' | 'more_info_needed'

  let currentStep = 1;
  let statusBadgeLabel = "Submitted & Active";
  let statusBadgeColor = "bg-blue-500/20 text-blue-300 border-blue-500/30";
  let currentActionTitle = "Scanning Campus Reports";
  let currentActionDesc = "FINDR AI has recorded your submission and is comparing it against campus records using 65-25-10 multimodal embeddings.";
  let nextActionDesc = "When a potential match or claim is identified, campus supervisors will review it before notifying you.";

  if (status === "resolved") {
    currentStep = 5;
    statusBadgeLabel = "Belonging Recovered";
    statusBadgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    currentActionTitle = "Case Successfully Resolved";
    currentActionDesc = "This report has been marked as recovered and safely reunited with its owner.";
    nextActionDesc = "No further action needed. Thank you for using FINDR!";
  } else if (status === "matched" || matchStatus === "confirmed" || claimStatus === "approved") {
    currentStep = 4;
    statusBadgeLabel = "Verified Match Available";
    statusBadgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    currentActionTitle = "Staff Verified & Contact Authorized";
    currentActionDesc = "Ownership has been officially verified by campus staff. Authorized contact information is now unlocked.";
    nextActionDesc = "Coordinate directly with the other party to arrange a safe on-campus handover.";
  } else if (matchStatus === "investigating" || claimStatus === "pending") {
    currentStep = 3;
    statusBadgeLabel = "Staff Review in Progress";
    statusBadgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/30";
    currentActionTitle = "Supervisory Verification Active";
    currentActionDesc = claimStatus === "pending"
      ? "An ownership claim has been submitted and is currently being inspected by campus staff."
      : "A candidate pair has been flagged by AI and is being reviewed by staff for student confirmation.";
    nextActionDesc = "You will receive an automated alert as soon as staff completes the review.";
  } else if (match || report.embedding) {
    currentStep = 2;
    statusBadgeLabel = "AI Analysis Complete";
    statusBadgeColor = "bg-violet-500/20 text-violet-300 border-violet-500/30";
    currentActionTitle = match ? "Candidate Identified" : "AI Indexing Complete";
    currentActionDesc = match
      ? "A high-confidence candidate match has been logged in the staff review queue."
      : "Multimodal image & description features extracted into 768-dimensional vector space.";
    nextActionDesc = "Awaiting staff supervisor review before disclosure.";
  }

  const milestones = [
    { num: 1, label: "Submitted", done: currentStep >= 1, active: currentStep === 1 },
    { num: 2, label: "AI Analysis", done: currentStep >= 2, active: currentStep === 2 },
    { num: 3, label: "Staff Review", done: currentStep >= 3, active: currentStep === 3 },
    { num: 4, label: "Ownership Verified", done: currentStep >= 4, active: currentStep === 4 },
    { num: 5, label: "Recovered", done: currentStep >= 5, active: currentStep === 5 },
  ];

  return (
    <div
      className={`rounded-2xl border border-violet-500/30 bg-[#161228] p-5 shadow-xl ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-violet-400">
              #FNDR-{isLost ? "L" : "F"}-{report.id.toString().padStart(4, "0")}
            </span>
            <span className="text-zinc-500">•</span>
            <span className="text-xs text-zinc-400 capitalize">{report.category}</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-0.5">{report.title}</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeColor}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            {statusBadgeLabel}
          </span>
        </div>
      </div>

      {/* Interactive Tabs */}
      <div className="mt-4 flex items-center gap-1 border-b border-zinc-800/80 pb-2">
        <button
          onClick={() => setActiveTab("progress")}
          className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
            activeTab === "progress"
              ? "bg-violet-600/30 text-violet-200 border border-violet-500/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Lifecycle Tracker
        </button>
        <button
          onClick={() => setActiveTab("details")}
          className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
            activeTab === "details"
              ? "bg-violet-600/30 text-violet-200 border border-violet-500/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Report Specs
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
            activeTab === "activity"
              ? "bg-violet-600/30 text-violet-200 border border-violet-500/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Activity Log
        </button>
      </div>

      {/* Tab 1: Visual Lifecycle Stepper */}
      {activeTab === "progress" && (
        <div className="mt-5 space-y-6">
          {/* Stepper Bar */}
          <div className="relative">
            <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-zinc-800" />
            <div
              className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-500"
              style={{ width: `${((currentStep - 1) / (milestones.length - 1)) * 100}%` }}
            />
            <div className="relative flex justify-between">
              {milestones.map((m) => (
                <div key={m.num} className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                      m.done
                        ? "bg-violet-600 text-white shadow-md shadow-violet-900/50"
                        : "border border-zinc-700 bg-[#120e22] text-zinc-500"
                    }`}
                  >
                    {m.done ? "✓" : m.num}
                  </div>
                  <span
                    className={`mt-2 text-[10px] font-medium hidden sm:block ${
                      m.active ? "text-violet-300 font-bold" : m.done ? "text-zinc-300" : "text-zinc-600"
                    }`}
                  >
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Current State Explanation Card */}
          <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-violet-300">
                  What is happening now: {currentActionTitle}
                </h4>
                <p className="mt-1 text-xs text-zinc-300 leading-relaxed">{currentActionDesc}</p>

                <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#0e0a1c] p-2.5 border border-zinc-800">
                  <Info className="h-4 w-4 shrink-0 text-violet-400 mt-0.5" />
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    <span className="font-semibold text-zinc-300">Next Step: </span>
                    {nextActionDesc}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button if Match / Claim is available */}
          {match && (
            <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-950/20 p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium text-amber-200">
                  AI Potential Match ({Math.round((match.similarity_score || 0) * 100)}% match score)
                </span>
              </div>
              {onViewMatch && (
                <button
                  onClick={onViewMatch}
                  className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 transition"
                >
                  Review Match
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Report Specs */}
      {activeTab === "details" && (
        <div className="mt-4 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2 text-zinc-400">
            <div>
              <span className="text-zinc-500">Location:</span>{" "}
              <span className="text-zinc-200 font-medium">{report.location}</span>
            </div>
            <div>
              <span className="text-zinc-500">Date Recorded:</span>{" "}
              <span className="text-zinc-200 font-medium">{report.date_lost_found || report.created_at.slice(0, 10)}</span>
            </div>
            {report.brand && (
              <div>
                <span className="text-zinc-500">Brand:</span>{" "}
                <span className="text-zinc-200 font-medium">{report.brand}</span>
              </div>
            )}
            {report.color && (
              <div>
                <span className="text-zinc-500">Color:</span>{" "}
                <span className="text-zinc-200 font-medium">{report.color}</span>
              </div>
            )}
          </div>
          <div className="border-t border-zinc-800 pt-2">
            <span className="text-zinc-500 block mb-1">Description:</span>
            <p className="text-zinc-300 bg-[#100c22] p-2.5 rounded-lg border border-zinc-800/60 leading-relaxed">
              {report.description}
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Activity Log */}
      {activeTab === "activity" && (
        <div className="mt-4 space-y-2.5 text-xs">
          <div className="flex items-start gap-2.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400 mt-1" />
            <div>
              <p className="text-zinc-200 font-semibold">Report Created</p>
              <p className="text-[10px] text-zinc-500">
                {new Date(report.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          {report.embedding && (
            <div className="flex items-start gap-2.5">
              <div className="h-2 w-2 rounded-full bg-violet-400 mt-1" />
              <div>
                <p className="text-zinc-200 font-semibold">Gemini Multimodal Vector Generated</p>
                <p className="text-[10px] text-zinc-500">768 dimensions indexed in campus database</p>
              </div>
            </div>
          )}
          {match && (
            <div className="flex items-start gap-2.5">
              <div className="h-2 w-2 rounded-full bg-amber-400 mt-1" />
              <div>
                <p className="text-zinc-200 font-semibold">
                  Match Candidate #{match.id} Logged ({Math.round((match.similarity_score || 0) * 100)}%)
                </p>
                <p className="text-[10px] text-zinc-500">{new Date(match.created_at).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
