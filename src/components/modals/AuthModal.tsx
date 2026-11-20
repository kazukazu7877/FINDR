"use client";

import React, { useState } from "react";
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  GraduationCap,
  BookOpen,
  Layers,
  Shield,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { UserProfile } from "@/types/database";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  initialTab?: "login" | "register";
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

export function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  initialTab = "login",
}: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [isStaffLogin, setIsStaffLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [academicYear, setAcademicYear] = useState(ACADEMIC_YEARS[0]);
  const [branch, setBranch] = useState(BRANCHES[0]);
  const [section, setSection] = useState(SECTIONS[0]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (tab === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            full_name: fullName,
            phone,
            academic_year: academicYear,
            branch,
            section,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || "Registration failed.");
          setLoading(false);
          return;
        }

        onAuthSuccess(data.user);
        onClose();
      } else {
        // Login: Staff or Standard Student
        const endpoint = isStaffLogin ? "/api/auth/staff" : "/api/auth/login";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || "Authentication failed. Check your email and password.");
          setLoading(false);
          return;
        }

        onAuthSuccess(data.user);
        onClose();
      }
    } catch {
      setError("Network connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl border border-violet-500/30 bg-[#141026] p-6 sm:p-8 shadow-2xl shadow-purple-950/80 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-lg shadow-purple-900/40">
            {isStaffLogin ? <Shield className="h-6 w-6" /> : <GraduationCap className="h-6 w-6" />}
          </div>
          <h2 className="mt-3 text-xl font-bold text-white">
            {isStaffLogin
              ? "Staff Supervisory Access"
              : tab === "register"
              ? "Join Campus FINDR"
              : "Welcome Back"}
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            {isStaffLogin
              ? "Log in with authorized staff or supervisor credentials."
              : tab === "register"
              ? "Complete your verified profile to report or claim belongings."
              : "Sign in to monitor your reports and receive match alerts."}
          </p>
        </div>

        {/* Tab Toggle (if not in Staff Mode) */}
        {!isStaffLogin && (
          <div className="mt-6 flex rounded-xl border border-zinc-800 bg-[#0e0a1a] p-1">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                tab === "login"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("register");
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                tab === "register"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Register (Required)
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {tab === "register" && !isStaffLogin && (
            <>
              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Full Name <span className="text-violet-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Krishiv Chhabra"
                    className="w-full rounded-xl border border-zinc-800 bg-[#0d091d] pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Mobile Number <span className="text-violet-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number for SMS alerts"
                    className="w-full rounded-xl border border-zinc-800 bg-[#0d091d] pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[10px] text-zinc-500">
                  Used for verified SMS notifications upon confirmed matches.
                </p>
              </div>

              {/* Academic Year */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Academic Year <span className="text-violet-400">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-[#0d091d] pl-9 pr-3 py-2 text-xs text-white focus:border-violet-500 focus:outline-none"
                  >
                    {ACADEMIC_YEARS.map((y) => (
                      <option key={y} value={y} className="bg-[#120d24]">
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Branch & Section */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Branch <span className="text-violet-400">*</span>
                  </label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-[#0d091d] px-3 py-2 text-xs text-white focus:border-violet-500 focus:outline-none"
                  >
                    {BRANCHES.map((b) => (
                      <option key={b} value={b} className="bg-[#120d24]">
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Section <span className="text-violet-400">*</span>
                  </label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-[#0d091d] px-3 py-2 text-xs text-white focus:border-violet-500 focus:outline-none"
                  >
                    {SECTIONS.map((s) => (
                      <option key={s} value={s} className="bg-[#120d24]">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Email Address <span className="text-violet-400">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isStaffLogin ? "staff@university.edu" : "student@university.edu"}
                className="w-full rounded-xl border border-zinc-800 bg-[#0d091d] pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Password <span className="text-violet-400">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-800 bg-[#0d091d] pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-950/40 hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50"
          >
            {loading ? (
              <span>Verifying credentials...</span>
            ) : (
              <>
                <span>
                  {isStaffLogin
                    ? "Authorize Staff Access"
                    : tab === "register"
                    ? "Create Account & Continue"
                    : "Sign In"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle for Staff Access */}
        <div className="mt-6 border-t border-zinc-800/80 pt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsStaffLogin(!isStaffLogin);
              setError(null);
            }}
            className="text-[11px] text-zinc-400 hover:text-violet-300 transition"
          >
            {isStaffLogin ? "← Switch back to Student Login" : "Campus Staff or Supervisor? Log in here →"}
          </button>
        </div>
      </div>
    </div>
  );
}
