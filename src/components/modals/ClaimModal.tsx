"use client";

import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
} from "lucide-react";
import { Report, UserProfile } from "@/types/database";

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
  currentUser: UserProfile;
  onClaimSuccess: () => void;
}

export function ClaimModal({
  isOpen,
  onClose,
  report,
  currentUser,
  onClaimSuccess,
}: ClaimModalProps) {
  const [claimReason, setClaimReason] = useState("");
  const [identifyingDetails, setIdentifyingDetails] = useState("");
  const [additionalEvidence, setAdditionalEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !report) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!claimReason.trim() || !identifyingDetails.trim()) {
      setError("Please explain why you believe this is yours and provide identifying proof.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: report.id,
          claimant_id: currentUser.id,
          claim_reason: claimReason.trim(),
          identifying_details: identifyingDetails.trim(),
          additional_evidence: additionalEvidence.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to submit claim.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onClaimSuccess();
        onClose();
      }, 2000);
    } catch {
      setError("Network error submitting claim. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl border border-violet-500/30 bg-[#151128] p-6 sm:p-8 shadow-2xl shadow-purple-950/80 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-violet-500/20 px-2 py-0.5 font-mono text-[11px] font-semibold text-violet-300 border border-violet-500/30">
              Found Report #FNDR-F-{report.id.toString().padStart(4, "0")}
            </span>
            <span className="text-xs text-zinc-400">{report.location}</span>
          </div>
          <h2 className="mt-2 text-xl font-bold text-white">This Might Be Mine</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Submit your ownership verification for &ldquo;{report.title}&rdquo;.
          </p>
        </div>

        {/* Essential Security Notice */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200">
          <Lock className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-semibold text-amber-100">Verification Notice: </span>
            Submitting a claim does not automatically confirm ownership or reveal contact info.
            Our campus staff reviews your identifying details before authorizing any return.
          </p>
        </div>

        {success ? (
          <div className="my-8 text-center py-6">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400 mb-3 animate-bounce" />
            <h3 className="text-base font-bold text-white">Claim Submitted for Staff Review</h3>
            <p className="mt-2 text-xs text-zinc-300 max-w-sm mx-auto">
              Campus supervisors have been alerted. You can track this claim anytime in{" "}
              <span className="text-violet-300 font-semibold">My Reports</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Why you believe it's yours */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Why do you believe this item belongs to you? <span className="text-violet-400">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={claimReason}
                onChange={(e) => setClaimReason(e.target.value)}
                placeholder="e.g. I lost my blue Acer laptop charger on Monday in the 3rd floor library study pod."
                className="w-full rounded-xl border border-zinc-800 bg-[#0e0a1d] p-3 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>

            {/* Identifying Characteristics */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Distinctive Identifying Details / Proof <span className="text-violet-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={identifyingDetails}
                onChange={(e) => setIdentifyingDetails(e.target.value)}
                placeholder="Details only the true owner would know: e.g. stickers, initials on back, scratches, serial digits, keychain charm..."
                className="w-full rounded-xl border border-zinc-800 bg-[#0e0a1d] p-3 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-zinc-500">
                Kept strictly private between you and the reviewing campus supervisor.
              </p>
            </div>

            {/* Additional Evidence */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Additional Evidence (Optional)
              </label>
              <input
                type="text"
                value={additionalEvidence}
                onChange={(e) => setAdditionalEvidence(e.target.value)}
                placeholder="e.g. purchase invoice date, serial number, lock code..."
                className="w-full rounded-xl border border-zinc-800 bg-[#0e0a1d] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>

            {/* Claimant Identity Snapshot */}
            <div className="rounded-xl border border-zinc-800 bg-[#0f0b1f] p-3 text-xs text-zinc-400">
              <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                Submitting Claimant Identity
              </span>
              <p className="text-zinc-200 font-medium">
                {currentUser.full_name || currentUser.name || "User"} · {currentUser.branch || "Campus"} ({currentUser.academic_year || "Student"})
              </p>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                Contact: {currentUser.email} | {currentUser.phone || "No phone saved"}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50"
              >
                {submitting ? "Submitting Claim..." : "Submit Claim for Verification"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
