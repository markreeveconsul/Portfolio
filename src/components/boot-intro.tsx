"use client";

import { useEffect, useRef } from "react";
import { ArchWordmark } from "@/components/arch-wordmark";
import { assistantBaseUrl, waitForAssistant } from "@/lib/assistant";
import { BOOT_STORAGE_KEY } from "@/lib/boot";
import { BOOT_DONE_EVENT, setScrollLock } from "@/lib/motion";

/** The intro always runs at least this long from page load (the light sweep ends at ~4s). */
const MIN_INTRO_MS = 4200;
/** Hard cap from page load: never hold a visitor longer than this, even if the backend is asleep. */
const MAX_WAIT_MS = 8000;
/** Exit animation length (see .boot.is-exiting in motion.css). */
const EXIT_MS = 1850;
const PARTICLES = 120;

type TaskKey = "fonts" | "textures" | "assistant" | "page";
type TaskResult = "ok" | "skip" | "wait";

const TASKS: { key: TaskKey; label: string }[] = [
  { key: "fonts", label: "Loaded typefaces" },
  { key: "textures", label: "Rendered ID card textures" },
  { key: "assistant", label: "Woke portfolio assistant (FastAPI)" },
  { key: "page", label: "Fetched images & assets" },
];

const TAGS: Record<TaskResult | "pending", string> = { pending: "[  ··  ]", ok: "[  OK  ]", skip: "[ SKIP ]", wait: "[ WAIT ]" };

/**
 * First-visit boot sequence (once per session; add ?boot to the URL to force it).
 *
 * The whole visual sequence is CSS (motion.css, "Boot intro"), so it starts on
 * the first paint, before any JavaScript loads, and keeps running even when the
 * main thread is busy hydrating the page or the backend is still waking up.
 * This script only adds what needs data: real task timings in the log, the
 * particle swarm (when it mounts early enough to sync), and the exit, which
 * waits for the real work (min MIN_INTRO_MS, max MAX_WAIT_MS from page load).
 *
 * Without JavaScript, CSS wipes the overlay away at 10s; a skip (key, click,
 * wheel, touch) recorded by the <head> script exits immediately, even before
 * this script loads.
 */
export function BootIntro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const html = document.documentElement;
    if (!root || html.dataset.boot !== "play") return;
    try {
      return runBoot(root, canvasRef.current, html);
    } catch (error) {
      console.error("[boot] intro script failed; ending the intro:", error);
      endBootNow(root, html);
    }
  }, []);

  return <div ref={rootRef} className="boot" aria-hidden="true">
    <div className="boot-grid" />
    <canvas ref={canvasRef} className="boot-canvas" />
    <div className="boot-center">
      <ArchWordmark className="boot-word" animated glyphExtra={<span className="boot-shock" />} />
      <span className="boot-sub">Reeve Consul</span>
    </div>
    <div className="boot-log">
      <p data-state="ok"><b className="is-colon">::</b> Synchronizing package databases… <span className="boot-dim">consul.dev</span></p>
      {TASKS.map((task) => <p key={task.key} data-task={task.key} data-state="pending"><b>{TAGS.pending}</b> {task.label} <span className="boot-dim" data-time="" /></p>)}
      <p data-task="started" data-state="pending"><b>{TAGS.pending}</b> Started consul.dev <span className="boot-dim" data-time="" /></p>
    </div>
    <div className="boot-meter">
      <span className="boot-cmd">pacman -Syu</span>
      <span className="boot-pac"><span className="boot-pac-trail" /><span className="boot-pac-dots" /><span className="boot-pac-man" /></span>
      <span className="boot-percent" />
      <span className="boot-hint">Press any key to skip</span>
    </div>
    <span className="boot-edge" />
  </div>;
}

