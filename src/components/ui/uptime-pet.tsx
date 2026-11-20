"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ═════════════════════════════════════════════════════════════════════
   Uptime Pet
   A status widget with a pixel virtual pet living on an LCD screen.
   Its mood is your service health: uptime, latency, error rate.
   Open incidents are bugs crawling around the screen. Feed the pet and
   it hunts a bug down and eats it, acknowledging that incident.

   - Real LCD rendering: per-pixel response time (ghosting), unlit cell
     grid, drop shadow behind the liquid crystal layer.
   - Hand-drawn 1-bit sprites and a 3×5 bitmap font, no assets.
   - Logic ticks at 8 fps like real handhelds; rendering eases at 60.
   - Optional chiptune audio, haptics, reduced-motion support,
     pauses itself when off-screen.
   ═════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────── Types / mood ─────────────────────────── */

export type PetIncident = { id: string; label?: string };
export type PetMood = "thriving" | "okay" | "sluggish" | "sick" | "critical" | "asleep";

export function moodFor(
  m: { uptime: number; latency: number; errorRate: number },
  opts: { latencyBudget: number; asleep?: boolean },
): PetMood {
  if (opts.asleep) return "asleep";
  if (m.uptime < 95 || m.errorRate >= 20) return "critical";
  if (m.errorRate >= 5) return "sick";
  if (m.latency >= opts.latencyBudget * 2) return "sluggish";
  if (m.uptime >= 99.9 && m.errorRate < 1 && m.latency <= opts.latencyBudget) return "thriving";
  return "okay";
}

const MOOD_COPY: { [k: string]: { label: string; line: string } } = {
  thriving: { label: "Thriving", line: "All systems nominal." },
  okay: { label: "Okay", line: "Holding steady." },
  sluggish: { label: "Sluggish", line: "Latency is over budget." },
  sick: { label: "Sick", line: "Error rate is climbing." },
  critical: { label: "Critical", line: "Service is degraded." },
  asleep: { label: "Asleep", line: "Quiet hours. Shh." },
};

/* ─────────────────────────── Bitmaps ─────────────────────────── */

type Bitmap = string[];

const FONT: { [ch: string]: Bitmap } = {
  "0": ["###", "#.#", "#.#", "#.#", "###"], "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"], "3": ["###", "..#", ".##", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"], "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"], "7": ["###", "..#", ".#.", ".#.", ".#."],
  "8": ["###", "#.#", "###", "#.#", "###"], "9": ["###", "#.#", "###", "..#", "###"],
  A: [".#.", "#.#", "###", "#.#", "#.#"], B: ["##.", "#.#", "##.", "#.#", "##."],
  C: [".##", "#..", "#..", "#..", ".##"], D: ["##.", "#.#", "#.#", "#.#", "##."],
  E: ["###", "#..", "##.", "#..", "###"], F: ["###", "#..", "##.", "#..", "#.."],
  G: [".##", "#..", "#.#", "#.#", ".##"], H: ["#.#", "#.#", "###", "#.#", "#.#"],
  I: ["###", ".#.", ".#.", ".#.", "###"], J: ["..#", "..#", "..#", "#.#", ".#."],
  K: ["#.#", "#.#", "##.", "#.#", "#.#"], L: ["#..", "#..", "#..", "#..", "###"],
  M: ["#.#", "###", "###", "#.#", "#.#"], N: ["##.", "#.#", "#.#", "#.#", "#.#"],
  O: [".#.", "#.#", "#.#", "#.#", ".#."], P: ["##.", "#.#", "##.", "#..", "#.."],
  Q: [".#.", "#.#", "#.#", "##.", ".##"], R: ["##.", "#.#", "##.", "#.#", "#.#"],
  S: [".##", "#..", ".#.", "..#", "##."], T: ["###", ".#.", ".#.", ".#.", ".#."],
  U: ["#.#", "#.#", "#.#", "#.#", "###"], V: ["#.#", "#.#", "#.#", "#.#", ".#."],
  W: ["#.#", "#.#", "###", "###", "#.#"], X: ["#.#", "#.#", ".#.", "#.#", "#.#"],
  Y: ["#.#", "#.#", ".#.", ".#.", ".#."], Z: ["###", "..#", ".#.", "#..", "###"],
  "%": ["#.#", "..#", ".#.", "#..", "#.#"], ".": ["...", "...", "...", "...", ".#."],
  ":": ["...", ".#.", "...", ".#.", "..."], "-": ["...", "...", "###", "...", "..."],
  "/": ["..#", "..#", ".#.", "#..", "#.."], "!": [".#.", ".#.", ".#.", "...", ".#."],
  " ": ["...", "...", "...", "...", "..."],
};

