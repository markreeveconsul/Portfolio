"use client";

import { useEffect, useRef } from "react";
import { ArchWordmark } from "@/components/arch-wordmark";
import { BootConstellation } from "@/components/boot-constellation";
import { NetworkField } from "@/components/network-field";
import { BOOT_STORAGE_KEY } from "@/lib/boot";
import { BOOT_DONE_EVENT, BOOT_REVEAL_EVENT, HERO_CARD_READY_EVENT, setScrollLock } from "@/lib/motion";

/** The intro always runs at least this long from page load (the light sweep ends at ~4s). */
const MIN_INTRO_MS = 4200;
/** Safety cap for a broken or unsupported critical renderer. */
const MAX_WAIT_MS = 12000;
/**
 * Fallback only: the overlay is removed when its wipe animation actually ends
 * (animationend). This timer covers browsers that never fire the event.
 */
const EXIT_FALLBACK_MS = 3200;
/**
 * Start card preparation after the main logo choreography, then keep the page
 * covered until its first visible renderer frame is ready.
 */
const TEXTURES_AT_MS = 2700;

type TaskKey = "fonts" | "textures" | "page" | "card";
type TaskResult = "ok" | "skip" | "wait";

const TASKS: { key: TaskKey; label: string }[] = [
  { key: "fonts", label: "Loaded typefaces" },
  { key: "page", label: "Loaded first-screen assets" },
  { key: "textures", label: "Rendered ID card textures" },
  { key: "card", label: "Prepared hero card renderer" },
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
 * Without JavaScript, CSS wipes the overlay away after the 12s safety cap; a skip (key, click,
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
      <p data-state="ok"><b className="is-colon">::</b> Preparing portfolio…</p>
      {TASKS.map((task) => <p key={task.key} data-task={task.key} data-state="pending"><b>{TAGS.pending}</b> {task.label} <span className="boot-dim" data-time="" /></p>)}
      <p data-task="started" data-state="pending"><b>{TAGS.pending}</b> Intro complete <span className="boot-dim" data-time="" /></p>
    </div>
    <div className="boot-meter">
      <span className="boot-cmd">ASSET CHECKS</span>
      <span className="boot-pac"><span className="boot-pac-trail" /><span className="boot-pac-dots" /><span className="boot-pac-man" /></span>
      <span className="boot-percent" />
      <span className="boot-hint">Click to skip</span>
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

  // Hand the page back only once the overlay has actually slid away, so the
  // wipe is always seen, however busy the page is.
  const onWipeEnd = (event: AnimationEvent) => {
    if (event.target === root && event.animationName === "boot-wipe") finish();
  };
  root.addEventListener("animationend", onWipeEnd);

  // Let the page start appearing underneath as the overlay slides away; otherwise
  // it would slide off to reveal an empty dark page that looks just like itself.
  const reveal = () => {
    if (html.dataset.bootReveal) return;
    html.dataset.bootReveal = "1";
    window.dispatchEvent(new Event(BOOT_REVEAL_EVENT));
  };

  // A skip that happened before this script loaded: CSS is already wiping the overlay away.
  if (html.dataset.bootSkip) {
    reveal();
    later(finish, EXIT_FALLBACK_MS);
    return () => { timers.forEach((timer) => window.clearTimeout(timer)); root.removeEventListener("animationend", onWipeEnd); };
  }

  html.style.overflow = "hidden";
  setScrollLock(true);

  // ---------- Real tasks, reported in the log ----------
  const line = (key: string) => root.querySelector<HTMLElement>(`[data-task="${key}"]`);
  const meter = root.querySelector<HTMLElement>(".boot-meter");
  const activeTaskKeys = TASKS
    .filter(({ key }) => onHome || (key !== "textures" && key !== "card"))
    .map(({ key }) => key);
  const completedTasks = new Set<TaskKey>();
  meter?.style.setProperty("--boot-progress", "0");
  const report = (key: string, result: TaskResult, note?: string) => {
    const element = line(key);
    if (!element || element.dataset.state !== "pending") return;
    element.dataset.state = result;
    const tag = element.querySelector("b");
    if (tag) tag.textContent = TAGS[result];
    const time = element.querySelector<HTMLElement>("[data-time]");
    if (time) time.textContent = note ?? `${Math.round(performance.now())}ms`;
    if (key !== "started") {
      if (result === "wait") completedTasks.delete(key as TaskKey);
      else completedTasks.add(key as TaskKey);
      meter?.style.setProperty("--boot-progress", String(completedTasks.size / activeTaskKeys.length));
    }
  };
  const timed = (key: TaskKey, work: Promise<unknown>) => {
    const startedAt = performance.now();
    return work
      .then(() => report(key, "ok", `${Math.round(performance.now() - startedAt)}ms`))
      .catch(() => report(key, "skip", "unavailable"));
  };

  const onHome = Boolean(document.querySelector(".hero"));
  if (!onHome) {
    line("textures")?.remove();
    line("card")?.remove();
  }

  const pageAssets = () => new Promise<void>((resolve) => {
    const decodeHeroImages = () => {
      const images = Array.from(document.querySelectorAll<HTMLImageElement>(".hero img"));
      Promise.all(images.map((image) => image.decode?.().catch(() => undefined) ?? Promise.resolve())).then(() => resolve());
    };
    if (document.readyState === "complete") decodeHeroImages();
    else window.addEventListener("load", decodeHeroImages, { once: true });
  });
  const tasks: Promise<unknown>[] = [
    timed("fonts", document.fonts.ready),
    timed("page", pageAssets()),
  ];
  // Generate the same cached textures the card consumes, without delaying the assistant.
  if (onHome) {
    tasks.push(timed("textures", new Promise<void>((resolve) => later(() => resolve(), TEXTURES_AT_MS - performance.now()))
      .then(() => import("@/components/id-card-textures"))
      .then((module) => module.getIdCardFaceCanvases())));
    tasks.push(new Promise<void>((resolve) => {
      if (html.dataset.heroCardReady === "1") { report("card", "ok"); resolve(); return; }
      const timeout = window.setTimeout(() => {
        window.removeEventListener(HERO_CARD_READY_EVENT, ready);
        report("card", "skip", "safe fallback");
        resolve();
      }, Math.max(0, MAX_WAIT_MS - performance.now()));
      const ready = () => {
        window.clearTimeout(timeout);
        window.removeEventListener(HERO_CARD_READY_EVENT, ready);
        report("card", "ok");
        resolve();
      };
      window.addEventListener(HERO_CARD_READY_EVENT, ready, { once: true });
    }));
  }

  // ---------- Exit ----------
  const exit = (skipped = false) => {
    if (exiting || finished) return;
    exiting = true;
    activeTaskKeys.forEach((key) => {
      if (line(key)?.dataset.state === "pending") {
        report(key, "skip", skipped ? "skipped by visitor" : "timed out; using fallback");
      }
    });
    abort.abort();
    report("started", "ok", `${Math.round(performance.now() - mountedAt)}ms elapsed`);
    root.classList.add("is-exiting");
    // The wipe starts 0.85s in; the hero entrance has its own 0.35s delay, so the
    // copy begins rising just as the overlay starts to lift.
    later(reveal, 500);
    later(finish, EXIT_FALLBACK_MS);
  };

  Promise.allSettled(tasks).then(() => { if (!abort.signal.aborted) later(exit, MIN_INTRO_MS - performance.now()); });
  later(exit, MAX_WAIT_MS - performance.now());
  later(finish, MAX_WAIT_MS - performance.now() + EXIT_FALLBACK_MS + 1500); // watchdog

  // Skip on a click or tap only, so scrolling, mouse movement or a drag never ends the intro.
  const skip = () => exit(true);
  const events = ["click"] as const;
  events.forEach((type) => window.addEventListener(type, skip, { passive: true }));

  return () => {
    abort.abort();
    timers.forEach((timer) => window.clearTimeout(timer));
    events.forEach((type) => window.removeEventListener(type, skip));
    root.removeEventListener("animationend", onWipeEnd);
    root.classList.remove("is-exiting");
    root.querySelector<HTMLElement>(".boot-meter")?.style.removeProperty("--boot-progress");
    if (!finished) { html.style.overflow = previousOverflow; setScrollLock(false); }
  };
}