/** Immediately hands the page back. */
function endBootNow(root: HTMLElement, html: HTMLElement) {
  root.style.display = "none";
  html.style.overflow = "";
  html.dataset.boot = "done";
  try { sessionStorage.setItem(BOOT_STORAGE_KEY, "1"); } catch { /* private mode */ }
  setScrollLock(false);
  window.dispatchEvent(new Event(BOOT_DONE_EVENT));
}

function runBoot(root: HTMLDivElement, canvas: HTMLCanvasElement | null, html: HTMLElement): () => void {
  const mountedAt = performance.now(); // ms since page load; the CSS sequence has been running this long
  const abort = new AbortController();
  const timers: number[] = [];
  const later = (callback: () => void, ms: number) => { timers.push(window.setTimeout(callback, Math.max(0, ms))); };
  let finished = false;
  let exiting = false;
  const previousOverflow = html.style.overflow;
  console.info(`[boot] intro script running (${Math.round(mountedAt)}ms after page load)`);

  const finish = () => {
    if (finished) return;
    finished = true;
    html.dataset.boot = "done";
    html.style.overflow = previousOverflow;
    try { sessionStorage.setItem(BOOT_STORAGE_KEY, "1"); } catch { /* private mode */ }
    setScrollLock(false);
    window.dispatchEvent(new Event(BOOT_DONE_EVENT));
  };

  // A skip that happened before this script loaded: CSS is already wiping the overlay away.
  if (html.dataset.bootSkip) {
    later(finish, 900);
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }

  html.style.overflow = "hidden";
  setScrollLock(true);

  // ---------- Real tasks, reported in the log ----------
  const line = (key: string) => root.querySelector<HTMLElement>(`[data-task="${key}"]`);
  const report = (key: string, result: TaskResult, note?: string) => {
    const element = line(key);
    if (!element || element.dataset.state !== "pending") return;
    element.dataset.state = result;
    const tag = element.querySelector("b");
    if (tag) tag.textContent = TAGS[result];
    const time = element.querySelector<HTMLElement>("[data-time]");
    if (time) time.textContent = note ?? `${Math.round(performance.now())}ms`;
  };
  const timed = (key: TaskKey, work: Promise<unknown>) => work.then(() => report(key, "ok")).catch(() => report(key, "skip", "unavailable"));

  const onHome = Boolean(document.querySelector(".hero"));
  const apiBase = assistantBaseUrl();
  if (!onHome) line("textures")?.remove();
  if (!apiBase) line("assistant")?.remove();

  const tasks: Promise<unknown>[] = [
    timed("fonts", document.fonts.ready),
    timed("page", document.readyState === "complete" ? Promise.resolve() : new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true }))),
  ];
  // Same cached promise the hero card uses, so this work isn't done twice.
  if (onHome) tasks.push(timed("textures", import("@/components/id-card-textures").then((module) => module.getIdCardFaceCanvases())));
  // The backend gets until the cap; the animation never waits for it to start.
  if (apiBase) tasks.push(waitForAssistant(apiBase, Date.now() + (MAX_WAIT_MS - mountedAt), abort.signal).then((status) => {
    if (status === "awake") report("assistant", "ok");
    else if (status === "offline") report("assistant", "skip", "offline");
    else report("assistant", "wait", "still waking, continuing");
  }));

  // ---------- Exit ----------
  const exit = () => {
    if (exiting || finished) return;
    exiting = true;
    TASKS.forEach(({ key }) => report(key, "wait", "continuing in background"));
    report("started", "ok");
    // Freeze the progress value as the underlying value, so the exit animation runs from here to 100%.
    const current = getComputedStyle(root).getPropertyValue("--boot-progress").trim();
    if (current) root.style.setProperty("--boot-progress", current);
    root.classList.add("is-exiting");
    later(finish, EXIT_MS);
  };

  Promise.allSettled(tasks).then(() => { if (!abort.signal.aborted) later(exit, MIN_INTRO_MS - performance.now()); });
  later(exit, MAX_WAIT_MS - performance.now());
  later(finish, MAX_WAIT_MS - performance.now() + EXIT_MS + 1500); // watchdog

  const skip = () => exit();
  const events = ["keydown", "pointerdown", "wheel", "touchstart"] as const;
  events.forEach((type) => window.addEventListener(type, skip, { passive: true }));

  // ---------- Particle swarm that assembles the Arch logo ----------
  // Only when this script is early enough to sync with the CSS outline draw (starts at 1.25s).
  const stopSwarm = canvas && mountedAt < 900 ? startSwarm(root, canvas, mountedAt) : () => {};

  return () => {
    abort.abort();
    timers.forEach((timer) => window.clearTimeout(timer));
    events.forEach((type) => window.removeEventListener(type, skip));
    stopSwarm();
    root.classList.remove("is-exiting");
    root.style.removeProperty("--boot-progress");
    if (!finished) { html.style.overflow = previousOverflow; setScrollLock(false); }
  };
}

