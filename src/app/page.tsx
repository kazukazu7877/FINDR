"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Sparkles,
  Search,
  PlusCircle,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  ArrowRight,
  Filter,
  Eye,
  Lock,
  Unlock,
  MapPin,
  Calendar,
  Tag,
  Briefcase,
  HelpCircle,
  Check,
  UserCheck,
  RotateCcw,
  Bell,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

import { Navbar } from "@/components/navigation/Navbar";
import { LandingHero } from "@/components/home/LandingHero";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { WhyFindrSection } from "@/components/home/WhyFindrSection";
import { FaqSection } from "@/components/home/FaqSection";
import { ReportStatusTracker } from "@/components/status/ReportStatusTracker";
import { AuthModal } from "@/components/modals/AuthModal";
import { ClaimModal } from "@/components/modals/ClaimModal";
import { ProfileModal } from "@/components/modals/ProfileModal";
import { LocationCombobox } from "@/components/ui/LocationCombobox";
import { Report, Match, Claim, Notification, UserProfile } from "@/types/database";

const CATEGORIES = [
  "All",
  "Electronics",
  "Bags & Wallets",
  "Clothing",
  "Books & Stationery",
  "Keys",
  "Accessories",
  "Other",
];

const CAMPUS_LOCATIONS = [
  "All Campus",
  "Central Library",
  "Computer Science Block",
  "Engineering Labs",
  "Student Center / Cafeteria",
  "Main Auditorium",
  "Sports Complex / Gym",
  "Hostel / Dormitories",
  "Academic Quadrangle",
  "Campus Bus Stop",
];

