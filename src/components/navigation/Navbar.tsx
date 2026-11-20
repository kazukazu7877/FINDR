"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  User,
  Shield,
  LogOut,
  ChevronDown,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Menu,
  X,
  ArrowRight,
} from "lucide-react";
import { UserProfile, Notification } from "@/types/database";

interface NavbarProps {
  currentUser: UserProfile | null;
  mode: "user" | "staff";
  notifications: Notification[];
  onOpenAuth: (initialTab?: "login" | "register") => void;
  onOpenProfile: () => void;
  onSwitchMode: (newMode: "user" | "staff") => void;
  onSignOut: () => void;
  onNavigateTab: (tab: string) => void;
  activeTab: string;
  pendingMatchesCount?: number;
  pendingClaimsCount?: number;
}

export function Navbar({
  currentUser,
  mode,
  notifications,
  onOpenAuth,
  onOpenProfile,
  onSwitchMode,
  onSignOut,
  onNavigateTab,
  activeTab,
  pendingMatchesCount = 0,
  pendingClaimsCount = 0,
}: NavbarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("home");

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const isStaffOrSupervisor = currentUser?.role === "staff" || currentUser?.role === "supervisor";
  const displayName = currentUser?.full_name || currentUser?.name || currentUser?.email?.split("@")[0] || "User";
  const displayInitial = (displayName.charAt(0) || "U").toUpperCase();

  // IntersectionObserver to highlight navigation link based on visible section
  useEffect(() => {
    const sectionIds = ["home", "how-it-works", "why-findr", "faqs"];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          const mostVisible = visibleEntries.reduce((prev, curr) =>
            curr.intersectionRatio > prev.intersectionRatio ? curr : prev
          );
          setActiveSection(mostVisible.target.id);
        }
      },
      {
        root: null,
        rootMargin: "-15% 0px -40% 0px",
        threshold: [0.1, 0.3, 0.6],
      }
    );

    elements.forEach((el) => observer.observe(el));

    // Handle existing URL hash on load/refresh
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.replace("#", "");
      if (sectionIds.includes(hash)) {
        setActiveSection(hash);
      }
    }

    return () => observer.disconnect();
  }, [activeTab]);

  const handleSmoothNav = (sectionId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    setMobileMenuOpen(false);

    if (activeTab !== "home" && onNavigateTab) {
      onNavigateTab("home");
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          window.history.pushState(null, "", `#${sectionId}`);
        }
      }, 60);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", `#${sectionId}`);
      }
    }
    setActiveSection(sectionId);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#2d244a] bg-[#0d0a1a]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={(e) => handleSmoothNav("home", e)}
            className="flex items-center gap-2.5 text-left transition hover:opacity-90 focus:outline-none"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 shadow-lg shadow-purple-900/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-white">FINDR</span>
                <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300 border border-violet-500/30">
                  CAMPUS
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">AI Lost & Found Intelligence</p>
            </div>
          </button>

          {/* Mode Indicator Pill (When logged in) */}
          {currentUser && (
            <div className="hidden md:flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-950/40 px-3 py-1 text-xs">
              <span className={`h-2 w-2 rounded-full ${mode === "staff" ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
              <span className="font-medium text-violet-200">
                {mode === "staff" ? "Staff Supervisory Mode" : "Student User Mode"}
              </span>
            </div>
          )}
        </div>

        {/* Center Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {currentUser && activeTab !== "home" ? (
            mode === "user" ? (
              <>
                <button
                  onClick={() => onNavigateTab("dashboard")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    activeTab === "dashboard"
                      ? "bg-violet-600/30 text-violet-200 border border-violet-500/30"
                      : "text-zinc-300 hover:bg-zinc-800/40 hover:text-white"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => onNavigateTab("browse")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    activeTab === "browse"
                      ? "bg-violet-600/30 text-violet-200 border border-violet-500/30"
                      : "text-zinc-300 hover:bg-zinc-800/40 hover:text-white"
                  }`}
                >
                  Browse Reports
                </button>
                <button
                  onClick={() => onNavigateTab("my-reports")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    activeTab === "my-reports"
                      ? "bg-violet-600/30 text-violet-200 border border-violet-500/30"
                      : "text-zinc-300 hover:bg-zinc-800/40 hover:text-white"
                  }`}
                >
                  My Reports & Tracker
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onNavigateTab("staff-dashboard")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    activeTab === "staff-dashboard"
                      ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold shadow-sm"
                      : "text-zinc-300 hover:bg-zinc-800/40 hover:text-white"
                  }`}
                >
                  Staff Overview
                </button>
                <button
                  onClick={() => onNavigateTab("staff-matches")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition flex items-center gap-1.5 ${
                    activeTab === "staff-matches"
                      ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold shadow-sm"
                      : "text-zinc-300 hover:bg-zinc-800/40 hover:text-white"
                  }`}
                >
                  <span>AI Match Review</span>
                  {pendingMatchesCount > 0 && (
                    <span className="rounded-full bg-amber-500/30 px-1.5 py-0.2 text-[10px] font-bold text-amber-200 border border-amber-500/40">
                      {pendingMatchesCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => onNavigateTab("staff-claims")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition flex items-center gap-1.5 ${
                    activeTab === "staff-claims"
                      ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold shadow-sm"
                      : "text-zinc-300 hover:bg-zinc-800/40 hover:text-white"
                  }`}
                >
                  <span>Ownership Claims</span>
                  {pendingClaimsCount > 0 && (
                    <span className="rounded-full bg-amber-500/30 px-1.5 py-0.2 text-[10px] font-bold text-amber-200 border border-amber-500/40">
                      {pendingClaimsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => onNavigateTab("staff-manual")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    activeTab === "staff-manual"
                      ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold shadow-sm"
                      : "text-zinc-300 hover:bg-zinc-800/40 hover:text-white"
                  }`}
                >
                  Manual Matching
                </button>
              </>
            )
          ) : (
            <>
              <a
                href="#home"
                onClick={(e) => handleSmoothNav("home", e)}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  activeSection === "home"
                    ? "bg-violet-600/30 text-violet-200 border border-violet-500/30 font-semibold shadow-sm"
                    : "text-zinc-300 hover:bg-zinc-800/40 hover:text-white font-medium"
                }`}
              >
                Home
              </a>
              <a
                href="#how-it-works"
                onClick={(e) => handleSmoothNav("how-it-works", e)}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  activeSection === "how-it-works"
                    ? "bg-violet-600/30 text-violet-200 border border-violet-500/30 font-semibold shadow-sm"
                    : "text-zinc-300 hover:bg-zinc-800/40 hover:text-white font-medium"
                }`}
              >
                How It Works
              </a>
              <a
                href="#why-findr"
                onClick={(e) => handleSmoothNav("why-findr", e)}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  activeSection === "why-findr"
                    ? "bg-violet-600/30 text-violet-200 border border-violet-500/30 font-semibold shadow-sm"
                    : "text-zinc-300 hover:bg-zinc-800/40 hover:text-white font-medium"
                }`}
              >
                Why FINDR
              </a>
              <a
                href="#faqs"
                onClick={(e) => handleSmoothNav("faqs", e)}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  activeSection === "faqs"
                    ? "bg-violet-600/30 text-violet-200 border border-violet-500/30 font-semibold shadow-sm"
                    : "text-zinc-300 hover:bg-zinc-800/40 hover:text-white font-medium"
                }`}
              >
                FAQs
              </a>
              {currentUser && (
                <button
                  onClick={() => onNavigateTab(mode === "staff" ? "staff-dashboard" : "dashboard")}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-violet-300 hover:bg-violet-950/40 hover:text-white transition flex items-center gap-1 ml-1"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>Workspace</span>
                </button>
              )}
            </>
          )}
        </nav>

        {/* Right Section / Profile Taskbar */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              {/* Notification Center Popover */}
              <div className="relative">
                <button
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    setProfileOpen(false);
                  }}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-[#161224] text-zinc-300 transition hover:border-violet-500/40 hover:text-white focus:outline-none"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white shadow-md">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Drawer */}
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl border border-violet-500/30 bg-[#17122b] p-4 shadow-2xl shadow-purple-950/80 z-50 animate-fade-in-up">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-violet-400" />
                        <h4 className="text-sm font-semibold text-white">Notifications</h4>
                      </div>
                      <span className="text-xs text-zinc-400">{notifications.length} total</span>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-zinc-400 text-xs">
                        <CheckCircle2 className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                        No notifications right now.
                      </div>
                    ) : (
                      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`rounded-xl border p-3 text-left transition ${
                              n.is_read
                                ? "border-zinc-800/60 bg-[#110e20] text-zinc-400"
                                : "border-violet-500/40 bg-violet-950/30 text-zinc-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-semibold text-violet-300">{n.title}</span>
                              <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-zinc-300 leading-relaxed">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Profile Taskbar Dropdown (TOP RIGHT) */}
              <div className="relative">
                <button
                  onClick={() => {
                    setProfileOpen(!profileOpen);
                    setNotifOpen(false);
                  }}
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-[#161224] p-1.5 pl-3 transition hover:border-violet-500/40 focus:outline-none"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold text-white leading-none">{displayName}</p>
                    <p className="text-[10px] text-violet-400 mt-1 capitalize leading-none">
                      {currentUser.role} · {currentUser.academic_year || "Student"}
                    </p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-purple-500 font-bold text-white text-xs shadow">
                    {displayInitial}
                  </div>
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                </button>

                {/* Dropdown Menu */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-64 max-w-xs rounded-2xl border border-violet-500/30 bg-[#17122b] p-2 shadow-2xl shadow-purple-950/80 z-50 animate-fade-in-up">
                    <div className="px-3 py-2 border-b border-zinc-800 mb-1">
                      <p className="text-sm font-semibold text-white">{displayName}</p>
                      <p className="text-xs text-zinc-400 truncate">{currentUser.email}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-violet-300">
                        <span className="rounded bg-violet-900/60 px-1.5 py-0.2 border border-violet-700/40 font-mono capitalize">
                          {currentUser.role}
                        </span>
                        <span>{currentUser.branch || "Campus"}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        onOpenProfile();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-violet-950/60 hover:text-white"
                    >
                      <User className="h-4 w-4 text-violet-400" />
                      My Academic Profile
                    </button>

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        onNavigateTab(mode === "user" ? "my-reports" : "staff-dashboard");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-violet-950/60 hover:text-white"
                    >
                      <Layers className="h-4 w-4 text-violet-400" />
                      {mode === "user" ? "My Reports & Claims" : "Staff Supervision"}
                    </button>

                    {/* Mode Switch (Only for authorized staff) */}
                    {isStaffOrSupervisor && (
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onSwitchMode(mode === "user" ? "staff" : "user");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-950/40"
                      >
                        <Shield className="h-4 w-4 text-amber-400" />
                        Switch to {mode === "user" ? "Staff Mode" : "User Mode"}
                      </button>
                    )}

                    <div className="my-1 border-t border-zinc-800" />

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        onSignOut();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-950/30 hover:text-red-300"
                    >
                      <LogOut className="h-4 w-4 text-red-400" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onOpenAuth("login")}
                className="rounded-xl border border-violet-500/30 bg-[#161224] px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-violet-500/60 hover:text-white"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth("register")}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-900/30 transition hover:from-violet-500 hover:to-purple-500"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle Button (Visible on screens < lg) */}
          <button
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen);
              setProfileOpen(false);
              setNotifOpen(false);
            }}
            className="flex lg:hidden h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-[#161224] text-zinc-300 transition hover:border-violet-500/40 hover:text-white focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-zinc-800 bg-[#120d24]/98 backdrop-blur-xl px-4 py-3.5 space-y-1.5 animate-fade-in-up shadow-2xl">
          {currentUser && activeTab !== "home" ? (
            mode === "user" ? (
              <>
                <button
                  onClick={() => {
                    onNavigateTab("dashboard");
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left rounded-xl px-4 py-3 text-sm font-medium min-h-[44px] flex items-center transition ${
                    activeTab === "dashboard"
                      ? "bg-violet-600/30 text-violet-200 border border-violet-500/30"
                      : "text-zinc-200 hover:bg-zinc-800/40 hover:text-white"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    onNavigateTab("browse");
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left rounded-xl px-4 py-3 text-sm font-medium min-h-[44px] flex items-center transition ${
                    activeTab === "browse"
                      ? "bg-violet-600/30 text-violet-200 border border-violet-500/30"
                      : "text-zinc-200 hover:bg-zinc-800/40 hover:text-white"
                  }`}
                >
                  Browse Reports
                </button>
                <button
                  onClick={() => {
                    onNavigateTab("my-reports");
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left rounded-xl px-4 py-3 text-sm font-medium min-h-[44px] flex items-center transition ${
                    activeTab === "my-reports"
                      ? "bg-violet-600/30 text-violet-200 border border-violet-500/30"
                      : "text-zinc-200 hover:bg-zinc-800/40 hover:text-white"
                  }`}
                >
                  My Reports & Tracker
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    onNavigateTab("staff-dashboard");
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left rounded-xl px-4 py-3 text-sm font-medium min-h-[44px] flex items-center justify-between transition ${
                    activeTab === "staff-dashboard"
                      ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold"
                      : "text-zinc-200 hover:bg-zinc-800/40 hover:text-white"
                  }`}
                >
                  <span>Staff Overview</span>
                </button>
                <button
                  onClick={() => {
                    onNavigateTab("staff-matches");
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left rounded-xl px-4 py-3 text-sm font-medium min-h-[44px] flex items-center justify-between transition ${
                    activeTab === "staff-matches"
                      ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold"
                      : "text-zinc-200 hover:bg-zinc-800/40 hover:text-white"
                  }`}
                >
                  <span>AI Match Review</span>
                  {pendingMatchesCount > 0 && (
                    <span className="rounded-full bg-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-200 border border-amber-500/40">
                      {pendingMatchesCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    onNavigateTab("staff-claims");
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left rounded-xl px-4 py-3 text-sm font-medium min-h-[44px] flex items-center justify-between transition ${
                    activeTab === "staff-claims"
                      ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold"
                      : "text-zinc-200 hover:bg-zinc-800/40 hover:text-white"
                  }`}
                >
                  <span>Ownership Claims</span>
                  {pendingClaimsCount > 0 && (
                    <span className="rounded-full bg-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-200 border border-amber-500/40">
                      {pendingClaimsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    onNavigateTab("staff-manual");
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left rounded-xl px-4 py-3 text-sm font-medium min-h-[44px] flex items-center justify-between transition ${
                    activeTab === "staff-manual"
                      ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold"
                      : "text-zinc-200 hover:bg-zinc-800/40 hover:text-white"
                  }`}
                >
                  <span>Manual Matching</span>
                </button>
              </>
            )
          ) : (
            <>
              <a
                href="#home"
                onClick={(e) => handleSmoothNav("home", e)}
                className={`block w-full text-left rounded-xl px-4 py-3 text-sm min-h-[44px] flex items-center transition ${
                  activeSection === "home"
                    ? "bg-violet-600/30 text-violet-200 border border-violet-500/30 font-semibold"
                    : "text-zinc-200 hover:bg-zinc-800/40 hover:text-white font-medium"
                }`}
              >
                Home
              </a>
              <a
                href="#how-it-works"
                onClick={(e) => handleSmoothNav("how-it-works", e)}
                className={`block w-full text-left rounded-xl px-4 py-3 text-sm min-h-[44px] flex items-center transition ${
                  activeSection === "how-it-works"
                    ? "bg-violet-600/30 text-violet-200 border border-violet-500/30 font-semibold"
                    : "text-zinc-200 hover:bg-zinc-800/40 hover:text-white font-medium"
                }`}
              >
                How It Works
              </a>
              <a
                href="#why-findr"
                onClick={(e) => handleSmoothNav("why-findr", e)}
                className={`block w-full text-left rounded-xl px-4 py-3 text-sm min-h-[44px] flex items-center transition ${
                  activeSection === "why-findr"
                    ? "bg-violet-600/30 text-violet-200 border border-violet-500/30 font-semibold"
                    : "text-zinc-200 hover:bg-zinc-800/40 hover:text-white font-medium"
                }`}
              >
                Why FINDR
              </a>
              <a
                href="#faqs"
                onClick={(e) => handleSmoothNav("faqs", e)}
                className={`block w-full text-left rounded-xl px-4 py-3 text-sm min-h-[44px] flex items-center transition ${
                  activeSection === "faqs"
                    ? "bg-violet-600/30 text-violet-200 border border-violet-500/30 font-semibold"
                    : "text-zinc-200 hover:bg-zinc-800/40 hover:text-white font-medium"
                }`}
              >
                FAQs
              </a>
              {currentUser && (
                <button
                  onClick={() => {
                    onNavigateTab(mode === "staff" ? "staff-dashboard" : "dashboard");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left rounded-xl px-4 py-3 text-sm font-medium min-h-[44px] text-violet-300 hover:bg-violet-950/40 hover:text-white transition flex items-center justify-between"
                >
                  <span>Go to Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </header>
  );
}