/**
 * Particles fly in from around the screen and link up along the logo's outline,
 * landing just as the CSS stroke draws over them (~1.65s), then fade out.
 */
function startSwarm(root: HTMLElement, canvas: HTMLCanvasElement, mountedAt: number) {
  const ctx = canvas.getContext("2d");
  const path = root.querySelector<SVGPathElement>(".arch-glyph path");
  const svg = path?.ownerSVGElement;
  if (!ctx || !path || !svg) return () => {};
  const length = path.getTotalLength();
  if (!length) return () => {};
  // Sample in the path's own coordinates (pathLength=1 only affects dash maths).
  const targets = Array.from({ length: PARTICLES }, (_, index) => path.getPointAtLength((index / PARTICLES) * length));
  const particles = targets.map((_, index) => ({
    angle: (index / PARTICLES) * Math.PI * 2 + Math.random() * 0.8,
    radius: 0.35 + Math.random() * 0.45,
    delay: Math.random() * 0.3,
    size: Math.random() < 0.12 ? 1.9 : 1.15,
  }));
  const assembleStart = mountedAt + 50;
  const assembleEnd = 1650; // ms after page load
  const fadeStart = 1750;
  const fadeEnd = 2350;
  let frame = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const draw = () => {
    const now = performance.now();
    const width = window.innerWidth;
    const height = window.innerHeight;
    ctx.clearRect(0, 0, width, height);
    if (now > fadeEnd) return; // done: leave the canvas clear and stop
    frame = requestAnimationFrame(draw);
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const progress = Math.min(1, Math.max(0, (now - assembleStart) / (assembleEnd - assembleStart)));
    const fade = now < fadeStart ? 1 : Math.max(0, 1 - (now - fadeStart) / (fadeEnd - fadeStart));
    const scatter = Math.max(width, height) * 0.55;
    const points = particles.map((particle, index) => {
      const target = new DOMPoint(targets[index].x, targets[index].y).matrixTransform(matrix);
      const local = Math.min(1, Math.max(0, (progress - particle.delay) / (1 - particle.delay)));
      const eased = 1 - (1 - local) ** 4;
      const sx = width / 2 + Math.cos(particle.angle) * scatter * particle.radius;
      const sy = height / 2 + Math.sin(particle.angle) * scatter * particle.radius * 0.7;
      return { x: sx + (target.x - sx) * eased, y: sy + (target.y - sy) * eased, eased };
    });
    ctx.lineWidth = 1;
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < Math.min(points.length, i + 9); j += 1) {
        const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
        if (distance > 90) continue;
        ctx.strokeStyle = `rgba(168,230,240,${((1 - distance / 90) * 0.32 * fade).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[j].x, points[j].y);
        ctx.stroke();
      }
    }
    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, particles[index].size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(236,234,228,${((0.35 + point.eased * 0.6) * fade).toFixed(3)})`;
      ctx.fill();
    });
  };
  resize();
  window.addEventListener("resize", resize);
  canvas.classList.add("is-active");
  frame = requestAnimationFrame(draw);
  return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); };
}