export default function FindrApp() {
  // Session & Navigation State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [mode, setMode] = useState<"user" | "staff">("user");
  const [activeTab, setActiveTab] = useState<string>("home");

  // Modals State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<"login" | "register">("login");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedReportForClaim, setSelectedReportForClaim] = useState<Report | null>(null);

  // Data State
  const [reports, setReports] = useState<Report[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State (Reporting Lost / Found)
  const [formType, setFormType] = useState<"lost" | "found">("lost");
  const [submitting, setSubmitting] = useState(false);
  const [formSuccessReceipt, setFormSuccessReceipt] = useState<Report | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [distinctiveFeatures, setDistinctiveFeatures] = useState("");
  const [distinctiveSecret, setDistinctiveSecret] = useState("");
  const [dateLostFound, setDateLostFound] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Browse Reports Filters
  const [browseTypeFilter, setBrowseTypeFilter] = useState<"all" | "lost" | "found">("all");
  const [browseCategoryFilter, setBrowseCategoryFilter] = useState("All");
  const [browseLocationFilter, setBrowseLocationFilter] = useState("All Campus");
  const [searchQuery, setSearchQuery] = useState("");

  // Staff Manual Matching State
  const [manualLostId, setManualLostId] = useState<number | null>(null);
  const [manualFoundId, setManualFoundId] = useState<number | null>(null);
  const [manualReason, setManualReason] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);

  // Load user session on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("findr_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as UserProfile;
        if (parsed && typeof parsed === "object") {
          if (!parsed.full_name && parsed.name) parsed.full_name = parsed.name;
          if (!parsed.name && parsed.full_name) parsed.name = parsed.full_name;
          setCurrentUser(parsed);
          localStorage.setItem("findr_user", JSON.stringify(parsed));
          if (parsed.role === "staff" || parsed.role === "supervisor") {
            setMode("staff");
            setActiveTab("staff-dashboard");
          } else {
            setActiveTab("dashboard");
          }
        }
      }
    } catch {
      localStorage.removeItem("findr_user");
    }
  }, []);

  // Fetch Reports, Matches, Claims, and Notifications
  const fetchData = async () => {
    try {
      setLoading(true);
      const [repRes, matchRes] = await Promise.all([
        fetch("/api/reports"),
        fetch("/api/matches"),
      ]);

      const repData = await repRes.json();
      const matchData = await matchRes.json();

      if (repData.reports) setReports(repData.reports);
      if (matchData.matches) setMatches(matchData.matches);

      if (currentUser) {
        // Fetch User Notifications
        const notifRes = await fetch(`/api/notifications?userId=${currentUser.id}`);
        const notifData = await notifRes.json();
        if (notifData.notifications) setNotifications(notifData.notifications);

        // Fetch Claims
        const claimsUrl =
          currentUser.role === "staff" || currentUser.role === "supervisor"
            ? "/api/claims"
            : `/api/claims?claimantId=${currentUser.id}`;
        const claimRes = await fetch(claimsUrl);
        const claimData = await claimRes.json();
        if (claimData.claims) setClaims(claimData.claims);
      }
    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  // Auth Handlers
  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem("findr_user", JSON.stringify(user));
    if (user.role === "staff" || user.role === "supervisor") {
      setMode("staff");
      setActiveTab("staff-dashboard");
    } else {
      setMode("user");
      setActiveTab("dashboard");
    }
    fetchData();
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem("findr_user");
    setMode("user");
    setActiveTab("home");
  };

  const handleSwitchMode = (newMode: "user" | "staff") => {
    setMode(newMode);
    setActiveTab(newMode === "staff" ? "staff-dashboard" : "dashboard");
  };

  // Image Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const resetReportForm = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setBrand("");
    setColor("");
    setDistinctiveFeatures("");
    setDistinctiveSecret("");
    setDateLostFound("");
    setSelectedFile(null);
    setFilePreview(null);
    setFormError(null);
    setFormSuccessReceipt(null);
  };

  // Report Submission Handler
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setAuthInitialTab("login");
      setAuthModalOpen(true);
      return;
    }

    setSubmitting(true);
    setFormError(null);

    if (!title.trim() || !description.trim() || !location.trim()) {
      setFormError("Item title, description, and location are required.");
      setSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("type", formType);
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("category", category);
      formData.append("location", location);
      formData.append("user_id", String(currentUser.id));
      if (brand.trim()) formData.append("brand", brand.trim());
      if (color.trim()) formData.append("color", color.trim());
      if (distinctiveFeatures.trim()) formData.append("distinctive_features", distinctiveFeatures.trim());
      if (distinctiveSecret.trim()) formData.append("distinctive_secret", distinctiveSecret.trim());
      if (dateLostFound.trim()) formData.append("date_lost_found", dateLostFound.trim());
      if (selectedFile) formData.append("image", selectedFile);

      const res = await fetch("/api/reports", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Failed to submit report.");
        setSubmitting(false);
        return;
      }

      setFormSuccessReceipt(data.report);
      fetchData();
    } catch {
      setFormError("Network error submitting report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Staff Match Review Action
  const handleMatchAction = async (
    matchId: number,
    action: "approve_candidate" | "confirm" | "dismiss",
    notes?: string
  ) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          action,
          reviewerName: `${currentUser.full_name || currentUser.name || "Staff"} (${currentUser.role})`,
          notes: notes || "Reviewed via Staff Workspace",
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error("Match action error:", err);
    }
  };

  // Staff Claim Review Action
  const handleClaimAction = async (
    claimId: number,
    action: "approved" | "rejected" | "more_info_needed",
    staffNotes?: string
  ) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/claims", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          action,
          reviewerName: `${currentUser.full_name || currentUser.name || "Staff"} (${currentUser.role})`,
          staffNotes: staffNotes || `Marked ${action} by supervisor`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error("Claim action error:", err);
    }
  };

  // Staff Manual Match Creation
  const handleCreateManualMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLostId || !manualFoundId || !currentUser) return;
    setManualSubmitting(true);
    setManualSuccess(null);

    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manual",
          lostReportId: manualLostId,
          foundReportId: manualFoundId,
          reviewerName: `${currentUser.full_name || currentUser.name || "Staff"} (${currentUser.role})`,
          notes: manualReason.trim() || "Manual staff pairing",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setManualSuccess(`Successfully created manual match pairing #${data.match.id}`);
        setManualLostId(null);
        setManualFoundId(null);
        setManualReason("");
        fetchData();
      }
    } catch (err) {
      console.error("Manual match error:", err);
    } finally {
      setManualSubmitting(false);
    }
  };

  // Filtered Reports for Browse Page
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (browseTypeFilter !== "all" && r.type !== browseTypeFilter) return false;
      if (browseCategoryFilter !== "All" && r.category !== browseCategoryFilter) return false;
      if (
        browseLocationFilter !== "All Campus" &&
        !r.location?.toLowerCase().includes(browseLocationFilter.toLowerCase())
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesDesc = r.description.toLowerCase().includes(q);
        const matchesBrand = r.brand?.toLowerCase().includes(q);
        const matchesLoc = r.location?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesBrand && !matchesLoc) return false;
      }
      return true;
    });
  }, [reports, browseTypeFilter, browseCategoryFilter, browseLocationFilter, searchQuery]);

  // Derived user reports
  const myReports = useMemo(() => {
    if (!currentUser) return [];
    return reports.filter((r) => r.user_id === currentUser.id);
  }, [reports, currentUser]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0d0a1a] text-[#f0eef5] selection:bg-violet-500 selection:text-white">
      {/* Top Application Header & Profile Taskbar */}
      <Navbar
        currentUser={currentUser}
        mode={mode}
        notifications={notifications}
        onOpenAuth={(tab) => {
          setAuthInitialTab(tab || "login");
          setAuthModalOpen(true);
        }}
        onOpenProfile={() => setProfileModalOpen(true)}
        onSwitchMode={handleSwitchMode}
        onSignOut={handleSignOut}
        onNavigateTab={(tab) => setActiveTab(tab)}
        activeTab={activeTab}
        pendingMatchesCount={matches.filter((m) => m.status === "pending").length}
        pendingClaimsCount={claims.filter((c) => c.status === "pending").length}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {/* =========================================================================
            1. LANDING PAGE (Unauthenticated or 'home' tab)
        ========================================================================== */}
        {(!currentUser || activeTab === "home") && (
          <div className="animate-fadeIn">
            <LandingHero
              onGetStarted={() => {
                if (currentUser) {
                  setActiveTab("dashboard");
                } else {
                  setAuthInitialTab("register");
                  setAuthModalOpen(true);
                }
              }}
              onExplore={() => {
                const el = document.getElementById("how-it-works");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            />
            <HowItWorksSection />
            <WhyFindrSection />
            <FaqSection />
          </div>
        )}

        {/* =========================================================================
            2. USER MODE WORKSPACES (when logged in and mode === 'user')
        ========================================================================== */}
        {currentUser && mode === "user" && (
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* ------------------- USER DASHBOARD ------------------- */}
            {activeTab === "dashboard" && (
              <div className="space-y-8 animate-fadeIn">
                {/* Welcome Hero Banner */}
                <div className="relative overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-r from-[#17122e] via-[#1a1435] to-[#130f26] p-6 sm:p-8 shadow-xl">
                  <div className="max-w-2xl">
                    <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-300 border border-violet-500/30">
                      Campus Student Portal
                    </span>
                    <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                      Welcome back, {currentUser.full_name || currentUser.name || "User"}!
                    </h2>
                    <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
                      Lost an item or found someone&apos;s belonging? Use the quick actions below.
                      FINDR&apos;s 65–25–10 AI engine monitors reports 24/7 with human staff supervision.
                    </p>
                  </div>

                  {/* Dual Prominent Actions */}
                  <div className="mt-6 flex flex-wrap gap-4">
                    <button
                      onClick={() => {
                        resetReportForm();
                        setFormType("lost");
                        setActiveTab("report-lost");
                      }}
                      className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-950/40 hover:from-red-500 hover:to-pink-500 transition"
                    >
                      <PlusCircle className="h-5 w-5" />
                      <span>Report a Lost Item</span>
                    </button>

                    <button
                      onClick={() => {
                        resetReportForm();
                        setFormType("found");
                        setActiveTab("report-found");
                      }}
                      className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-950/40 hover:from-emerald-500 hover:to-teal-500 transition"
                    >
                      <PlusCircle className="h-5 w-5" />
                      <span>Report a Found Item</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("browse")}
                      className="flex items-center gap-2 rounded-2xl border border-violet-500/40 bg-violet-950/30 px-5 py-3.5 text-sm font-semibold text-violet-200 hover:bg-violet-900/40 transition"
                    >
                      <Search className="h-4 w-4" />
                      <span>Browse Campus Reports</span>
                    </button>
                  </div>
                </div>

                {/* Dashboard Metrics */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-2xl border border-zinc-800 bg-[#141026] p-4">
                    <span className="text-xs text-zinc-400 font-medium">My Active Reports</span>
                    <p className="mt-1 text-2xl font-bold text-white">{myReports.length}</p>
                    <span className="text-[11px] text-violet-400 mt-1 block">Live in system</span>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-[#141026] p-4">
                    <span className="text-xs text-zinc-400 font-medium">My Active Claims</span>
                    <p className="mt-1 text-2xl font-bold text-white">{claims.length}</p>
                    <span className="text-[11px] text-amber-400 mt-1 block">Under staff review</span>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-[#141026] p-4">
                    <span className="text-xs text-zinc-400 font-medium">Campus Reports</span>
                    <p className="mt-1 text-2xl font-bold text-white">{reports.length}</p>
                    <span className="text-[11px] text-emerald-400 mt-1 block">Total indexed</span>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-[#141026] p-4">
                    <span className="text-xs text-zinc-400 font-medium">AI Matches Flagged</span>
                    <p className="mt-1 text-2xl font-bold text-white">{matches.length}</p>
                    <span className="text-[11px] text-purple-400 mt-1 block">Supervised pairings</span>
                  </div>
                </div>

                {/* Section: My Reports Live Status Trackers */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">My Active Reports & Live Status</h3>
                      <p className="text-xs text-zinc-400">
                        Real-time status tracking powered by database state and AI analysis.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("my-reports")}
                      className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1"
                    >
                      View All Reports <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {myReports.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#120e22] p-8 text-center">
                      <Briefcase className="mx-auto h-10 w-10 text-zinc-600 mb-2" />
                      <h4 className="text-sm font-semibold text-zinc-300">No active reports yet</h4>
                      <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                        If you have lost an item or discovered a lost belonging on campus, report it now to trigger AI matching.
                      </p>
                      <button
                        onClick={() => {
                          setFormType("lost");
                          setActiveTab("report-lost");
                        }}
                        className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition"
                      >
                        Report a Belonging
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {myReports.slice(0, 4).map((r) => {
                        const relMatch = matches.find(
                          (m) => m.lost_report_id === r.id || m.found_report_id === r.id
                        );
                        return (
                          <ReportStatusTracker
                            key={r.id}
                            report={r}
                            match={relMatch}
                            onViewMatch={() => setActiveTab("my-reports")}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ------------------- REPORT LOST / FOUND FORM ------------------- */}
            {(activeTab === "report-lost" || activeTab === "report-found") && (
              <div className="max-w-2xl mx-auto animate-fadeIn">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="mb-4 text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1 transition"
                >
                  ← Back to Dashboard
                </button>

                <div className="rounded-3xl border border-violet-500/30 bg-[#151128] p-6 sm:p-8 shadow-2xl">
                  {/* Form Title & Context */}
                  <div className="border-b border-zinc-800 pb-4 mb-6">
                    <span
                      className={`inline-block rounded px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                        formType === "lost"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {formType === "lost" ? "Report Lost Item" : "Report Found Item"}
                    </span>
                    <h2 className="mt-2 text-2xl font-bold text-white">
                      {formType === "lost"
                        ? "What did you lose on campus?"
                        : "What item did you find?"}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-400">
                      {formType === "lost"
                        ? "Provide details to help FINDR AI and campus staff identify your item."
                        : "Thank you for helping reunite a belonging! Details will be displayed safely."}
                    </p>
                  </div>

                  {formSuccessReceipt ? (
                    <div className="py-8 text-center">
                      <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400 mb-3 animate-bounce" />
                      <h3 className="text-xl font-bold text-white">Report Successfully Recorded!</h3>
                      <p className="mt-2 text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
                        Reference Number:{" "}
                        <span className="font-mono font-bold text-violet-300">
                          #FNDR-{formType[0].toUpperCase()}-{formSuccessReceipt.id.toString().padStart(4, "0")}
                        </span>
                        . FINDR AI has indexed your submission and is actively scanning campus records.
                      </p>

                      <div className="mt-6 flex justify-center gap-3">
                        <button
                          onClick={() => {
                            resetReportForm();
                            setActiveTab("my-reports");
                          }}
                          className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 transition"
                        >
                          View in My Reports Tracker
                        </button>
                        <button
                          onClick={resetReportForm}
                          className="rounded-xl border border-zinc-700 bg-zinc-800/40 px-5 py-2.5 text-xs font-semibold text-zinc-300 hover:text-white transition"
                        >
                          Submit Another Report
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleReportSubmit} className="space-y-5">
                      {formError && (
                        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-3.5 text-xs text-red-300">
                          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                          <span>{formError}</span>
                        </div>
                      )}

                      {/* Title */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Item Name / Title <span className="text-violet-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Blue Hydro Flask Water Bottle, HP Spectre Laptop..."
                          className="w-full rounded-xl border border-zinc-800 bg-[#0e0a1e] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                        />
                      </div>

                      {/* Category & Campus Location */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-1">
                            Category <span className="text-violet-400">*</span>
                          </label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-[#0e0a1e] px-3.5 py-2.5 text-xs text-white focus:border-violet-500 focus:outline-none"
                          >
                            {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                              <option key={cat} value={cat} className="bg-[#141026]">
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-1">
                            Campus Location <span className="text-violet-400">*</span>
                          </label>
                          <LocationCombobox
                            value={location}
                            onChange={(val) => setLocation(val)}
                            suggestions={CAMPUS_LOCATIONS.filter((l) => l !== "All Campus")}
                            placeholder="Select or type a campus location"
                            required
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          General Description <span className="text-violet-400">*</span>
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Describe color, size, condition, and any contextual info..."
                          className="w-full rounded-xl border border-zinc-800 bg-[#0e0a1e] p-3 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                        />
                      </div>

                      {/* Brand & Color */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-zinc-300 mb-1">Brand (Optional)</label>
                          <input
                            type="text"
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                            placeholder="e.g. Apple, Nike, Casio"
                            className="w-full rounded-xl border border-zinc-800 bg-[#0e0a1e] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-300 mb-1">Color (Optional)</label>
                          <input
                            type="text"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            placeholder="e.g. Matte Black, Navy Blue"
                            className="w-full rounded-xl border border-zinc-800 bg-[#0e0a1e] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Distinctive Secret (ONLY FOR LOST ITEMS - Protected Ownership Proof) */}
                      {formType === "lost" && (
                        <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Lock className="h-4 w-4 text-violet-400" />
                            <label className="text-xs font-bold text-violet-200">
                              Private Distinguishing Secret (Staff Verification Proof)
                            </label>
                          </div>
                          <p className="text-[11px] text-zinc-400 mb-2 leading-relaxed">
                            A hidden mark, serial code, sticker, or engraving.{" "}
                            <span className="text-violet-300 font-semibold">
                              This is withheld from public view
                            </span>{" "}
                            and used by campus staff to verify that the item is genuinely yours.
                          </p>
                          <input
                            type="text"
                            value={distinctiveSecret}
                            onChange={(e) => setDistinctiveSecret(e.target.value)}
                            placeholder="e.g. Scratch near charging port, small Totoro sticker on bottom right"
                            className="w-full rounded-xl border border-violet-500/40 bg-[#0d091b] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-violet-400 focus:outline-none"
                          />
                        </div>
                      )}

                      {/* Image Upload (Optional for lost, helpful for found) */}
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Photograph (Optional for lost, highly recommended for found)
                        </label>
                        <div className="mt-1 flex items-center gap-4">
                          <label className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-[#0e0a1e] px-4 py-6 text-center cursor-pointer hover:border-violet-500 transition w-full">
                            <span className="text-xs font-medium text-violet-300">
                              {selectedFile ? selectedFile.name : "Click to select or drag photo here"}
                            </span>
                            <span className="text-[10px] text-zinc-500 mt-1">
                              JPEG, PNG, WEBP (Processed by Gemini Vision for 65% match weighting)
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </label>
                          {filePreview && (
                            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-violet-500/40">
                              <Image
                                src={filePreview}
                                alt="Preview"
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Associated Profile Info Confirmation */}
                      <div className="rounded-xl border border-zinc-800 bg-[#0d091b] p-3 text-xs text-zinc-400">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                          Report Attribution
                        </span>
                        <p className="text-zinc-200 mt-0.5 font-medium">
                          Associated with {currentUser.full_name || currentUser.name || "User"} ({currentUser.email} | {currentUser.phone || "No phone"})
                        </p>
                      </div>

                      {/* Submit CTA */}
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab("dashboard")}
                          className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50"
                        >
                          {submitting ? "Analyzing & Recording..." : "Submit Report"}
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* ------------------- BROWSE CAMPUS REPORTS ------------------- */}
            {activeTab === "browse" && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-2xl font-bold text-white">Browse Campus Reports</h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Inspect active lost and found reports. Personal contact information remains strictly protected.
                  </p>
                </div>

                {/* Filter Controls Bar */}
                <div className="rounded-2xl border border-zinc-800 bg-[#141026] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Search Bar */}
                    <div className="relative flex-1 min-w-[240px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search item name, brand, or keywords..."
                        className="w-full rounded-xl border border-zinc-800 bg-[#0d091b] pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                      />
                    </div>

                    {/* Type Toggle Pills */}
                    <div className="flex rounded-xl border border-zinc-800 bg-[#0d091b] p-1">
                      {(["all", "lost", "found"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setBrowseTypeFilter(t)}
                          className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition ${
                            browseTypeFilter === t
                              ? "bg-violet-600 text-white shadow-sm"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          {t === "all" ? "All Items" : t}
                        </button>
                      ))}
                    </div>

                    {/* Location Dropdown */}
                    <select
                      value={browseLocationFilter}
                      onChange={(e) => setBrowseLocationFilter(e.target.value)}
                      className="rounded-xl border border-zinc-800 bg-[#0d091b] px-3 py-2 text-xs text-white focus:border-violet-500 focus:outline-none"
                    >
                      {CAMPUS_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc} className="bg-[#141026]">
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-800/80">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setBrowseCategoryFilter(cat)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                          browseCategoryFilter === cat
                            ? "bg-violet-600/30 text-violet-200 border border-violet-500/40"
                            : "bg-[#0e0a1e] text-zinc-400 hover:text-white"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reports Grid */}
                {filteredReports.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#120e22] p-12 text-center">
                    <Search className="mx-auto h-10 w-10 text-zinc-600 mb-2" />
                    <h3 className="text-sm font-semibold text-zinc-300">No matching campus reports found</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      Try broadening your search query or changing category and location filters.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredReports.map((report) => {
                      const isLost = report.type === "lost";
                      const isFound = report.type === "found";
                      return (
                        <div
                          key={report.id}
                          className="flex flex-col justify-between rounded-2xl border border-zinc-800/90 bg-[#151128] p-5 shadow-lg transition hover:border-violet-500/40 hover:bg-[#18132e]"
                        >
                          <div>
                            {/* Card Top Pill */}
                            <div className="flex items-center justify-between mb-3">
                              <span
                                className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                                  isLost
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                }`}
                              >
                                {isLost ? "Lost Item" : "Found Item"}
                              </span>
                              <span className="font-mono text-[10px] text-zinc-500">
                                #FNDR-{report.type[0].toUpperCase()}-{report.id.toString().padStart(4, "0")}
                              </span>
                            </div>

                            {/* Image thumbnail if available */}
                            {report.image_path && (
                              <div className="relative mb-3 h-40 w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#0d0a1b]">
                                <Image
                                  src={report.image_path}
                                  alt={report.title}
                                  fill
                                  className="object-cover transition-transform hover:scale-105 duration-300"
                                />
                              </div>
                            )}

                            <h3 className="text-base font-bold text-white">{report.title}</h3>
                            <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                              {report.description}
                            </p>

                            <div className="mt-4 space-y-1.5 text-[11px] text-zinc-400 border-t border-zinc-800/60 pt-3">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-violet-400" />
                                <span>{report.location}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Tag className="h-3.5 w-3.5 text-violet-400" />
                                <span>{report.category}</span>
                                {report.color && <span>• {report.color}</span>}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-violet-400" />
                                <span>{report.date_lost_found || report.created_at.slice(0, 10)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Button: "This Might Be Mine" on Found items */}
                          <div className="mt-5 pt-3 border-t border-zinc-800/80">
                            {isFound ? (
                              <button
                                onClick={() => {
                                  setSelectedReportForClaim(report);
                                  setClaimModalOpen(true);
                                }}
                                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-violet-600/30 border border-violet-500/40 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-600 hover:text-white transition"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>This Might Be Mine</span>
                              </button>
                            ) : (
                              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                                <span>Status: {report.status}</span>
                                <span>🔒 Contact Protected</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ------------------- MY REPORTS & STATUS TRACKER ------------------- */}
            {activeTab === "my-reports" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">My Reports & Progress Tracking</h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Monitor your submissions, view AI candidates, and track supervisor verification milestones.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        resetReportForm();
                        setFormType("lost");
                        setActiveTab("report-lost");
                      }}
                      className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition"
                    >
                      + New Lost Report
                    </button>
                  </div>
                </div>

                {/* Claims section if user has claims */}
                {claims.length > 0 && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-5">
                    <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      My Submitted Ownership Claims ({claims.length})
                    </h3>
                    <div className="mt-3 space-y-3">
                      {claims.map((c) => (
                        <div
                          key={c.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-[#130f24] p-3.5"
                        >
                          <div>
                            <span className="text-xs font-bold text-white">
                              Claim on: &ldquo;{c.report?.title || `Report #${c.report_id}`}&rdquo;
                            </span>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              Submitted: {new Date(c.created_at).toLocaleDateString()}
                            </p>
                            {c.staff_notes && (
                              <p className="text-[11px] text-violet-300 mt-1 bg-violet-950/40 p-1.5 rounded border border-violet-800/40">
                                Staff note: {c.staff_notes}
                              </p>
                            )}
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                              c.status === "approved"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : c.status === "rejected"
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {c.status.replace("_", " ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reports with Status Trackers */}
                {myReports.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#120e22] p-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-zinc-600 mb-2" />
                    <h3 className="text-base font-semibold text-zinc-300">No reports recorded</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      Submit a lost or found item report to track its progress in real-time.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {myReports.map((report) => {
                      const relMatch = matches.find(
                        (m) => m.lost_report_id === report.id || m.found_report_id === report.id
                      );
                      const relClaim = claims.find((c) => c.report_id === report.id);
                      return (
                        <ReportStatusTracker
                          key={report.id}
                          report={report}
                          match={relMatch}
                          claim={relClaim}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            3. STAFF MODE WORKSPACES (when logged in and mode === 'staff')
        ========================================================================== */}
        {currentUser && mode === "staff" && (
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fadeIn">
            {/* Staff Mode Top Bar / Supervisory Banner */}
            <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-[#211633] via-[#1a122e] to-[#160e29] p-6 sm:p-8 shadow-xl">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Campus Staff Supervisory Workspace
                  </span>
                </div>
                <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">Supervision & Verification Center</h2>
                <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
                  Logged in as {currentUser.full_name || currentUser.name || "Staff"} ({currentUser.role}). Review AI candidate pairings, verify claims, and coordinate releases across campus departments.
                </p>
              </div>
            </div>

            {/* STAFF TAB 1: OVERVIEW */}
            {activeTab === "staff-dashboard" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-2xl border border-zinc-800 bg-[#141026] p-5">
                    <span className="text-xs text-zinc-400">Total Lost Reports</span>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {reports.filter((r) => r.type === "lost").length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-[#141026] p-5">
                    <span className="text-xs text-zinc-400">Total Found Reports</span>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {reports.filter((r) => r.type === "found").length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-[#141026] p-5">
                    <span className="text-xs text-amber-400">Pending AI Matches</span>
                    <p className="mt-1 text-2xl font-bold text-amber-300">
                      {matches.filter((m) => m.status === "pending").length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-[#141026] p-5">
                    <span className="text-xs text-emerald-400">Confirmed Reunions</span>
                    <p className="mt-1 text-2xl font-bold text-emerald-300">
                      {matches.filter((m) => m.status === "confirmed").length}
                    </p>
                  </div>
                </div>

                {/* Quick Queues overview */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-800 bg-[#141026] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-white">Latest AI Match Candidates</h3>
                      <button
                        onClick={() => setActiveTab("staff-matches")}
                        className="text-xs text-violet-400 hover:underline"
                      >
                        Open Queue
                      </button>
                    </div>
                    {matches.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-4 text-center">No AI candidates pending review.</p>
                    ) : (
                      <div className="space-y-2">
                        {matches.slice(0, 3).map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-[#0e0a1c] p-3 text-xs"
                          >
                            <div>
                              <span className="font-semibold text-white">
                                #{m.lost_report_id} ↔ #{m.found_report_id}
                              </span>
                              <p className="text-[11px] text-zinc-400">
                                Score: {Math.round((m.similarity_score || 0) * 100)}% ({m.status})
                              </p>
                            </div>
                            <button
                              onClick={() => setActiveTab("staff-matches")}
                              className="rounded-lg bg-violet-600/30 px-2.5 py-1 text-[11px] text-violet-300 hover:bg-violet-600 hover:text-white"
                            >
                              Review
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-[#141026] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-white">Latest Ownership Claims</h3>
                      <button
                        onClick={() => setActiveTab("staff-claims")}
                        className="text-xs text-violet-400 hover:underline"
                      >
                        Open Queue
                      </button>
                    </div>
                    {claims.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-4 text-center">No student claims submitted yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {claims.slice(0, 3).map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-[#0e0a1c] p-3 text-xs"
                          >
                            <div>
                              <span className="font-semibold text-white">
                                {c.claimant?.full_name || `User #${c.claimant_id}`}
                              </span>
                              <p className="text-[11px] text-zinc-400">
                                Report #{c.report_id} · Status: {c.status}
                              </p>
                            </div>
                            <button
                              onClick={() => setActiveTab("staff-claims")}
                              className="rounded-lg bg-amber-600/30 px-2.5 py-1 text-[11px] text-amber-300 hover:bg-amber-600 hover:text-white"
                            >
                              Review
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STAFF TAB 2: AI MATCH REVIEW */}
            {activeTab === "staff-matches" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">AI Candidate Pairings Queue</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Side-by-side comparison with 65–25–10 weighted breakdown. Approving forwards the match to student confirmation.
                  </p>
                </div>

                {matches.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#141026] p-12 text-center">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-zinc-600 mb-2" />
                    <p className="text-xs text-zinc-400">No match candidates in queue.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {matches.map((m) => {
                      const scorePct = Math.round((m.similarity_score || 0) * 100);
                      const embPct = typeof m.embedding_score === "number" ? Math.round(m.embedding_score * 100) : "N/A";
                      const attrPct = typeof m.attribute_score === "number" ? Math.round(m.attribute_score * 100) : "N/A";
                      const locPct = typeof m.location_score === "number" ? Math.round(m.location_score * 100) : "N/A";

                      return (
                        <div
                          key={m.id}
                          className="rounded-3xl border border-zinc-800 bg-[#151128] p-6 shadow-xl space-y-5"
                        >
                          {/* Match Header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                            <div>
                              <span className="font-mono text-xs font-bold text-violet-400">
                                Match Candidate #{m.id} ({m.matching_method.toUpperCase()})
                              </span>
                              <h4 className="text-base font-bold text-white mt-0.5">
                                Overall Confidence Score: {scorePct}%
                              </h4>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                                m.status === "confirmed"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : m.status === "dismissed"
                                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              Status: {m.status}
                            </span>
                          </div>

                          {/* 65-25-10 Breakdown Pills */}
                          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-zinc-800 bg-[#0e0a1c] p-3 text-center">
                            <div>
                              <span className="text-[10px] text-zinc-400 block font-semibold">
                                65% Multimodal Vector
                              </span>
                              <span className="text-sm font-bold text-violet-300 font-mono">
                                {embPct}%
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-400 block font-semibold">
                                25% Visual Attributes
                              </span>
                              <span className="text-sm font-bold text-purple-300 font-mono">
                                {attrPct}%
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-400 block font-semibold">
                                10% Campus Location
                              </span>
                              <span className="text-sm font-bold text-indigo-300 font-mono">
                                {locPct}%
                              </span>
                            </div>
                          </div>

                          {/* Side-by-side comparison */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Lost Report Card */}
                            <div className="rounded-2xl border border-rose-500/30 bg-[#1a1224] p-4">
                              <span className="text-[10px] uppercase font-bold text-rose-400 block">
                                Lost Item Report #{m.lost_report_id}
                              </span>
                              <h5 className="text-sm font-bold text-white mt-1">
                                {m.lost_report?.title || "Lost Item"}
                              </h5>
                              <p className="text-xs text-zinc-300 mt-1">{m.lost_report?.description}</p>
                              <div className="mt-3 text-[11px] text-zinc-400 space-y-1">
                                <div>Location: {m.lost_report?.location}</div>
                                <div>Category: {m.lost_report?.category}</div>
                                {m.lost_report?.distinctive_secret && (
                                  <div className="text-violet-300 font-semibold bg-violet-950/40 p-1.5 rounded">
                                    Private Secret: {m.lost_report.distinctive_secret}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Found Report Card */}
                            <div className="rounded-2xl border border-emerald-500/30 bg-[#111c1d] p-4">
                              <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                                Found Item Report #{m.found_report_id}
                              </span>
                              <h5 className="text-sm font-bold text-white mt-1">
                                {m.found_report?.title || "Found Item"}
                              </h5>
                              <p className="text-xs text-zinc-300 mt-1">{m.found_report?.description}</p>
                              <div className="mt-3 text-[11px] text-zinc-400 space-y-1">
                                <div>Location: {m.found_report?.location}</div>
                                <div>Category: {m.found_report?.category}</div>
                              </div>
                            </div>
                          </div>

                          {/* Explanation */}
                          {m.explanation && (
                            <div className="rounded-xl border border-zinc-800 bg-[#0d091b] p-3 text-xs text-zinc-300">
                              <span className="font-semibold text-zinc-400 block mb-0.5">AI Explanation:</span>
                              {m.explanation}
                            </div>
                          )}

                          {/* Staff Decision Actions */}
                          {m.status === "pending" && (
                            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                              <button
                                onClick={() => handleMatchAction(m.id, "dismiss", "Candidate rejected by staff")}
                                className="rounded-xl border border-red-500/40 bg-red-950/20 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-900/40 transition"
                              >
                                Reject Candidate
                              </button>
                              <button
                                onClick={() =>
                                  handleMatchAction(
                                    m.id,
                                    "approve_candidate",
                                    "Approved for student confirmation"
                                  )
                                }
                                className="rounded-xl bg-violet-600 px-5 py-2 text-xs font-semibold text-white hover:bg-violet-500 shadow-md transition"
                              >
                                Approve for Student Confirmation
                              </button>
                              <button
                                onClick={() =>
                                  handleMatchAction(
                                    m.id,
                                    "confirm",
                                    "Direct staff verification and disclosure authorization"
                                  )
                                }
                                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-md transition"
                              >
                                Finalize & Unlock Contact
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STAFF TAB 3: OWNERSHIP CLAIMS QUEUE */}
            {activeTab === "staff-claims" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Ownership Claims Queue (&ldquo;This Might Be Mine&rdquo;)</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Claims submitted by students against found campus items. Inspect identifying details before authorizing contact.
                  </p>
                </div>

                {claims.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#141026] p-12 text-center">
                    <UserCheck className="mx-auto h-10 w-10 text-zinc-600 mb-2" />
                    <p className="text-xs text-zinc-400">No ownership claims in queue.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {claims.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-3xl border border-zinc-800 bg-[#151128] p-6 shadow-xl space-y-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                          <div>
                            <span className="font-mono text-xs font-bold text-amber-400">
                              Claim #{c.id} on Report #{c.report_id}
                            </span>
                            <h4 className="text-base font-bold text-white mt-0.5">
                              Found Item: &ldquo;{c.report?.title}&rdquo;
                            </h4>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                              c.status === "approved"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : c.status === "rejected"
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {c.status.replace("_", " ")}
                          </span>
                        </div>

                        {/* Claimant Profile Info */}
                        <div className="rounded-2xl border border-violet-500/20 bg-violet-950/20 p-4 text-xs">
                          <span className="text-[10px] uppercase font-bold text-violet-300 block mb-1">
                            Claimant Academic Identity
                          </span>
                          <p className="text-white font-semibold">
                            {c.claimant?.full_name} ({c.claimant?.email})
                          </p>
                          <p className="text-zinc-300 mt-0.5">
                            Phone: {c.claimant?.phone || "Not provided"} · Year: {c.claimant?.academic_year} · Branch: {c.claimant?.branch} · Section: {c.claimant?.section}
                          </p>
                        </div>

                        {/* Evidence & Identifying Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="rounded-xl border border-zinc-800 bg-[#0e0a1c] p-3.5">
                            <span className="font-semibold text-zinc-400 block mb-1">Claim Reason:</span>
                            <p className="text-zinc-200">{c.claim_reason}</p>
                          </div>
                          <div className="rounded-xl border border-zinc-800 bg-[#0e0a1c] p-3.5">
                            <span className="font-semibold text-zinc-400 block mb-1">
                              Distinctive Proof Provided:
                            </span>
                            <p className="text-zinc-200 font-medium">{c.identifying_details}</p>
                            {c.additional_evidence && (
                              <p className="mt-1.5 text-zinc-400 border-t border-zinc-800/60 pt-1">
                                Additional: {c.additional_evidence}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {c.status === "pending" && (
                          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                            <button
                              onClick={() => handleClaimAction(c.id, "rejected", "Evidence provided does not match item")}
                              className="rounded-xl border border-red-500/40 bg-red-950/20 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-900/40 transition"
                            >
                              Reject Claim
                            </button>
                            <button
                              onClick={() => handleClaimAction(c.id, "more_info_needed", "Please specify distinctive marks")}
                              className="rounded-xl border border-amber-500/40 bg-amber-950/20 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-900/40 transition"
                            >
                              Request More Info
                            </button>
                            <button
                              onClick={() => handleClaimAction(c.id, "approved", "Ownership verified by staff supervisor")}
                              className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-md transition"
                            >
                              Approve Ownership & Unlock Contact
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STAFF TAB 4: MANUAL MATCHING */}
            {activeTab === "staff-manual" && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Manual Match Pairing Tool</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    If AI misses a match, staff can manually link any lost report with a found report.
                  </p>
                </div>

                <div className="rounded-3xl border border-violet-500/30 bg-[#151128] p-6 sm:p-8 shadow-xl">
                  {manualSuccess && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-xs text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{manualSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateManualMatch} className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Select Lost Report
                      </label>
                      <select
                        value={manualLostId || ""}
                        onChange={(e) => setManualLostId(Number(e.target.value) || null)}
                        required
                        className="w-full rounded-xl border border-zinc-800 bg-[#0e0a1e] px-3.5 py-2.5 text-xs text-white focus:border-violet-500 focus:outline-none"
                      >
                        <option value="">-- Choose Lost Report --</option>
                        {reports
                          .filter((r) => r.type === "lost")
                          .map((r) => (
                            <option key={r.id} value={r.id} className="bg-[#141026]">
                              #{r.id} - {r.title} ({r.category} at {r.location})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Select Found Report
                      </label>
                      <select
                        value={manualFoundId || ""}
                        onChange={(e) => setManualFoundId(Number(e.target.value) || null)}
                        required
                        className="w-full rounded-xl border border-zinc-800 bg-[#0e0a1e] px-3.5 py-2.5 text-xs text-white focus:border-violet-500 focus:outline-none"
                      >
                        <option value="">-- Choose Found Report --</option>
                        {reports
                          .filter((r) => r.type === "found")
                          .map((r) => (
                            <option key={r.id} value={r.id} className="bg-[#141026]">
                              #{r.id} - {r.title} ({r.category} at {r.location})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Staff Verification Reason / Notes
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={manualReason}
                        onChange={(e) => setManualReason(e.target.value)}
                        placeholder="Explain why these two reports are related..."
                        className="w-full rounded-xl border border-zinc-800 bg-[#0e0a1e] p-3 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={manualSubmitting || !manualLostId || !manualFoundId}
                        className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-black hover:bg-amber-400 transition disabled:opacity-50"
                      >
                        {manualSubmitting ? "Linking..." : "Create Manual Match"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Global Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialTab={authInitialTab}
      />

      {currentUser && (
        <>
          <ProfileModal
            isOpen={profileModalOpen}
            onClose={() => setProfileModalOpen(false)}
            currentUser={currentUser}
            onProfileUpdated={(updated) => {
              setCurrentUser(updated);
              localStorage.setItem("findr_user", JSON.stringify(updated));
            }}
          />

          <ClaimModal
            isOpen={claimModalOpen}
            onClose={() => setClaimModalOpen(false)}
            report={selectedReportForClaim}
            currentUser={currentUser}
            onClaimSuccess={fetchData}
          />
        </>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-900 bg-[#090714] py-8 text-center text-xs text-zinc-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-300">FINDR Campus Platform</span>
            <span>·</span>
            <span>Helping lost belongings find their way back</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <span>65-25-10 AI Multimodal Engine</span>
            <span>·</span>
            <span>Campus Staff Supervised</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
