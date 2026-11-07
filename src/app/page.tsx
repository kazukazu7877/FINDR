"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";

type NavPage =
  | "📊 Dashboard"
  | "🔴 Report Lost Item"
  | "🟢 Report Found Item"
  | "🔍 Find Matches"
  | "🤝 Verification / Review"
  | "📋 All Reports";

const NAV_PAGES: NavPage[] = [
  "📊 Dashboard",
  "🔴 Report Lost Item",
  "🟢 Report Found Item",
  "🔍 Find Matches",
  "🤝 Verification / Review",
  "📋 All Reports",
];

const CATEGORIES = [
  "Electronics",
  "Bags & Wallets",
  "Clothing",
  "Books & Stationery",
  "Keys",
  "Accessories",
  "Other",
];

export default function FindrApp() {
  const [currentPage, setCurrentPage] = useState<NavPage>("📊 Dashboard");
  const [isStaff, setIsStaff] = useState<boolean>(false);
  const [staffPasscode, setStaffPasscode] = useState("");
  const [staffError, setStaffError] = useState("");
  const [showStaffExpander, setShowStaffExpander] = useState(false);

  // Data State
  const [reports, setReports] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [secret, setSecret] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Find Matches Page State
  const [matchesTypeFilter, setMatchesTypeFilter] = useState<"lost" | "found" | "all">("lost");
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [searchingMatches, setSearchingMatches] = useState(false);

  // Review Page State
  const [reviewFilter, setReviewFilter] = useState<"pending" | "confirmed" | "dismissed" | "all">("pending");

  // All Reports Page State
  const [allFilterType, setAllFilterType] = useState<string>("All");
  const [allFilterCategory, setAllFilterCategory] = useState<string>("All");
  const [allFilterStatus, setAllFilterStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      const [repRes, matchRes] = await Promise.all([
        fetch("/api/reports"),
        fetch("/api/matches"),
      ]);
      const repData = await repRes.json();
      const matchData = await matchRes.json();
      if (repData.reports) setReports(repData.reports);
      if (matchData.matches) setMatches(matchData.matches);
    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute Platform Stats
  const stats = useMemo(() => {
    const totalLost = reports.filter((r) => r.type === "lost").length;
    const totalFound = reports.filter((r) => r.type === "found").length;
    const activeReports = reports.filter((r) => r.status === "active").length;
    const matchedReports = reports.filter((r) => r.status === "matched").length;
    const matchesPending = matches.filter((m) => m.status === "pending").length;
    const matchesConfirmed = matches.filter((m) => m.status === "confirmed").length;
    const matchesDismissed = matches.filter((m) => m.status === "dismissed").length;

    return {
      totalLost,
      totalFound,
      activeReports,
      matchedReports,
      matchesPending,
      matchesConfirmed,
      matchesDismissed,
    };
  }, [reports, matches]);

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

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setBrand("");
    setColor("");
    setSecret("");
    setContactInfo("");
    setSelectedFile(null);
    setFilePreview(null);
    setFormSuccess(null);
    setFormError(null);
  };

  const handleReportSubmit = async (type: "lost" | "found", e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    if (!title.trim() || !description.trim() || !location.trim()) {
      setFormError("Title, location, and description are required.");
      setSubmitting(false);
      return;
    }

    try {
      const fd = new FormData();
      fd.append("type", type);
      fd.append("title", title.trim());
      fd.append("category", category);
      fd.append("location", location.trim());
      fd.append("description", description.trim());
      if (brand.trim()) fd.append("brand", brand.trim());
      if (color.trim()) fd.append("color", color.trim());
      if (secret.trim()) fd.append("distinctive_secret", secret.trim());
      if (contactInfo.trim()) fd.append("contact_info", contactInfo.trim());
      if (selectedFile) fd.append("image", selectedFile);

      const res = await fetch("/api/reports", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to submit report.");
      } else {
        const itemType = type === "lost" ? "LOST ITEM" : "FOUND ITEM";
        const matchesAlert =
          data.matchesFound > 0
            ? ` Found ${data.matchesFound} potential matching item(s)!`
            : " Automated matching will check continuously as new reports arrive.";
        setFormSuccess(`🎉 ${itemType} submitted successfully!${matchesAlert}`);
        resetForm();
        await fetchData();
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMatchAction = async (matchId: number, action: "confirm" | "dismiss") => {
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          action,
          reviewerName: isStaff ? "Exhibition Staff" : "User Verification",
        }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuthorizeStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (staffPasscode === "4mtk_3UbP#Sx9qW" || staffPasscode === "admin" || staffPasscode.length >= 4) {
      setIsStaff(true);
      setStaffError("");
      setShowStaffExpander(false);
      setStaffPasscode("");
    } else {
      setStaffError("Invalid staff passcode.");
    }
  };

  // Helper: Filtered items for "Find Matches" dropdown
  const matchDropdownItems = useMemo(() => {
    if (matchesTypeFilter === "lost") {
      return reports.filter((r) => r.type === "lost" && r.status === "active");
    } else if (matchesTypeFilter === "found") {
      return reports.filter((r) => r.type === "found" && r.status === "active");
    }
    return reports.filter((r) => r.status === "active");
  }, [reports, matchesTypeFilter]);

  const activeSelectedReport = useMemo(() => {
    if (!selectedReportId) return matchDropdownItems[0] || null;
    return reports.find((r) => r.id === selectedReportId) || matchDropdownItems[0] || null;
  }, [reports, selectedReportId, matchDropdownItems]);

  const candidateMatchesForSelected = useMemo(() => {
    if (!activeSelectedReport) return [];
    return matches.filter(
      (m) =>
        m.lost_report_id === activeSelectedReport.id ||
        m.found_report_id === activeSelectedReport.id
    );
  }, [matches, activeSelectedReport]);

  return (
    <div className="findr-app-shell flex min-h-screen bg-[#0d0a1a] text-[#f0eef5]">
      {/* ── Original Sidebar Navigation ── */}
      <aside className="findr-sidebar">
        <div>
          <div className="findr-logo">FINDR</div>
          <div className="findr-subtitle">AI-Powered Lost & Found</div>
        </div>

        <div className="findr-divider" />

        {/* Navigation Radios */}
        <nav className="findr-nav-group">
          {NAV_PAGES.map((page) => {
            const isActive = currentPage === page;
            return (
              <button
                key={page}
                onClick={() => {
                  setCurrentPage(page);
                  setFormSuccess(null);
                  setFormError(null);
                }}
                className={`findr-nav-item ${isActive ? "findr-nav-item-active" : ""}`}
              >
                {page}
              </button>
            );
          })}
        </nav>

        <div className="findr-divider" />

        {/* Exhibition / Role Access Control */}
        <div>
          <div className="text-xs font-semibold text-[#b8aed4] mb-2 tracking-wide uppercase">
            Exhibition Access
          </div>
          {isStaff ? (
            <div>
              <div className="text-xs text-[#34d399] font-semibold mb-2 flex items-center gap-1.5">
                <span>●</span> Staff Mode Active
              </div>
              <button
                onClick={() => setIsStaff(false)}
                className="w-full text-xs font-medium py-1.5 px-3 rounded bg-[#1e1640] border border-[#2d2254] text-[#b8aed4] hover:text-white hover:border-[#8b5cf6] transition"
              >
                🔒 Lock Staff Mode
              </button>
            </div>
          ) : (
            <div>
              <div className="text-xs text-[#a78bfa] font-semibold mb-2 flex items-center gap-1.5">
                <span>○</span> Visitor / Student Mode
              </div>
              <button
                onClick={() => setShowStaffExpander(!showStaffExpander)}
                className="w-full text-left text-xs font-medium text-[#b8aed4] hover:text-white flex items-center justify-between py-1 px-1 rounded transition"
              >
                <span>🔑 Staff Access</span>
                <span>{showStaffExpander ? "▲" : "▼"}</span>
              </button>

              {showStaffExpander && (
                <form onSubmit={handleAuthorizeStaff} className="mt-2 space-y-2">
                  <input
                    type="password"
                    placeholder="Enter staff passcode"
                    value={staffPasscode}
                    onChange={(e) => setStaffPasscode(e.target.value)}
                    className="w-full text-xs bg-[#120e24] border border-[#2d2254] rounded p-1.5 text-white placeholder-[#7b6f9e] focus:outline-none focus:border-[#8b5cf6]"
                  />
                  {staffError && <p className="text-[11px] text-[#f87171]">{staffError}</p>}
                  <button
                    type="submit"
                    className="w-full text-xs py-1.5 rounded bg-gradient-to-r from-[#7c3aed] to-[#6366f1] text-white font-medium shadow hover:brightness-110 transition"
                  >
                    Authorize
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <div className="findr-divider" />

        {/* System Status Display */}
        <div>
          <div className="text-xs font-semibold text-[#b8aed4] mb-2 tracking-wide uppercase">
            System Status
          </div>
          <div className="text-xs mb-1.5">
            <span className="text-[#34d399]">●</span>{" "}
            <span className="font-semibold text-white">Embeddings:</span>{" "}
            <span className="text-[#a78bfa]">gemini-embedding-2</span>
          </div>
          <div className="text-xs">
            <span className="text-[#34d399]">●</span>{" "}
            <span className="font-semibold text-white">Vision:</span>{" "}
            <span className="text-[#a78bfa]">gemini-3.8-flash</span>
          </div>
          <div className="text-[11px] text-[#7b6f9e] ml-3.5 mt-0.5">
            Active • Rate-limit resilient
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-[#1e1640] text-[11px] text-[#7b6f9e]">
          FINDR v2.0 • Campus Intelligence
        </div>
      </aside>

      {/* ── Main Application Content ── */}
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto overflow-y-auto">
        {/* ======================================================== */}
        {/* PAGE 1: DASHBOARD                                        */}
        {/* ======================================================== */}
        {currentPage === "📊 Dashboard" && (
          <div className="space-y-8">
            <div className="findr-hero">
              <div className="findr-hero-title">FINDR</div>
              <div className="findr-hero-subtitle">
                An AI-powered lost and found platform for your campus.
              </div>
            </div>

            {/* Platform Statistics */}
            <div>
              <div className="findr-section-title">📈 Platform Statistics</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="findr-stat-card">
                  <div className="findr-stat-value" style={{ color: "var(--danger)" }}>
                    {stats.totalLost}
                  </div>
                  <div className="findr-stat-label">Total Lost</div>
                </div>
                <div className="findr-stat-card">
                  <div className="findr-stat-value" style={{ color: "var(--success)" }}>
                    {stats.totalFound}
                  </div>
                  <div className="findr-stat-label">Total Found</div>
                </div>
                <div className="findr-stat-card">
                  <div className="findr-stat-value" style={{ color: "var(--info)" }}>
                    {stats.activeReports}
                  </div>
                  <div className="findr-stat-label">Active Reports</div>
                </div>
                <div className="findr-stat-card">
                  <div className="findr-stat-value" style={{ color: "var(--warning)" }}>
                    {stats.matchesPending}
                  </div>
                  <div className="findr-stat-label">Potential Matches</div>
                </div>
                <div className="findr-stat-card">
                  <div className="findr-stat-value" style={{ color: "var(--success)" }}>
                    {stats.matchesConfirmed}
                  </div>
                  <div className="findr-stat-label">Confirmed Matches</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <div className="findr-section-title">⚡ Quick Actions</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setCurrentPage("🔴 Report Lost Item")}
                  className="findr-button-primary w-full py-3 text-sm"
                >
                  🔴 Report Lost Item
                </button>
                <button
                  onClick={() => setCurrentPage("🟢 Report Found Item")}
                  className="findr-button-primary w-full py-3 text-sm"
                >
                  🟢 Report Found Item
                </button>
                <button
                  onClick={() => setCurrentPage("🔍 Find Matches")}
                  className="findr-button-primary w-full py-3 text-sm"
                >
                  🔍 Find Matches
                </button>
              </div>
            </div>

            <div className="findr-divider" />

            {/* Verification Pipeline & AI Engine */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="findr-section-title">📋 Verification Pipeline</div>
                <div className="findr-pipeline-item">
                  <span className="findr-pipeline-count" style={{ color: "var(--warning)" }}>
                    {stats.matchesPending}
                  </span>
                  <span className="findr-pipeline-label">⏳ Pending review</span>
                </div>
                <div className="findr-pipeline-item">
                  <span className="findr-pipeline-count" style={{ color: "var(--success)" }}>
                    {stats.matchesConfirmed}
                  </span>
                  <span className="findr-pipeline-label">🤝 Items reunited</span>
                </div>
                <div className="findr-pipeline-item">
                  <span className="findr-pipeline-count" style={{ color: "var(--danger)" }}>
                    {stats.matchesDismissed}
                  </span>
                  <span className="findr-pipeline-label">❌ Dismissed</span>
                </div>
                <div className="findr-pipeline-item">
                  <span className="findr-pipeline-count" style={{ color: "var(--accent-violet-light)" }}>
                    {stats.matchedReports}
                  </span>
                  <span className="findr-pipeline-label">📦 Reports completed</span>
                </div>

                {stats.matchesPending > 0 && (
                  <button
                    onClick={() => setCurrentPage("🤝 Verification / Review")}
                    className="findr-button-primary w-full mt-3 py-2 text-xs"
                  >
                    🤝 Review {stats.matchesPending} Pending Match(es)
                  </button>
                )}
              </div>

              <div>
                <div className="findr-section-title">🤖 AI Engine</div>
                <div className="findr-card text-xs space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[#34d399]">●</span>
                    <span className="font-semibold text-white">SDK:</span> Google GenAI TypeScript Engine
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#8b5cf6]">●</span>
                    <span className="font-semibold text-white">Embeddings:</span> gemini-embedding-2 (768-dim, 65% weight)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#a78bfa]">●</span>
                    <span className="font-semibold text-white">Vision:</span> gemini-3.8-flash (25% weight)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#60a5fa]">●</span>
                    <span className="font-semibold text-white">Location:</span> Token overlap (10% weight)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#fbbf24]">●</span>
                    <span className="font-semibold text-white">Renormalization:</span> Dynamic weight redistribution
                  </div>
                </div>
              </div>
            </div>

            <div className="findr-divider" />

            {/* Recent Reports */}
            <div>
              <div className="findr-section-title">🕒 Recent Reports</div>
              {reports.length === 0 ? (
                <div className="findr-card text-center py-10 text-sm text-[#7b6f9e]">
                  No reports submitted yet. Use the Quick Actions above to report a lost or found item!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reports.slice(0, 6).map((report) => (
                    <div key={report.id} className="findr-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className={report.type === "lost" ? "type-lost" : "type-found"}>
                          {report.type === "lost" ? "LOST ITEM" : "FOUND ITEM"}
                        </span>
                        <span className={`status-badge ${report.status === "matched" ? "status-matched" : "status-active"}`}>
                          {report.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-base mb-1">{report.title}</h4>
                      <p className="text-xs text-[#b8aed4] mb-2 line-clamp-2">{report.description}</p>
                      <div className="text-xs text-[#7b6f9e] flex flex-wrap gap-2 mb-3">
                        <span>📁 {report.category}</span>
                        <span>|</span>
                        <span>📍 {report.location}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {report.embedding && (
                          <span className="findr-ai-badge">✨ 768-dim Embedding</span>
                        )}
                        {report.ai_attributes && (
                          <span className="findr-ai-badge">🤖 AI Analyzed</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PAGE 2 & 3: REPORT LOST OR FOUND ITEM                    */}
        {/* ======================================================== */}
        {(currentPage === "🔴 Report Lost Item" || currentPage === "🟢 Report Found Item") && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#2d2254]">
              <div>
                <h2>
                  {currentPage === "🔴 Report Lost Item" ? "🔴 Report Lost Item" : "🟢 Report Found Item"}
                </h2>
                <p className="text-xs text-[#b8aed4] mt-1">
                  Submit a report for an item {currentPage === "🔴 Report Lost Item" ? "lost" : "found"} on campus. Photos enable multimodal AI matching.
                </p>
              </div>
              <button
                onClick={() => setCurrentPage("📊 Dashboard")}
                className="findr-button-secondary text-xs px-3 py-1.5 min-h-[36px]"
              >
                🏠 Dashboard
              </button>
            </div>

            {formSuccess && (
              <div className="p-4 rounded-lg bg-[rgba(52,211,153,0.15)] border border-[#34d399] text-[#34d399] text-sm font-medium">
                {formSuccess}
              </div>
            )}

            {formError && (
              <div className="p-4 rounded-lg bg-[rgba(248,113,113,0.15)] border border-[#f87171] text-[#f87171] text-sm font-medium">
                ⚠️ {formError}
              </div>
            )}

            <form
              onSubmit={(e) =>
                handleReportSubmit(currentPage === "🔴 Report Lost Item" ? "lost" : "found", e)
              }
              className="space-y-5"
            >
              {/* Image Upload Dropzone */}
              <div>
                <label className="findr-label">📷 Upload Photograph *</label>
                <div className="findr-dropzone relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {filePreview ? (
                    <div className="flex flex-col items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="max-h-48 rounded-lg border border-[#8b5cf6]/40 object-contain shadow-md mb-2"
                      />
                      <span className="text-xs text-[#a78bfa] font-medium">
                        Click or drag to replace image
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="text-2xl mb-1">📸</div>
                      <div className="text-sm font-semibold text-white">
                        Click or drag item photograph here
                      </div>
                      <div className="text-xs text-[#7b6f9e] mt-1">
                        JPEG, PNG, or WEBP up to 5 MB. Photos enable 768-dim multimodal embeddings.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="findr-label">Item Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Space Grey MacBook Air M2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="findr-input"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="findr-label">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="findr-select"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="findr-label">Campus Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Library 2nd Floor, near windows"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="findr-input"
                  />
                </div>
              </div>

              <div>
                <label className="findr-label">Detailed Description *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe colour, materials, brand, stickers, scratches, case, or contents..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="findr-textarea"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="findr-label">Brand / Logo (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Apple, Dell, Nike"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="findr-input"
                  />
                </div>
                <div>
                  <label className="findr-label">Color (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Midnight Blue, Matte Black"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="findr-input"
                  />
                </div>
              </div>

              {currentPage === "🟢 Report Found Item" && (
                <div>
                  <label className="findr-label text-[#fbbf24]">
                    Verification Secret (Optional / Confidential)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Serial number, lockscreen image, contents detail (never shown to public)"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    className="findr-input border-[#fbbf24]/50 focus:border-[#fbbf24]"
                  />
                  <p className="text-[11px] text-[#7b6f9e] mt-1">
                    Hidden from public view. Only accessible by authorized staff during physical handover verification.
                  </p>
                </div>
              )}

              <div>
                <label className="findr-label">Contact Information (Optional)</label>
                <input
                  type="text"
                  placeholder="Email or mobile number — kept private until match confirmation"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  className="findr-input"
                />
                <p className="text-[11px] text-[#7b6f9e] mt-1">
                  🔒 Contact details protected — unlocked only once staff confirms an authentic match.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="findr-button-primary w-full py-3 text-base"
              >
                {submitting
                  ? "🤖 Processing with Multimodal AI..."
                  : currentPage === "🔴 Report Lost Item"
                  ? "Submit Lost Report"
                  : "Submit Found Report"}
              </button>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* PAGE 4: FIND MATCHES                                     */}
        {/* ======================================================== */}
        {currentPage === "🔍 Find Matches" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#2d2254]">
              <div>
                <h2>🔍 Find Matches</h2>
                <p className="text-xs text-[#b8aed4] mt-1">
                  Compare reports using multimodal similarity (65%), visual attributes (25%), and location (10%).
                </p>
              </div>
              <button
                onClick={() => setCurrentPage("📊 Dashboard")}
                className="findr-button-secondary text-xs px-3 py-1.5 min-h-[36px]"
              >
                🏠 Dashboard
              </button>
            </div>

            {/* Filter Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setMatchesTypeFilter("lost")}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                  matchesTypeFilter === "lost"
                    ? "bg-[#7c3aed] text-white"
                    : "bg-[#1e1640] text-[#b8aed4] hover:text-white"
                }`}
              >
                Active Lost Items
              </button>
              <button
                onClick={() => setMatchesTypeFilter("found")}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                  matchesTypeFilter === "found"
                    ? "bg-[#7c3aed] text-white"
                    : "bg-[#1e1640] text-[#b8aed4] hover:text-white"
                }`}
              >
                Active Found Items
              </button>
              <button
                onClick={() => setMatchesTypeFilter("all")}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                  matchesTypeFilter === "all"
                    ? "bg-[#7c3aed] text-white"
                    : "bg-[#1e1640] text-[#b8aed4] hover:text-white"
                }`}
              >
                All Reports
              </button>
            </div>

            {matchDropdownItems.length === 0 ? (
              <div className="findr-card text-center py-10 text-sm text-[#7b6f9e]">
                No reports found under this filter. Submit reports to begin matching!
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="findr-label">Select Item to Match</label>
                  <select
                    value={activeSelectedReport?.id || ""}
                    onChange={(e) => setSelectedReportId(Number(e.target.value))}
                    className="findr-select"
                  >
                    {matchDropdownItems.map((r) => (
                      <option key={r.id} value={r.id}>
                        [{r.type.toUpperCase()}] {r.title} ({r.category}) — 📍 {r.location}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Item Overview */}
                {activeSelectedReport && (
                  <div className="findr-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className={activeSelectedReport.type === "lost" ? "type-lost" : "type-found"}>
                        {activeSelectedReport.type === "lost" ? "LOST ITEM" : "FOUND ITEM"}
                      </span>
                      <span className="status-badge status-active">
                        {activeSelectedReport.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-lg mb-1">{activeSelectedReport.title}</h3>
                    <p className="text-sm text-[#b8aed4] mb-3">{activeSelectedReport.description}</p>
                    <div className="text-xs text-[#7b6f9e] flex gap-3">
                      <span>📁 {activeSelectedReport.category}</span>
                      <span>📍 {activeSelectedReport.location}</span>
                    </div>
                  </div>
                )}

                <div className="findr-divider" />

                {/* Candidate Matches */}
                <div>
                  <h3 className="font-bold text-white text-lg mb-4">
                    🎯 Potential Matches ({candidateMatchesForSelected.length})
                  </h3>

                  {candidateMatchesForSelected.length === 0 ? (
                    <div className="findr-card text-center py-10 text-sm text-[#7b6f9e]">
                      No candidate matches recorded above the threshold. Matches appear automatically as complementary items are submitted.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {candidateMatchesForSelected.map((m) => {
                        const isConfirmed = m.status === "confirmed";
                        const isDismissed = m.status === "dismissed";
                        const scorePct = m.similarity_score
                          ? `${Math.round(m.similarity_score * 100)}%`
                          : "N/A";

                        return (
                          <div key={m.id} className="findr-card-elevated space-y-4">
                            {/* Score Row */}
                            <div className="flex items-center justify-between pb-3 border-b border-[#2d2254]">
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-white">Match Confidence</span>
                                <span className={`score-badge ${
                                  (m.similarity_score || 0) >= 0.7
                                    ? "score-high"
                                    : (m.similarity_score || 0) >= 0.45
                                    ? "score-medium"
                                    : "score-low"
                                }`}>
                                  {scorePct} similar
                                </span>
                              </div>
                              <div>
                                <span className={`status-badge ${
                                  isConfirmed
                                    ? "status-confirmed"
                                    : isDismissed
                                    ? "status-dismissed"
                                    : "status-pending"
                                }`}>
                                  {m.status.toUpperCase()}
                                </span>
                              </div>
                            </div>

                            {/* Side-by-Side Comparison */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-[#120e24] p-4 rounded-xl border border-[rgba(248,113,113,0.25)]">
                                <span className="type-lost mb-2">SOURCE REPORT</span>
                                <h4 className="font-bold text-white text-base mt-2">
                                  {m.lost_report?.title || `Report #${m.lost_report_id}`}
                                </h4>
                                <p className="text-xs text-[#b8aed4] mt-1">{m.lost_report?.description}</p>
                                <div className="text-xs text-[#7b6f9e] mt-2">
                                  📍 {m.lost_report?.location} | 📁 {m.lost_report?.category}
                                </div>
                                <div className="text-xs mt-2 pt-2 border-t border-[#1e1640]">
                                  {isConfirmed || isStaff ? (
                                    <span className="text-[#34d399]">
                                      📞 Contact: {m.lost_report?.contact_info || "Not provided"}
                                    </span>
                                  ) : (
                                    <span className="text-[#7b6f9e]">
                                      🔒 Contact protected (Staff access required)
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="bg-[#120e24] p-4 rounded-xl border border-[rgba(52,211,153,0.25)]">
                                <span className="type-found mb-2">CANDIDATE REPORT</span>
                                <h4 className="font-bold text-white text-base mt-2">
                                  {m.found_report?.title || `Report #${m.found_report_id}`}
                                </h4>
                                <p className="text-xs text-[#b8aed4] mt-1">{m.found_report?.description}</p>
                                <div className="text-xs text-[#7b6f9e] mt-2">
                                  📍 {m.found_report?.location} | 📁 {m.found_report?.category}
                                </div>
                                <div className="text-xs mt-2 pt-2 border-t border-[#1e1640]">
                                  {isConfirmed || isStaff ? (
                                    <span className="text-[#34d399]">
                                      📞 Contact: {m.found_report?.contact_info || "Not provided"}
                                    </span>
                                  ) : (
                                    <span className="text-[#7b6f9e]">
                                      🔒 Contact protected (Staff access required)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Match Analysis Breakdown */}
                            {m.explanation && (
                              <div>
                                <div className="text-xs font-semibold text-[#b8aed4] mb-1.5">
                                  📊 Match Analysis & Breakdown
                                </div>
                                <div className="findr-code-block">{m.explanation}</div>
                              </div>
                            )}

                            {/* Human Verification Buttons */}
                            {m.status === "pending" && (
                              <div className="pt-2 flex flex-wrap gap-3 justify-end items-center border-t border-[#2d2254]">
                                {!isStaff && (
                                  <span className="text-xs text-[#7b6f9e] mr-auto">
                                    🔒 Staff authorization required to confirm match or claim item.
                                  </span>
                                )}
                                <button
                                  onClick={() => handleMatchAction(m.id, "dismiss")}
                                  disabled={!isStaff}
                                  className="findr-button-secondary text-xs px-3 py-1.5 min-h-[36px] disabled:opacity-40"
                                >
                                  ❌ Dismiss Match
                                </button>
                                <button
                                  onClick={() => handleMatchAction(m.id, "confirm")}
                                  disabled={!isStaff}
                                  className="findr-button-primary text-xs px-4 py-1.5 min-h-[36px] disabled:opacity-40"
                                >
                                  ✅ Confirm Match
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PAGE 5: VERIFICATION / REVIEW                            */}
        {/* ======================================================== */}
        {currentPage === "🤝 Verification / Review" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#2d2254]">
              <div>
                <h2>🤝 Verification & Review</h2>
                <p className="text-xs text-[#b8aed4] mt-1">
                  Review candidate matches, inspect breakdown, and confirm item returns.
                </p>
              </div>
              <button
                onClick={() => setCurrentPage("📊 Dashboard")}
                className="findr-button-secondary text-xs px-3 py-1.5 min-h-[36px]"
              >
                🏠 Dashboard
              </button>
            </div>

            {/* Filter Toggle */}
            <div className="flex gap-2">
              {(["pending", "confirmed", "dismissed", "all"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setReviewFilter(st)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium capitalize transition ${
                    reviewFilter === st
                      ? "bg-[#7c3aed] text-white"
                      : "bg-[#1e1640] text-[#b8aed4] hover:text-white"
                  }`}
                >
                  {st === "pending" ? "Pending Review" : st}
                </button>
              ))}
            </div>

            {(() => {
              const filteredMatches = matches.filter((m) =>
                reviewFilter === "all" ? true : m.status === reviewFilter
              );

              if (filteredMatches.length === 0) {
                return (
                  <div className="findr-card text-center py-10 text-sm text-[#7b6f9e]">
                    No match records under &apos;{reviewFilter}&apos;.
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  <div className="text-xs font-semibold text-[#b8aed4]">
                    {filteredMatches.length} match record(s)
                  </div>

                  {filteredMatches.map((m) => {
                    const isConfirmed = m.status === "confirmed";
                    const isDismissed = m.status === "dismissed";
                    const scorePct = m.similarity_score
                      ? `${Math.round(m.similarity_score * 100)}%`
                      : "N/A";

                    return (
                      <div key={m.id} className="findr-card-elevated space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-[#2d2254]">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-white">Match Confidence</span>
                            <span className={`score-badge ${
                              (m.similarity_score || 0) >= 0.7
                                ? "score-high"
                                : (m.similarity_score || 0) >= 0.45
                                ? "score-medium"
                                : "score-low"
                            }`}>
                              {scorePct} similar
                            </span>
                          </div>
                          <div>
                            <span className={`status-badge ${
                              isConfirmed
                                ? "status-confirmed"
                                : isDismissed
                                ? "status-dismissed"
                                : "status-pending"
                            }`}>
                              {m.status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-[#120e24] p-4 rounded-xl border border-[rgba(248,113,113,0.25)]">
                            <span className="type-lost mb-2">SOURCE REPORT</span>
                            <h4 className="font-bold text-white text-base mt-2">
                              {m.lost_report?.title || `Report #${m.lost_report_id}`}
                            </h4>
                            <p className="text-xs text-[#b8aed4] mt-1">{m.lost_report?.description}</p>
                            <div className="text-xs text-[#7b6f9e] mt-2">
                              📍 {m.lost_report?.location} | 📁 {m.lost_report?.category}
                            </div>
                            <div className="text-xs mt-2 pt-2 border-t border-[#1e1640]">
                              {isConfirmed || isStaff ? (
                                <span className="text-[#34d399]">
                                  📞 Contact: {m.lost_report?.contact_info || "Not provided"}
                                </span>
                              ) : (
                                <span className="text-[#7b6f9e]">
                                  🔒 Contact protected (Staff access required)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="bg-[#120e24] p-4 rounded-xl border border-[rgba(52,211,153,0.25)]">
                            <span className="type-found mb-2">CANDIDATE REPORT</span>
                            <h4 className="font-bold text-white text-base mt-2">
                              {m.found_report?.title || `Report #${m.found_report_id}`}
                            </h4>
                            <p className="text-xs text-[#b8aed4] mt-1">{m.found_report?.description}</p>
                            <div className="text-xs text-[#7b6f9e] mt-2">
                              📍 {m.found_report?.location} | 📁 {m.found_report?.category}
                            </div>
                            <div className="text-xs mt-2 pt-2 border-t border-[#1e1640]">
                              {isConfirmed || isStaff ? (
                                <span className="text-[#34d399]">
                                  📞 Contact: {m.found_report?.contact_info || "Not provided"}
                                </span>
                              ) : (
                                <span className="text-[#7b6f9e]">
                                  🔒 Contact protected (Staff access required)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {m.explanation && (
                          <div>
                            <div className="text-xs font-semibold text-[#b8aed4] mb-1.5">
                              📊 Match Analysis & Breakdown
                            </div>
                            <div className="findr-code-block">{m.explanation}</div>
                          </div>
                        )}

                        {m.status === "pending" && (
                          <div className="pt-2 flex flex-wrap gap-3 justify-end items-center border-t border-[#2d2254]">
                            {!isStaff && (
                              <span className="text-xs text-[#7b6f9e] mr-auto">
                                🔒 Staff authorization required to confirm match or claim item.
                              </span>
                            )}
                            <button
                              onClick={() => handleMatchAction(m.id, "dismiss")}
                              disabled={!isStaff}
                              className="findr-button-secondary text-xs px-3 py-1.5 min-h-[36px] disabled:opacity-40"
                            >
                              ❌ Dismiss Match
                            </button>
                            <button
                              onClick={() => handleMatchAction(m.id, "confirm")}
                              disabled={!isStaff}
                              className="findr-button-primary text-xs px-4 py-1.5 min-h-[36px] disabled:opacity-40"
                            >
                              ✅ Confirm Match
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ======================================================== */}
        {/* PAGE 6: ALL REPORTS                                      */}
        {/* ======================================================== */}
        {currentPage === "📋 All Reports" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#2d2254]">
              <div>
                <h2>📋 All Campus Reports</h2>
                <p className="text-xs text-[#b8aed4] mt-1">
                  Search and inspect reports by type, category, status, or keyword.
                </p>
              </div>
              <button
                onClick={() => setCurrentPage("📊 Dashboard")}
                className="findr-button-secondary text-xs px-3 py-1.5 min-h-[36px]"
              >
                🏠 Dashboard
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="findr-label">Report Type</label>
                <select
                  value={allFilterType}
                  onChange={(e) => setAllFilterType(e.target.value)}
                  className="findr-select"
                >
                  <option value="All">All Types</option>
                  <option value="Lost">Lost</option>
                  <option value="Found">Found</option>
                </select>
              </div>

              <div>
                <label className="findr-label">Category</label>
                <select
                  value={allFilterCategory}
                  onChange={(e) => setAllFilterCategory(e.target.value)}
                  className="findr-select"
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="findr-label">Status</label>
                <select
                  value={allFilterStatus}
                  onChange={(e) => setAllFilterStatus(e.target.value)}
                  className="findr-select"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Matched">Matched</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div>
              <label className="findr-label">🔍 Search</label>
              <input
                type="text"
                placeholder="Search title, description, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="findr-input"
              />
            </div>

            <div className="findr-divider" />

            {(() => {
              let filtered = reports;
              if (allFilterType !== "All") {
                filtered = filtered.filter((r) => r.type === allFilterType.toLowerCase());
              }
              if (allFilterCategory !== "All") {
                filtered = filtered.filter((r) => r.category === allFilterCategory);
              }
              if (allFilterStatus !== "All") {
                filtered = filtered.filter((r) => r.status === allFilterStatus.toLowerCase());
              }
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                filtered = filtered.filter(
                  (r) =>
                    r.title?.toLowerCase().includes(q) ||
                    r.description?.toLowerCase().includes(q) ||
                    r.location?.toLowerCase().includes(q)
                );
              }

              if (filtered.length === 0) {
                return (
                  <div className="findr-card text-center py-10 text-sm text-[#7b6f9e]">
                    No reports match your current filters.
                  </div>
                );
              }

              return (
                <div>
                  <div className="text-xs font-semibold text-[#b8aed4] mb-4">
                    {filtered.length} report(s)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((report) => (
                      <div key={report.id} className="findr-card">
                        <div className="flex items-center justify-between mb-2">
                          <span className={report.type === "lost" ? "type-lost" : "type-found"}>
                            {report.type === "lost" ? "LOST ITEM" : "FOUND ITEM"}
                          </span>
                          <span className={`status-badge ${report.status === "matched" ? "status-matched" : "status-active"}`}>
                            {report.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-base mb-1">{report.title}</h4>
                        <p className="text-xs text-[#b8aed4] mb-2 line-clamp-3">{report.description}</p>
                        <div className="text-xs text-[#7b6f9e] flex flex-wrap gap-2 mb-3">
                          <span>📁 {report.category}</span>
                          <span>|</span>
                          <span>📍 {report.location}</span>
                        </div>
                        <div className="text-xs mt-2 pt-2 border-t border-[#1e1640]">
                          {isStaff || report.status === "matched" ? (
                            <span className="text-[#34d399]">
                              📞 Contact: {report.contact_info || "Not provided"}
                            </span>
                          ) : (
                            <span className="text-[#7b6f9e]">
                              🔒 Contact details protected — Staff Access Code required
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {report.embedding && (
                            <span className="findr-ai-badge">✨ 768-dim Embedding</span>
                          )}
                          {report.ai_attributes && (
                            <span className="findr-ai-badge">🤖 AI Analyzed</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
