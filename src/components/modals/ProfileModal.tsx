"use client";

import React, { useState } from "react";
import { X, User, Phone, GraduationCap, CheckCircle2, AlertCircle } from "lucide-react";
import { UserProfile } from "@/types/database";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onProfileUpdated: (user: UserProfile) => void;
}

const ACADEMIC_YEARS = [
  "1st Year (Freshman)",
  "2nd Year (Sophomore)",
  "3rd Year (Junior)",
  "4th Year (Senior)",
  "Postgraduate / Masters",
  "Faculty / Campus Staff",
];

const BRANCHES = [
  "Computer Science & Engineering",
  "Information Technology",
  "Electronics & Communication",
  "Electrical & Electronics",
  "Mechanical Engineering",
  "Civil Engineering",
  "Business Administration",
  "Other Sciences / Arts",
];

const SECTIONS = ["Section A", "Section B", "Section C", "Section D", "Section E", "N/A"];

export function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}: ProfileModalProps) {
  const [fullName, setFullName] = useState(currentUser.full_name || currentUser.name || "");
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [academicYear, setAcademicYear] = useState(currentUser.academic_year || ACADEMIC_YEARS[0]);
  const [branch, setBranch] = useState(currentUser.branch || BRANCHES[0]);
  const [section, setSection] = useState(currentUser.section || SECTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          academic_year: academicYear,
          branch,
          section,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to update profile.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      onProfileUpdated(data.profile);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch {
      setError("Network error updating profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl border border-violet-500/30 bg-[#151128] p-6 sm:p-8 shadow-2xl shadow-purple-950/80">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-lg">
            <User className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-lg font-bold text-white">My Academic Profile</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Keep your campus details verified for accurate lost-and-found returns.
          </p>
        </div>

        {success ? (
          <div className="my-8 text-center py-4">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400 mb-2" />
            <p className="text-sm font-semibold text-white">Profile Successfully Updated!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-[#0e0a1d] px-3 py-2 text-xs text-white focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Email (Registered)</label>
              <input
                type="email"
                disabled
                value={currentUser.email}
                className="w-full rounded-xl border border-zinc-800/50 bg-[#0b0817] px-3 py-2 text-xs text-zinc-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Mobile Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-[#0e0a1d] px-3 py-2 text-xs text-white focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Academic Year</label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-[#0e0a1d] px-3 py-2 text-xs text-white focus:border-violet-500 focus:outline-none"
                >
                  {ACADEMIC_YEARS.map((y) => (
                    <option key={y} value={y} className="bg-[#120d24]">
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Section</label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-[#0e0a1d] px-3 py-2 text-xs text-white focus:border-violet-500 focus:outline-none"
                >
                  {SECTIONS.map((s) => (
                    <option key={s} value={s} className="bg-[#120d24]">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Branch</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-[#0e0a1d] px-3 py-2 text-xs text-white focus:border-violet-500 focus:outline-none"
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b} className="bg-[#120d24]">
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
