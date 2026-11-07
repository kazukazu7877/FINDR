"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  const [mode, setMode] = useState<"user" | "staff">("user");
  const [reports, setReports] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [submitting, setSubmitting] = useState(false);
  const [reportType, setReportType] = useState<"lost" | "found">("lost");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [secret, setSecret] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/reports");
      const data = await res.json();
      if (data.reports) setReports(data.reports);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMatches = async () => {
    try {
      const res = await fetch("/api/matches");
      const data = await res.json();
      if (data.matches) setMatches(data.matches);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    Promise.all([fetchReports(), fetchMatches()]).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("type", reportType);
      fd.append("title", title);
      fd.append("category", category);
      fd.append("description", description);
      fd.append("location", location);
      if (brand) fd.append("brand", brand);
      if (color) fd.append("color", color);
      if (secret) fd.append("distinctive_secret", secret);
      if (contactInfo) fd.append("contact_info", contactInfo);
      if (selectedFile) fd.append("image", selectedFile);

      const res = await fetch("/api/reports", {
        method: "POST",
        body: fd,
      });

      if (res.ok) {
        setTitle("");
        setDescription("");
        setLocation("");
        setBrand("");
        setColor("");
        setSecret("");
        setContactInfo("");
        setSelectedFile(null);
        await Promise.all([fetchReports(), fetchMatches()]);
      }
    } catch (err) {
      console.error(err);
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
          reviewerName: "Staff Supervisor",
        }),
      });
      if (res.ok) {
        await Promise.all([fetchReports(), fetchMatches()]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0a1a] text-[#f0eef5] flex flex-col font-sans selection:bg-violet-600 selection:text-white">
      <Navbar mode={mode} setMode={setMode} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {mode === "user" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Column */}
            <div className="lg:col-span-1 bg-[#1a1333] border border-[#2d2254] rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />
              <h2 className="text-xl font-bold tracking-tight text-white mb-2">Submit Item Report</h2>
              <p className="text-xs text-violet-300 mb-6">
                AI extracts attributes and embeds visual details automatically.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-violet-200 mb-1">Report Intent</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReportType("lost")}
                      className={`py-2 text-xs font-semibold rounded-lg border transition ${
                        reportType === "lost"
                          ? "bg-rose-500/20 border-rose-500 text-rose-300"
                          : "border-[#2d2254] text-violet-300 hover:bg-[#221a42]"
                      }`}
                    >
                      I Lost Something
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportType("found")}
                      className={`py-2 text-xs font-semibold rounded-lg border transition ${
                        reportType === "found"
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                          : "border-[#2d2254] text-violet-300 hover:bg-[#221a42]"
                      }`}
                    >
                      I Found Something
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-violet-200 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Blue HP Laptop Bag"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#120c24] border border-[#2d2254] rounded-lg px-3 py-2 text-white placeholder-violet-500 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-violet-200 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#120c24] border border-[#2d2254] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                    >
                      <option value="Electronics">Electronics</option>
                      <option value="Bags & Wallets">Bags & Wallets</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Books & Stationery">Books & Stationery</option>
                      <option value="Keys">Keys</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-violet-200 mb-1">Location</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Main Library 2nd Fl"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-[#120c24] border border-[#2d2254] rounded-lg px-3 py-2 text-white placeholder-violet-500 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-violet-200 mb-1">Detailed Description</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe item condition, stickers, identifiers..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#120c24] border border-[#2d2254] rounded-lg px-3 py-2 text-white placeholder-violet-500 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-violet-200 mb-1">Brand (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Apple"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full bg-[#120c24] border border-[#2d2254] rounded-lg px-3 py-2 text-white placeholder-violet-500 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-violet-200 mb-1">Color (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Midnight Blue"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full bg-[#120c24] border border-[#2d2254] rounded-lg px-3 py-2 text-white placeholder-violet-500 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                {reportType === "found" && (
                  <div>
                    <label className="block text-xs font-medium text-amber-300 mb-1">
                      Verification Secret (Hidden from public)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Serial code, keychain shape"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      className="w-full bg-[#120c24] border border-amber-500/40 rounded-lg px-3 py-2 text-white placeholder-amber-500/50 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-violet-200 mb-1">Contact Details</label>
                  <input
                    type="text"
                    placeholder="e.g. student@college.edu or Phone"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    className="w-full bg-[#120c24] border border-[#2d2254] rounded-lg px-3 py-2 text-white placeholder-violet-500 focus:outline-none focus:border-violet-500"
                  />
                  <p className="text-[10px] text-violet-400 mt-1">Locked until staff confirms an authentic match.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-violet-200 mb-1">Upload Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-violet-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-500 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-violet-600/30 transition disabled:opacity-50 text-sm mt-2"
                >
                  {submitting ? "Processing AI Analysis..." : "Submit Report"}
                </button>
              </form>
            </div>

            {/* Reports List Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-white">Active Campus Reports</h2>
                <span className="text-xs text-violet-400 font-mono">{reports.length} Reports logged</span>
              </div>

              {reports.length === 0 ? (
                <div className="bg-[#1a1333] border border-[#2d2254] rounded-2xl p-12 text-center text-violet-400">
                  <p className="text-sm font-medium">No reports recorded yet.</p>
                  <p className="text-xs text-violet-500 mt-1">Submit the first lost or found item report above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reports.map((r) => (
                    <div
                      key={r.id}
                      className="bg-[#1a1333] border border-[#2d2254] rounded-xl p-4 flex flex-col justify-between hover:border-violet-500/50 transition group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${
                              r.type === "lost"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            {r.type}
                          </span>
                          <span className="text-[10px] text-violet-400 font-mono">
                            {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-semibold text-white group-hover:text-violet-300 transition text-base">
                          {r.title}
                        </h3>
                        <p className="text-xs text-violet-300 line-clamp-2 mt-1">{r.description}</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          <span className="bg-[#120c24] border border-[#2d2254] px-2 py-0.5 rounded text-[10px] text-violet-300">
                            {r.category}
                          </span>
                          <span className="bg-[#120c24] border border-[#2d2254] px-2 py-0.5 rounded text-[10px] text-violet-300">
                            {r.location}
                          </span>
                        </div>
                      </div>

                      {r.ai_attributes?.colors && (
                        <div className="mt-4 pt-3 border-t border-[#2d2254]/60 text-[11px] text-violet-400">
                          <span className="font-medium text-violet-300">AI Visual Attributes: </span>
                          {r.ai_attributes.colors.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Staff Supervisor Workspace */
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Supervisor Match Verification Queue</h2>
              <p className="text-xs text-violet-300 mt-1">
                AI matches require supervisory human confirmation before contact records are disclosed to students.
              </p>
            </div>

            {matches.length === 0 ? (
              <div className="bg-[#1a1333] border border-[#2d2254] rounded-2xl p-12 text-center text-violet-400">
                <p className="text-sm font-medium">No pending AI matches awaiting review.</p>
                <p className="text-xs text-violet-500 mt-1">
                  Matches surface automatically when opposite items share visual and spatial similarity.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {matches.map((m) => (
                  <div
                    key={m.id}
                    className="bg-[#1a1333] border border-[#2d2254] rounded-2xl p-6 shadow-xl space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-[#2d2254] pb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white">Match Case #{m.id}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            m.status === "confirmed"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : m.status === "dismissed"
                              ? "bg-zinc-700/40 text-zinc-300 border border-zinc-600"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-violet-400">
                          {m.similarity_score ? `${Math.round(m.similarity_score * 100)}%` : "N/A"}
                        </div>
                        <div className="text-[10px] text-violet-400 uppercase tracking-widest font-mono">
                          Composite Score
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-[#120c24] border border-rose-500/30 rounded-xl p-4">
                        <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
                          Lost Report (Source)
                        </span>
                        <h4 className="font-semibold text-white mt-1">{m.lost_report?.title || `ID #${m.lost_report_id}`}</h4>
                        <p className="text-xs text-violet-300 mt-1">{m.lost_report?.description}</p>
                        <p className="text-xs text-violet-400 mt-2">
                          <span className="font-semibold">Contact:</span>{" "}
                          {m.status === "confirmed" ? m.lost_report?.contact_info || "Not provided" : "Locked (Confidential)"}
                        </p>
                      </div>

                      <div className="bg-[#120c24] border border-emerald-500/30 rounded-xl p-4">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                          Found Report (Candidate)
                        </span>
                        <h4 className="font-semibold text-white mt-1">{m.found_report?.title || `ID #${m.found_report_id}`}</h4>
                        <p className="text-xs text-violet-300 mt-1">{m.found_report?.description}</p>
                        <p className="text-xs text-violet-400 mt-2">
                          <span className="font-semibold">Verification Secret:</span>{" "}
                          <span className="text-amber-300">{m.found_report?.distinctive_secret || "None"}</span>
                        </p>
                        <p className="text-xs text-violet-400 mt-1">
                          <span className="font-semibold">Contact:</span>{" "}
                          {m.status === "confirmed" ? m.found_report?.contact_info || "Not provided" : "Locked (Confidential)"}
                        </p>
                      </div>
                    </div>

                    {m.explanation && (
                      <div className="bg-[#120c24] rounded-lg p-3 text-xs font-mono text-violet-300 whitespace-pre-line border border-[#2d2254]">
                        {m.explanation}
                      </div>
                    )}

                    {m.status === "pending" && (
                      <div className="flex gap-3 justify-end pt-2">
                        <button
                          onClick={() => handleMatchAction(m.id, "dismiss")}
                          className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#221a42] hover:bg-[#2b1f54] text-violet-300 transition"
                        >
                          Dismiss Match
                        </button>
                        <button
                          onClick={() => handleMatchAction(m.id, "confirm")}
                          className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/20"
                        >
                          Confirm & Disclose Contact
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