const ICON = {
  heart: [".##.##.", "#######", "#######", "#######", ".#####.", "..###..", "...#..."],
  heartEmpty: [".##.##.", "#..#..#", "#.....#", "#.....#", ".#...#.", "..#.#..", "...#..."],
  hourglass: ["#######", ".#...#.", "..#.#..", "...#...", "..#.#..", ".#.#.#.", "#######"],
  bug: ["#.....#", ".#.#.#.", "..###..", "#######", "..###..", ".#####.", "#..#..#"],
  alert: ["...#...", "..#.#..", "..#.#..", ".#.#.#.", ".#...#.", "#..#..#", "#######"],
  moon: ["..###..", ".##....", "##.....", "##.....", "##.....", ".##....", "..###.."],
};

// Pet: 12 wide. 2 antenna rows + 10 body rows + 2 feet rows = 14 tall.
const BODY: Bitmap = [
  "...######...",
  "..#......#..",
  ".#........#.",
  "#..........#",
  "#..........#",
  "#..........#",
  "#..........#",
  ".#........#.",
  "..#......#..",
  "...######...",
];
const ANTENNA = { up: ["....#..#....", ".....##....."], droop: [".......#....", "......#....."], halo: ["...######...", "............"] };
const FEET = { a: ["...#....#...", "..##....##.."], b: ["....#..#....", "...##..##..."], none: ["............", "............"] };

type Face = [number, string][];
const FACE: { [k: string]: Face } = {
  happy: [[3, "...#....#..."], [4, "..#.#..#.#.."], [6, "....#..#...."], [7, ".....##....."]],
  okay: [[3, "...##..##..."], [4, "...##..##..."], [6, ".....##....."]],
  blink: [[4, "...##..##..."], [6, ".....##....."]],
  sluggish: [[4, "..###..###.."], [7, "....####...."]],
  sick: [[3, "...#....#..."], [4, "...#....#..."], [6, "...#.#.#.#.."], [7, "....#.#.#..."]],
  dead: [[2, "..#.#..#.#.."], [3, "...#....#..."], [4, "..#.#..#.#.."], [7, "....####...."]],
  sleep: [[4, "..##....##.."], [6, ".....#......"]],
  eat: [[3, "...##..##..."], [5, "....####...."], [6, "....#..#...."], [7, "....####...."]],
  chomp: [[3, "...##..##..."], [6, "....####...."]],
  love: [[2, "..#.#..#.#.."], [3, "..###..###.."], [4, "...#....#..."], [6, "....#..#...."], [7, ".....##....."]],
};

const BUG_FRAMES: Bitmap[] = [["#.#.#", ".###.", "#.#.#"], [".#.#.", "#####", ".#.#."]];
const HEART: Bitmap = [".#.#.", "#####", ".###.", "..#.."];
const ZED: Bitmap = ["###", ".#.", "###"];
const DROP: Bitmap = [".#", "##", "##"];

/* ─────────────────────────── Screen geometry ─────────────────────────── */

const W = 64;
const H = 46;
const GROUND = 36;
const PET_W = 12;
const PET_H = 14;
const TICK_MS = 125;

const SHELLS = {
  graphite: { from: "#34373d", to: "#16171a", edge: "#0b0b0d", label: "#8b8f97", btn: "#e4572e", btnEdge: "#8f2a10" },
  bone: { from: "#f1ece0", to: "#d7cfbd", edge: "#a99f8a", label: "#7c7262", btn: "#3e5c76", btnEdge: "#1f3346" },
  coral: { from: "#ff9a87", to: "#e0624f", edge: "#9c3426", label: "#7a2418", btn: "#fff1d6", btnEdge: "#b98f57" },
  mint: { from: "#bfeedd", to: "#7fcdb2", edge: "#3e8a70", label: "#2b6652", btn: "#ff6b57", btnEdge: "#a8321f" },
};
export type PetShell = keyof typeof SHELLS;

const LCD = { bg: "#a3b38c", ink: "#1d2818", unlit: 0.07, shadow: 0.2 };

/* ─────────────────────────── Audio ─────────────────────────── */

