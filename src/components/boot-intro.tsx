"use client";

import { useEffect, useRef } from "react";
import { ArchWordmark } from "@/components/arch-wordmark";
import { BootConstellation } from "@/components/boot-constellation";
import { NetworkField } from "@/components/network-field";
import { assistantBaseUrl, waitForAssistant } from "@/lib/assistant";
import { BOOT_STORAGE_KEY } from "@/lib/boot";
import { BOOT_DONE_EVENT, setScrollLock } from "@/lib/motion";

/** The intro always runs at least this long from page load (the light sweep ends at ~4s). */
const MIN_INTRO_MS = 4200;
/** Hard cap from page load: never hold a visitor longer than this, even if the backend is asleep. */
const MAX_WAIT_MS = 8000;
/** Exit animation length (see .boot.is-exiting in motion.css). */
const EXIT_MS = 1850;
/**
 * The ID card textures are real but heavy main-thread work. Start them once the
 * logo has formed and the light sweep is nearly done (the sequence is mostly
 * idle then), so they never stutter the logo animation.
 */
const TEXTURES_AT_MS = 3700;

type TaskKey = "fonts" | "textures" | "assistant" | "page";
type TaskResult = "ok" | "skip" | "wait";

const TASKS: { key: TaskKey; label: string }[] = [
  { key: "fonts", label: "Loaded typefaces" },
  { key: "page", label: "Fetched images & assets" },
  { key: "assistant", label: "Woke portfolio assistant (FastAPI)" },
  { key: "textures", label: "Rendered ID card textures" },
];

const TAGS: Record<TaskResult | "pending", string> = { pending: "[  ··  ]", ok: "[  OK  ]", skip: "[ SKIP ]", wait: "[ WAIT ]" };

/**
 * First-visit boot sequence (once per session; add ?boot to the URL to force it).
 *
 * The visual sequence is server-rendered HTML animated by CSS (motion.css,
 * "Boot intro"), so it starts on the first paint, before any JavaScript loads,
 * and doesn't wait for the backend: stars fly in from the background
 * constellation and link up into the Arch logo inside "M▲RK", the outline
 * draws, the logo fills, and a light sweep crosses the word.
 *
 * This script adds what needs data: the drifting background constellation, real
 * task timings in the log, and the exit, which waits for the real work
 * (min MIN_INTRO_MS, max MAX_WAIT_MS from page load).
 *
 * Without JavaScript, CSS wipes the overlay away at 10s; a skip (key, click,
 * wheel, touch) recorded by the <head> script exits immediately.
 */
export function BootIntro() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const html = document.documentElement;
    if (!root || html.dataset.boot !== "play") return;
    try {
      return runBoot(root, html);
    } catch (error) {
      console.error("[boot] intro script failed; ending the intro:", error);
      endBootNow(root, html);
    }
  }, []);

  return <div ref={rootRef} className="boot" aria-hidden="true">
    <div className="boot-grid" />
    <NetworkField duringBoot className="boot-field" />
    <div className="boot-center">
      <ArchWordmark className="boot-word" animated glyphExtra={<><BootConstellation /><span className="boot-shock" /></>} />
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

function runBoot(root: HTMLDivElement, html: HTMLElement): () => void {
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
    later(finish, 700);
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
  if (onHome) tasks.push(timed("textures", new Promise<void>((resolve) => later(() => resolve(), TEXTURES_AT_MS - performance.now()))
    .then(() => import("@/components/id-card-textures"))
    .then((module) => module.getIdCardFaceCanvases())));
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
    // Freeze the progress value (on the meter, which owns it) as the underlying
    // value, so the exit animation runs from here to 100% instead of from 0.
    const meter = root.querySelector<HTMLElement>(".boot-meter");
    const current = meter ? getComputedStyle(meter).getPropertyValue("--boot-progress").trim() : "";
    if (meter && current) meter.style.setProperty("--boot-progress", current);
    root.classList.add("is-exiting");
    later(finish, EXIT_MS);
  };

  Promise.allSettled(tasks).then(() => { if (!abort.signal.aborted) later(exit, MIN_INTRO_MS - performance.now()); });
  later(exit, MAX_WAIT_MS - performance.now());
  later(finish, MAX_WAIT_MS - performance.now() + EXIT_MS + 1500); // watchdog

  const skip = () => exit();
  const events = ["keydown", "pointerdown", "wheel", "touchstart"] as const;
  events.forEach((type) => window.addEventListener(type, skip, { passive: true }));

  return () => {
    abort.abort();
    timers.forEach((timer) => window.clearTimeout(timer));
    events.forEach((type) => window.removeEventListener(type, skip));
    root.classList.remove("is-exiting");
    root.querySelector<HTMLElement>(".boot-meter")?.style.removeProperty("--boot-progress");
    if (!finished) { html.style.overflow = previousOverflow; setScrollLock(false); }
  };
}