function blip(ctx: AudioContext, at: number, f0: number, f1: number, dur: number, gain = 0.07, type: OscillatorType = "square") {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, at);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + dur);
  g.gain.setValueAtTime(gain, at);
  g.gain.setValueAtTime(gain, at + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(ctx.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}

/* ─────────────────────────── Component ─────────────────────────── */

type Bug = { id: string; x: number; y: number; dir: number; wait: number };
type Particle = { kind: "heart" | "zed" | "dot"; x: number; y: number; vx: number; vy: number; life: number };
type PetMode = "wander" | "chase" | "eat" | "love" | "sneeze" | "idle";

export interface UptimePetProps {
  /** The pet's name, shown on screen and in the panel. */
  name?: string;
  /** Uptime percentage over your window, e.g. 99.95. */
  uptime: number;
  /** p95 latency in milliseconds. */
  latency: number;
  /** Error rate percentage, e.g. 0.4. */
  errorRate: number;
  /** Open incidents. Each one crawls around the screen as a bug. */
  incidents?: PetIncident[];
  /** Called when the pet eats an incident's bug. Remove it from `incidents`. */
  onAcknowledge?: (id: string) => void;
  /** Latency at or under this is healthy (ms). */
  latencyBudget?: number;
  /** Quiet hours: the pet sleeps. */
  asleep?: boolean;
  shell?: PetShell;
  sound?: boolean;
  haptics?: boolean;
  /** Show the metrics panel beside the device. */
  showPanel?: boolean;
  className?: string;
}

export function UptimePet({
  name = "Pip",
  uptime,
  latency,
  errorRate,
  incidents = [],
  onAcknowledge,
  latencyBudget = 300,
  asleep = false,
  shell = "graphite",
  sound = false,
  haptics = true,
  showPanel = true,
  className,
}: UptimePetProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const mood = moodFor({ uptime, latency, errorRate }, { latencyBudget, asleep });
  const SH = SHELLS[shell] ?? SHELLS.graphite;

  const canvasRef = React.useRef(null as HTMLCanvasElement | null);
  const deviceRef = React.useRef(null as HTMLDivElement | null);
  const [page, setPage] = React.useState(0);
  const [pressed, setPressed] = React.useState(null as string | null);
  const [announce, setAnnounce] = React.useState("");

  const live = React.useRef({ mood, uptime, latency, errorRate, incidents, latencyBudget, name, page });
  live.current = { mood, uptime, latency, errorRate, incidents, latencyBudget, name, page };
  const ackRef = React.useRef(onAcknowledge);
  ackRef.current = onAcknowledge;
  const soundRef = React.useRef(sound);
  soundRef.current = sound;

  const sim = React.useRef({
    x: 26, y: GROUND - PET_H, dir: 1, hop: 0, frame: 0, mode: "wander" as PetMode, modeT: 0,
    target: null as string | null, bugs: [] as Bug[], eaten: new Set([] as string[]),
    parts: [] as Particle[], tick: 0, blinkT: 0, pageT: 0,
  });
  const target = React.useRef(new Uint8Array(W * H));
  const level = React.useRef(new Float32Array(W * H));
  const reduced = React.useRef(false);
  const visible = React.useRef(true);

  const audio = React.useRef(null as AudioContext | null);
  const ac = () => {
    if (!soundRef.current || typeof window === "undefined") return null;
    if (!audio.current) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      audio.current = new AC();
    }
    if (audio.current.state === "suspended") void audio.current.resume();
    return audio.current;
  };
  const sfx = React.useRef({
    click: () => { const c = ac(); if (c) blip(c, c.currentTime, 1400, 1400, 0.025, 0.04); },
    chomp: () => { const c = ac(); if (c) { const t = c.currentTime; blip(c, t, 320, 140, 0.06); blip(c, t + 0.09, 300, 120, 0.06); } },
    love: () => { const c = ac(); if (c) { const t = c.currentTime; [523, 659, 784, 1046].forEach((f, i) => blip(c, t + i * 0.07, f, f, 0.07, 0.05)); } },
    worse: () => { const c = ac(); if (c) { const t = c.currentTime; blip(c, t, 520, 260, 0.22, 0.06, "triangle"); } },
    better: () => { const c = ac(); if (c) { const t = c.currentTime; blip(c, t, 523, 523, 0.08, 0.05); blip(c, t + 0.09, 1046, 1046, 0.12, 0.05); } },
    alarm: () => { const c = ac(); if (c) { const t = c.currentTime; for (let i = 0; i < 3; i++) { blip(c, t + i * 0.24, 880, 880, 0.1, 0.06); blip(c, t + i * 0.24 + 0.11, 660, 660, 0.1, 0.06); } } },
    sneeze: () => { const c = ac(); if (c) blip(c, c.currentTime, 900, 200, 0.12, 0.04, "sawtooth"); },
  });
  const buzz = (p: number | number[]) => {
    if (!haptics || typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    try { navigator.vibrate(p); } catch { /* unsupported */ }
  };

  const put = (x: number, y: number) => {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && x < W && y >= 0 && y < H) target.current[y * W + x] = 1;
  };
  const blit = (bm: Bitmap, x: number, y: number, flip = false) => {
    for (let r = 0; r < bm.length; r++) {
      const row = bm[r];
      for (let c = 0; c < row.length; c++) {
        if (row[flip ? row.length - 1 - c : c] === "#") put(x + c, y + r);
      }
    }
  };
  const text = (s: string, x: number, y: number) => {
    let cx = x;
    for (const ch of s.toUpperCase()) {
      const g = FONT[ch] ?? FONT[" "];
      blit(g, cx, y);
      cx += 4;
    }
  };
  const textW = (s: string) => s.length * 4 - 1;

  const step = React.useCallback(() => {
    const s = sim.current;
    const L = live.current;
    const m = L.mood;
    s.tick++;
    s.frame ^= 1;

    const open = L.incidents.filter((i) => !s.eaten.has(i.id)).slice(0, 6);
    const ids = new Set(open.map((i) => i.id));
    s.bugs = s.bugs.filter((b) => ids.has(b.id));
    for (const inc of open) {
      if (!s.bugs.some((b) => b.id === inc.id)) {
        const fromLeft = Math.random() < 0.5;
        s.bugs.push({ id: inc.id, x: fromLeft ? -5 : W, y: GROUND - 3 - Math.floor(Math.random() * 3) * 7, dir: fromLeft ? 1 : -1, wait: 0 });
      }
    }
    for (const id of Array.from(s.eaten)) if (!L.incidents.some((i) => i.id === id)) s.eaten.delete(id);

    for (const b of s.bugs) {
      if (b.wait > 0) { b.wait--; continue; }
      b.x += b.dir * 0.5;
      if (b.x < 1) { b.x = 1; b.dir = 1; }
      if (b.x > W - 6) { b.x = W - 6; b.dir = -1; }
      if (Math.random() < 0.04) b.dir *= -1;
      if (Math.random() < 0.05) b.wait = 4 + Math.floor(Math.random() * 6);
    }

    const speed = m === "thriving" ? 1 : m === "okay" ? 0.6 : m === "sluggish" ? 0.2 : m === "sick" ? 0.35 : 0;
    s.modeT = Math.max(0, s.modeT - 1);

    if (s.mode === "chase") {
      const b = s.bugs.find((q) => q.id === s.target);
      if (!b) { s.mode = "wander"; s.target = null; }
      else {
        const mouth = s.x + PET_W / 2;
        const dx = b.x + 2.5 - mouth;
        if (Math.abs(dx) < 3) { s.mode = "eat"; s.modeT = 6; s.dir = dx >= 0 ? 1 : -1; }
        else { s.dir = dx > 0 ? 1 : -1; s.x += s.dir * Math.max(1.2, speed * 2); b.wait = 2; }
      }
    } else if (s.mode === "eat") {
      if (s.modeT === 3) {
        const b = s.bugs.find((q) => q.id === s.target);
        if (b) {
          s.bugs = s.bugs.filter((q) => q !== b);
          s.eaten.add(b.id);
          sfx.current.chomp();
          buzz([8, 30, 8]);
          s.parts.push({ kind: "heart", x: s.x + 4, y: s.y - 4, vx: 0, vy: -0.6, life: 10 });
          ackRef.current?.(b.id);
        }
      }
      if (s.modeT === 0) { s.mode = "wander"; s.target = null; }
    } else if (s.mode === "love") {
      if (s.tick % 3 === 0) s.parts.push({ kind: "heart", x: s.x + 2 + Math.random() * 7, y: s.y - 3, vx: (Math.random() - 0.5) * 0.4, vy: -0.7, life: 9 });
      s.hop = s.tick % 2 ? 2 : 0;
      if (s.modeT === 0) { s.mode = "wander"; s.hop = 0; }
    } else if (s.mode === "sneeze") {
      if (s.modeT === 2) {
        sfx.current.sneeze();
        for (let i = 0; i < 5; i++) s.parts.push({ kind: "dot", x: s.x + (s.dir > 0 ? PET_W : -1), y: s.y + 7, vx: s.dir * (1 + Math.random()), vy: (Math.random() - 0.6) * 0.8, life: 5 });
      }
      if (s.modeT === 0) s.mode = "wander";
    } else {
      if (m === "critical") {
        s.hop = Math.round(Math.sin(s.tick / 3) * 1.5) + 2;
      } else if (m === "asleep") {
        s.hop = 0;
        if (s.tick % 10 === 0) s.parts.push({ kind: "zed", x: s.x + PET_W - 2, y: s.y - 2, vx: 0.35, vy: -0.45, life: 14 });
      } else {
        if (s.mode === "idle") { if (s.modeT === 0) s.mode = "wander"; }
        else {
          s.x += s.dir * speed;
          if (s.x < 2) { s.x = 2; s.dir = 1; }
          if (s.x > W - PET_W - 2) { s.x = W - PET_W - 2; s.dir = -1; }
          if (Math.random() < 0.025) s.dir *= -1;
          if (Math.random() < (m === "sluggish" ? 0.06 : 0.03)) { s.mode = "idle"; s.modeT = 6 + Math.floor(Math.random() * 10); }
          if (m === "sick" && Math.random() < 0.03) { s.mode = "sneeze"; s.modeT = 4; }
        }
        s.hop = m === "thriving" && s.mode === "wander" && s.tick % 6 < 2 ? 2 : 0;
      }
    }

    s.parts = s.parts.filter((p) => {
      p.x += p.vx; p.y += p.vy; p.life--;
      return p.life > 0;
    });

    s.blinkT = s.blinkT > 0 ? s.blinkT - 1 : Math.random() < 0.04 ? 1 : 0;
    s.pageT++;
  }, []);

  const compose = React.useCallback(() => {
    const t = target.current;
    t.fill(0);
    const s = sim.current;
    const L = live.current;
    const m = L.mood;
    const blink = s.tick % 4 < 2;

    blit(m === "thriving" || m === "okay" || m === "asleep" ? ICON.heart : blink ? ICON.heartEmpty : ICON.heart, 1, 1);
    if (!(L.latency > L.latencyBudget && blink)) blit(ICON.hourglass, 11, 1);
    blit(ICON.bug, 21, 1);
    text(String(Math.min(9, s.bugs.length)), 30, 2);
    if (m === "critical") { if (blink) blit(ICON.alert, W - 8, 1); }
    else if (m === "asleep") blit(ICON.moon, W - 8, 1);
    else text(L.name.slice(0, 6), W - 1 - textW(L.name.slice(0, 6)), 2);
    for (let x = 0; x < W; x += 2) put(x, 9);

    for (const b of s.bugs) blit(BUG_FRAMES[(s.frame + (b.x | 0)) & 1], b.x, b.y);

    const px = Math.round(s.x);
    const py = GROUND - PET_H - s.hop;
    s.y = py;
    const flip = s.dir < 0;
    const face =
      s.mode === "eat" ? (s.modeT % 2 ? FACE.eat : FACE.chomp)
      : s.mode === "love" ? FACE.love
      : m === "critical" ? FACE.dead
      : m === "asleep" ? FACE.sleep
      : m === "sick" ? FACE.sick
      : m === "sluggish" ? FACE.sluggish
      : s.blinkT ? FACE.blink
      : m === "thriving" ? FACE.happy
      : FACE.okay;
    const antenna = m === "critical" ? ANTENNA.halo : m === "sick" || m === "sluggish" ? ANTENNA.droop : ANTENNA.up;
    const moving = (s.mode === "wander" || s.mode === "chase") && m !== "critical" && m !== "asleep";
    const feet = m === "critical" ? FEET.none : moving ? (s.frame ? FEET.a : FEET.b) : FEET.a;
    blit(antenna, px, py, flip);
    blit(BODY, px, py + 2);
    for (const [r, row] of face) blit([row], px, py + 2 + r, flip);
    blit(feet, px, py + 12, flip);
    if (m === "sluggish" && s.tick % 8 < 5) blit(DROP, px + (flip ? -2 : PET_W), py + 3 + ((s.tick % 8) >> 1));
    if (m === "sick" && s.frame) { put(px - 2, py + 6); put(px + PET_W + 1, py + 8); }

    for (const p of s.parts) {
      if (p.kind === "heart") blit(HEART, p.x, p.y);
      else if (p.kind === "zed") blit(ZED, p.x, p.y);
      else put(p.x, p.y);
    }

    for (let x = 0; x < W; x += 3) put(x, GROUND + 1);

    const pages = [
      `UP ${L.uptime >= 99.995 ? "100" : L.uptime.toFixed(2)}%`,
      `LAT ${Math.round(L.latency)}MS`,
      `ERR ${L.errorRate < 10 ? L.errorRate.toFixed(1) : Math.round(L.errorRate)}%`,
      MOOD_COPY[m].label,
    ];
    const pi = (L.page + Math.floor(s.pageT / 24)) % pages.length;
    const line = pages[pi];
    text(line, Math.round((W - textW(line)) / 2), H - 6);
  }, []);

  React.useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const g = cv.getContext("2d");
    if (!g) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = mq.matches;

    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting));
    io.observe(cv);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const lv = level.current;
    const tg = target.current;

    const paint = () => {
      const cell = 6;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const pw = W * cell * dpr;
      const ph = H * cell * dpr;
      if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
      const c = cell * dpr;
      const gap = Math.max(1, Math.round(c * 0.12));
      const sz = c - gap;
      const off = Math.max(1, Math.round(c * 0.28));
      g.fillStyle = LCD.bg;
      g.fillRect(0, 0, pw, ph);
      g.fillStyle = LCD.ink;
      g.globalAlpha = LCD.unlit;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g.fillRect(x * c, y * c, sz, sz);
      g.globalAlpha = 1;
      for (let i = 0; i < W * H; i++) {
        const v = lv[i];
        if (v < 0.02) continue;
        g.globalAlpha = v * LCD.shadow;
        g.fillRect((i % W) * c + off, ((i / W) | 0) * c + off, sz, sz);
      }
      for (let i = 0; i < W * H; i++) {
        const v = lv[i];
        if (v < 0.02) continue;
        g.globalAlpha = v * 0.92;
        g.fillRect((i % W) * c, ((i / W) | 0) * c, sz, sz);
      }
      g.globalAlpha = 1;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible.current || document.hidden) { last = now; return; }
      const dt = Math.min(100, now - last);
      last = now;
      acc += dt;
      let ticked = false;
      while (acc >= TICK_MS) {
        acc -= TICK_MS;
        if (!reduced.current) step();
        ticked = true;
      }
      if (ticked || reduced.current) compose();
      const up = 1 - Math.exp(-dt / 45);
      const down = 1 - Math.exp(-dt / 95);
      for (let i = 0; i < lv.length; i++) {
        const d = tg[i] - lv[i];
        if (d !== 0) lv[i] += d * (d > 0 ? up : down);
      }
      paint();
    };
    compose();
    for (let i = 0; i < lv.length; i++) lv[i] = tg[i];
    paint();
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [step, compose]);

  const prevMood = React.useRef(mood);
  React.useEffect(() => {
    const p = prevMood.current;
    if (p === mood) return;
    prevMood.current = mood;
    const rank = { thriving: 0, okay: 1, asleep: 1, sluggish: 2, sick: 3, critical: 4 } as { [k: string]: number };
    setAnnounce(`${name} is ${MOOD_COPY[mood].label.toLowerCase()}. ${MOOD_COPY[mood].line}`);
    if (mood === "critical") { sfx.current.alarm(); buzz([60, 60, 60, 60, 60]); }
    else if (rank[mood] > rank[p]) { sfx.current.worse(); buzz(30); }
    else if (mood !== "asleep") { sfx.current.better(); const s = sim.current; s.mode = "love"; s.modeT = 8; }
  }, [mood, name]);

  const press = (b: string) => {
    setPressed(b);
    window.setTimeout(() => setPressed((x) => (x === b ? null : x)), 140);
    sfx.current.click();
    buzz(6);
  };
  const feed = (id?: string) => {
    press("A");
    const s = sim.current;
    if (mood === "critical" || mood === "asleep") return;
    const bugs = s.bugs;
    if (!bugs.length) { s.mode = "love"; s.modeT = 6; sfx.current.love(); return; }
    const mouth = s.x + PET_W / 2;
    const b = id ? bugs.find((q) => q.id === id) : bugs.slice().sort((a, c) => Math.abs(a.x - mouth) - Math.abs(c.x - mouth))[0];
    if (!b) return;
    s.target = b.id;
    s.mode = "chase";
  };
  const pet = () => {
    press("B");
    const s = sim.current;
    if (mood === "critical") return;
    s.mode = "love";
    s.modeT = 10;
    sfx.current.love();
  };
  const cycle = () => {
    press("C");
    setPage((p) => p + 1);
    sim.current.pageT = 0;
  };

  const openCount = incidents.length;
  const tone =
    mood === "thriving" ? "text-emerald-500" : mood === "okay" ? "text-foreground"
    : mood === "sluggish" ? "text-amber-500" : mood === "asleep" ? "text-sky-500" : "text-red-500";
  const dot =
    mood === "thriving" ? "bg-emerald-500" : mood === "okay" ? "bg-foreground/60"
    : mood === "sluggish" ? "bg-amber-500" : mood === "asleep" ? "bg-sky-500" : "bg-red-500";

  const metrics = [
    { k: "Uptime", v: `${uptime.toFixed(uptime >= 99.995 ? 0 : 2)}%`, ok: uptime >= 99.9, warn: uptime >= 95, fill: Math.max(0, Math.min(1, (uptime - 90) / 10)) },
    { k: "Latency p95", v: `${Math.round(latency)} ms`, ok: latency <= latencyBudget, warn: latency < latencyBudget * 2, fill: Math.min(1, latency / (latencyBudget * 3)) },
    { k: "Error rate", v: `${errorRate.toFixed(errorRate < 10 ? 2 : 1)}%`, ok: errorRate < 1, warn: errorRate < 5, fill: Math.min(1, errorRate / 25) },
  ];

  const renderButton = (id: string, label: string, hint: string, onClick: () => void) => (
    <div key={id} className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        aria-label={hint}
        title={hint}
        className={cn(
          "size-9 rounded-full outline-none transition-transform duration-75 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2",
          pressed === id ? "translate-y-[2px]" : "",
        )}
        style={{
          background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.55), transparent 45%), ${SH.btn}`,
          boxShadow: pressed === id
            ? `inset 0 2px 3px rgba(0,0,0,.35), 0 1px 0 ${SH.btnEdge}`
            : `inset 0 -2px 2px rgba(0,0,0,.25), 0 3px 0 ${SH.btnEdge}, 0 5px 8px rgba(0,0,0,.35)`,
        }}
      />
      <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: SH.label }}>
        {label}
      </span>
    </div>
  );

  return (
    <div className={cn("flex w-full flex-col items-center gap-6 sm:flex-row sm:items-stretch sm:justify-center", className)}>
      <div
        ref={deviceRef}
        tabIndex={0}
        role="group"
        aria-label={`${name}, uptime pet. Press A to feed, B to pet, C for stats.`}
        onKeyDown={(e) => {
          const k = e.key.toLowerCase();
          if (k === "a") { e.preventDefault(); feed(); }
          else if (k === "b") { e.preventDefault(); pet(); }
          else if (k === "c") { e.preventDefault(); cycle(); }
        }}
        className="relative w-full max-w-[320px] shrink-0 select-none rounded-[34px] p-5 pb-6 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        style={{
          background: `linear-gradient(160deg, ${SH.from}, ${SH.to})`,
          boxShadow: `inset 0 1.5px 0 rgba(255,255,255,.28), inset 0 -3px 6px rgba(0,0,0,.25), 0 0 0 1px ${SH.edge}, 0 24px 48px -12px rgba(0,0,0,.45), 0 8px 16px -8px rgba(0,0,0,.35)`,
        }}
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.32em]" style={{ color: SH.label, textShadow: "0 1px 0 rgba(255,255,255,.18)" }}>
            Uptime·Pet
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={cn("size-1.5 rounded-full", mood === "critical" ? "animate-pulse" : "")}
              style={{
                background: mood === "critical" ? "#ff3b30" : mood === "asleep" ? "#60a5fa" : "#4ade80",
                boxShadow: `0 0 6px ${mood === "critical" ? "#ff3b30" : mood === "asleep" ? "#60a5fa" : "#4ade80"}`,
              }}
            />
          </span>
        </div>

        <div
          className="rounded-[14px] p-[10px]"
          style={{ background: "linear-gradient(180deg,#2a2c30,#1a1b1e)", boxShadow: "inset 0 2px 6px rgba(0,0,0,.6), 0 1px 0 rgba(255,255,255,.15)" }}
        >
          <div className="relative overflow-hidden rounded-[6px]" onClick={pet}>
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={`${name} is ${MOOD_COPY[mood].label.toLowerCase()}. ${openCount} open incident${openCount === 1 ? "" : "s"}.`}
              className="block aspect-[64/46] w-full cursor-pointer [image-rendering:pixelated]"
            />
            <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(125deg, rgba(255,255,255,.22) 0%, rgba(255,255,255,0) 38%), radial-gradient(120% 90% at 50% 50%, transparent 60%, rgba(0,0,0,.18))" }} />
          </div>
        </div>

        <div className="mt-5 flex items-end justify-center gap-7">
          {renderButton("A", "Feed", "Feed: eat a bug and acknowledge an incident (A)", () => feed())}
          {renderButton("B", "Pet", "Pet (B)", pet)}
          {renderButton("C", "Stats", "Cycle stats (C)", cycle)}
        </div>

        <div aria-hidden className="absolute bottom-4 right-6 grid grid-cols-4 gap-[3px] opacity-60">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="size-[3px] rounded-full" style={{ background: "rgba(0,0,0,.45)", boxShadow: "0 1px 0 rgba(255,255,255,.15)" }} />
          ))}
        </div>
      </div>

      {showPanel && (
        <div className="flex w-full max-w-[320px] flex-col rounded-2xl border bg-background p-4 shadow-sm sm:max-w-[300px]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-foreground">{name}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">· live</span>
            </div>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em]", tone)}>
              <span className={cn("size-1.5 rounded-full", dot, mood === "critical" && "animate-pulse")} />
              {MOOD_COPY[mood].label}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">{MOOD_COPY[mood].line}</p>

          <dl className="mt-4 space-y-3">
            {metrics.map((mt) => (
              <div key={mt.k}>
                <div className="flex items-baseline justify-between">
                  <dt className="text-[12.5px] text-muted-foreground">{mt.k}</dt>
                  <dd className={cn("font-mono text-[12.5px] tabular-nums", mt.ok ? "text-foreground" : mt.warn ? "text-amber-500" : "text-red-500")}>{mt.v}</dd>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-[width,background-color] duration-500", mt.ok ? "bg-emerald-500" : mt.warn ? "bg-amber-500" : "bg-red-500")}
                    style={{ width: `${Math.max(4, mt.fill * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </dl>

          <div className="mt-4 border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] text-muted-foreground">Open incidents</span>
              <span className={cn("font-mono text-[12.5px] tabular-nums", openCount ? "text-red-500" : "text-muted-foreground")}>{openCount}</span>
            </div>
            {openCount > 0 ? (
              <ul className="mt-2 space-y-1">
                {incidents.slice(0, 3).map((inc) => (
                  <li key={inc.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-2 py-1.5">
                    <span className="flex min-w-0 items-center gap-2">
                      <svg viewBox="0 0 7 7" className="size-3 shrink-0 text-red-500" fill="currentColor" aria-hidden shapeRendering="crispEdges">
                        {ICON.bug.flatMap((row, y) => Array.from(row).map((ch, x) => (ch === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)))}
                      </svg>
                      <span className="truncate text-[12.5px] text-foreground">{inc.label ?? inc.id}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => feed(inc.id)}
                      disabled={mood === "critical" || mood === "asleep"}
                      className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                    >
                      Feed
                    </button>
                  </li>
                ))}
                {openCount > 3 && <li className="px-2 text-[11.5px] text-muted-foreground">+{openCount - 3} more</li>}
              </ul>
            ) : (
              <p className="mt-1 text-[12px] text-muted-foreground/80">No bugs. {name} is well fed.</p>
            )}
          </div>

          <p className="mt-auto pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            <kbd className="rounded border px-1">A</kbd> feed · <kbd className="rounded border px-1">B</kbd> pet · <kbd className="rounded border px-1">C</kbd> stats
          </p>
          <span className="sr-only" aria-live="polite">{announce}</span>
        </div>
      )}
    </div>
  );
}

export default UptimePet;
