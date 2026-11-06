"use client";

import { useEffect, useRef } from "react";
import { ArchWordmark } from "@/components/arch-wordmark";
import { assistantBaseUrl, waitForAssistant } from "@/lib/assistant";
import { BOOT_STORAGE_KEY } from "@/lib/boot";
import { BOOT_DONE_EVENT, gsap, setScrollLock } from "@/lib/motion";

/** The intro animation always runs at least this long (the light sweep ends at ~4.1s). */
const MIN_INTRO_MS = 4200;
/** Hard cap: never hold a visitor longer than this, even if the backend is asleep. */
const MAX_WAIT_MS = 8000;
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
 * First-visit boot sequence (once per session). Each log line is a real task
 * with its real timing, and the intro lasts as long as they take: at least
 * MIN_INTRO_MS, at most MAX_WAIT_MS. A particle network assembles the Arch
 * logo, which then draws itself in and fills; a pacman progress bar
 * (pacman.conf's ILoveCandy) eats its way across the bottom.
 *
 * The overlay is server-rendered and shown only when the pre-paint script set
 * <html data-boot="play">. Any key, click, scroll, or touch skips it, and a CSS
 * failsafe hides it even if this script never runs.
 */
export function BootIntro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const html = document.documentElement;
    if (!root || !canvas || html.dataset.boot !== "play") return;

    const started = performance.now();
    const deadline = Date.now() + MAX_WAIT_MS;
    const abort = new AbortController();
    let finished = false;
    let exiting = false;
    const previousOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    setScrollLock(true);
    root.classList.add("is-live"); // CSS keeps the content hidden until the animation owns it

    const finish = () => {
      if (finished) return;
      finished = true;
      html.dataset.boot = "done";
      html.style.overflow = previousOverflow;
      try { sessionStorage.setItem(BOOT_STORAGE_KEY, "1"); } catch { /* private mode */ }
      setScrollLock(false);
      window.dispatchEvent(new Event(BOOT_DONE_EVENT));
    };

    // ---------- Real tasks, reported in the log ----------
    const line = (key: string) => root.querySelector<HTMLElement>(`[data-task="${key}"]`);
    const report = (key: TaskKey, result: TaskResult, note?: string) => {
      const element = line(key);
      if (!element) return;
      element.dataset.state = result;
      element.querySelector("b")!.textContent = TAGS[result];
      const time = element.querySelector<HTMLElement>("[data-time]");
      if (time) time.textContent = note ?? `${Math.round(performance.now() - started)}ms`;
    };
    const timed = <T,>(key: TaskKey, work: Promise<T>, judge: (value: T) => TaskResult = () => "ok") =>
      work.then((value) => report(key, judge(value))).catch(() => report(key, "skip", "unavailable"));

    const onHome = Boolean(document.querySelector(".hero"));
    const apiBase = assistantBaseUrl();
    if (!onHome) line("textures")?.remove();
    if (!apiBase) line("assistant")?.remove();
    const taskCount = root.querySelectorAll("[data-task]:not([data-task='started'])").length;

    const tasks: Promise<unknown>[] = [
      timed("fonts", document.fonts.ready),
      timed("page", document.readyState === "complete" ? Promise.resolve() : new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true }))),
    ];
    // Same cached promise the hero card uses, so this work isn't done twice.
    if (onHome) tasks.push(timed("textures", import("@/components/id-card-textures").then((module) => module.getIdCardFaceCanvases())));
    if (apiBase) tasks.push(waitForAssistant(apiBase, deadline, abort.signal).then((status) => {
      if (status === "awake") report("assistant", "ok");
      else if (status === "offline") report("assistant", "skip", "offline");
      else report("assistant", "wait", "still waking, continuing");
    }));
    let done = 0;
    tasks.forEach((task) => task.finally(() => { done += 1; }));
    const allTasks = Promise.allSettled(tasks);

    // ---------- Particle network that assembles the Arch logo ----------
    const ctx = canvas.getContext("2d");
    const path = root.querySelector<SVGPathElement>(".arch-glyph path");
    const svg = path?.ownerSVGElement ?? null;
    const length = path?.getTotalLength() ?? 0;
    const targets = length && path ? Array.from({ length: PARTICLES }, (_, index) => path.getPointAtLength((index / PARTICLES) * length)) : [];
    const particles = targets.map((_, index) => {
      const angle = (index / PARTICLES) * Math.PI * 2 + Math.random() * 0.8;
      const radius = 0.35 + Math.random() * 0.45;
      return { angle, radius, delay: Math.random() * 0.35, size: Math.random() < 0.12 ? 1.9 : 1.15 };
    });
    const swarm = { assemble: 0, fade: 1 };
    let frame = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = () => {
      frame = requestAnimationFrame(draw);
      if (!ctx || !svg) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);
      if (swarm.fade <= 0.001) return;
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const scatter = Math.max(width, height) * 0.55;
      const points = particles.map((particle, index) => {
        const target = new DOMPoint(targets[index].x, targets[index].y).matrixTransform(matrix);
        const local = gsap.utils.clamp(0, 1, (swarm.assemble - particle.delay) / (1 - particle.delay));
        const eased = 1 - (1 - local) ** 4;
        const sx = width / 2 + Math.cos(particle.angle) * scatter * particle.radius;
        const sy = height / 2 + Math.sin(particle.angle) * scatter * particle.radius * 0.7;
        return { x: sx + (target.x - sx) * eased, y: sy + (target.y - sy) * eased, eased };
      });
      // Links: nearby particles connect, like the hero's network field.
      ctx.lineWidth = 1;
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < Math.min(points.length, i + 9); j += 1) {
          const a = points[i];
          const b = points[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance > 90) continue;
          ctx.strokeStyle = `rgba(168,230,240,${((1 - distance / 90) * 0.32 * swarm.fade).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      points.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, particles[index].size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(236,234,228,${((0.35 + point.eased * 0.6) * swarm.fade).toFixed(3)})`;
        ctx.fill();
      });
    };
    resize();
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(draw);

    // ---------- Timeline ----------
    const letters = root.querySelectorAll(".boot-word .arch-letter:not(.arch-glyph) > span");
    const gradient = root.querySelector("linearGradient");
    const progress = { value: 0 };
    const percent = root.querySelector<HTMLElement>("[data-boot-percent]");
    const setProgress = () => {
      // Visual progress never outruns the real work: capped by the share of tasks finished.
      const cap = exiting ? 1 : 0.18 + (done / Math.max(1, taskCount)) * 0.72;
      const value = Math.min(progress.value, cap);
      root.style.setProperty("--boot-progress", value.toFixed(4));
      if (percent) percent.textContent = `${String(Math.round(value * 100)).padStart(2, "\u00a0")}%`;
    };
    gsap.ticker.add(setProgress);

    // Centre the shockwave ring on the Arch glyph (measured late, after web fonts settle the layout).
    function placeShock() {
      const shock = root!.querySelector<HTMLElement>(".boot-shock");
      const glyph = root!.querySelector(".arch-glyph")?.getBoundingClientRect();
      const center = root!.querySelector(".boot-center")?.getBoundingClientRect();
      if (!shock || !glyph || !center) return;
      shock.style.left = `${glyph.left - center.left + glyph.width / 2 - shock.offsetWidth / 2}px`;
      shock.style.top = `${glyph.top - center.top + glyph.height / 2 - shock.offsetHeight / 2}px`;
    }

    const intro = gsap.timeline();
    intro
      .from(root.querySelector(".boot-grid"), { autoAlpha: 0, scale: 1.08, duration: 1.4, ease: "power2.out" }, 0)
      .from(root.querySelectorAll(".boot-log p"), { autoAlpha: 0, x: -10, duration: 0.35, ease: "power2.out", stagger: 0.12 }, 0.1)
      .from(root.querySelector(".boot-meter"), { autoAlpha: 0, y: 8, duration: 0.5, ease: "power2.out" }, 0.2)
      .to(progress, { value: 0.92, duration: MIN_INTRO_MS / 1000, ease: "power1.inOut" }, 0)
      .to(swarm, { assemble: 1, duration: 1.5, ease: "none" }, 0.15);
    if (path && length) {
      intro
        .fromTo(path, { strokeDasharray: length, strokeDashoffset: length, fillOpacity: 0, strokeOpacity: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" }, 1.25)
        .to(swarm, { fade: 0, duration: 0.6, ease: "power1.in" }, 1.75)
        .to(path, { fillOpacity: 1, strokeOpacity: 0, duration: 0.45, ease: "power1.out" }, 1.95)
        .fromTo(root.querySelector(".arch-glyph"), { filter: "drop-shadow(0 0 0px rgba(168,230,240,0))" }, { filter: "drop-shadow(0 0 26px rgba(168,230,240,.6))", duration: 0.35, yoyo: true, repeat: 1, ease: "sine.inOut" }, 2.05)
        // immediateRender: false keeps the ring hidden (CSS opacity 0) until it fires.
        .fromTo(root.querySelector(".boot-shock"), { scale: 0.2, autoAlpha: 0.9 }, { scale: 3.2, autoAlpha: 0, duration: 1.1, ease: "expo.out", immediateRender: false, onStart: placeShock }, 2.05);
    }
    intro
      .from(letters, { yPercent: 115, duration: 0.85, ease: "expo.out", stagger: 0.09 }, 1.85)
      .from(root.querySelector(".boot-sub"), { autoAlpha: 0, letterSpacing: "1em", duration: 1.1, ease: "expo.out" }, 2.25)
      // Light sweep across the wordmark: letters via background-position, the glyph via its gradient.
      // background-size is 300%, so 100% → 0% carries the band fully across each letter.
      .fromTo(root.querySelectorAll(".boot-word .arch-letter > span"), { backgroundPosition: "100% 0" }, { backgroundPosition: "0% 0", duration: 1.3, ease: "power2.inOut", stagger: 0.06 }, 2.6);
    if (gradient) intro.fromTo(gradient, { attr: { x1: -24, x2: 0 } }, { attr: { x1: 24, x2: 48 }, duration: 1.1, ease: "power2.inOut" }, 2.7);
    // While waiting on slow tasks, the wordmark breathes instead of freezing.
    const idle = gsap.to(root.querySelector(".boot-center"), { scale: 1.012, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true });

    const exit = () => {
      if (exiting) return;
      exiting = true;
      try { playExit(); } catch { finish(); } // never leave the overlay up because of an animation error
    };
    const playExit = () => {
      idle.kill();
      // Anything still running (a sleepy backend, a slow image) carries on in the background.
      TASKS.forEach(({ key }) => { if (line(key)?.dataset.state === "pending") report(key, "wait", "continuing in background"); });
      const startedLine = line("started");
      if (startedLine) { startedLine.dataset.state = "ok"; startedLine.querySelector("b")!.textContent = TAGS.ok; startedLine.querySelector<HTMLElement>("[data-time]")!.textContent = `${Math.round(performance.now() - started)}ms`; }
      intro.progress(1);
      gsap.timeline({ onComplete: finish })
        .to(progress, { value: 1, duration: 0.45, ease: "power2.out" }, 0)
        .to(root.querySelector(".boot-center"), { scale: 1.04, duration: 0.5, ease: "power2.out" }, 0.25)
        .to(root.querySelectorAll(".boot-word .arch-letter > span, .arch-glyph svg"), { yPercent: -120, duration: 0.6, ease: "expo.in", stagger: 0.04 }, 0.55)
        .to(root.querySelector(".arch-glyph svg"), { autoAlpha: 0, duration: 0.4, ease: "power1.in" }, 0.7)
        .to(root.querySelectorAll(".boot-sub, .boot-log, .boot-meter, .boot-grid"), { autoAlpha: 0, duration: 0.35 }, 0.6)
        .to(root, { "--boot-exit": 1, duration: 0.95, ease: "expo.inOut" }, 0.85);
    };

    // Exit once the intro has had its moment AND the tasks are done (or the cap hits).
    const minimum = new Promise((resolve) => window.setTimeout(resolve, MIN_INTRO_MS));
    const cap = new Promise((resolve) => window.setTimeout(resolve, MAX_WAIT_MS));
    Promise.race([Promise.all([minimum, allTasks]), cap]).then(() => { if (!abort.signal.aborted) exit(); });
    window.setTimeout(() => { if (!exiting && !abort.signal.aborted) idle.play(); }, MIN_INTRO_MS);

    // Skip: play the exit, but hand control back within ~1.6s no matter what the frame rate is.
    let skipTimer = 0;
    const skip = () => {
      exit();
      if (!skipTimer) skipTimer = window.setTimeout(finish, 1600);
    };
    const events = ["keydown", "pointerdown", "wheel", "touchstart"] as const;
    events.forEach((type) => window.addEventListener(type, skip, { passive: true, once: true }));
    // A skip that happened before this script loaded (recorded by the <head> script).
    if (html.dataset.bootSkip) skip();
    const watchdog = window.setTimeout(() => finish(), MAX_WAIT_MS + 2500);

    // Undo side effects without marking the intro as seen, so React's dev-mode
    // double mount replays it cleanly instead of skipping it.
    return () => {
      abort.abort();
      window.clearTimeout(watchdog);
      window.clearTimeout(skipTimer);
      events.forEach((type) => window.removeEventListener(type, skip));
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame);
      gsap.ticker.remove(setProgress);
      intro.kill();
      idle.kill();
      gsap.set(root, { clearProps: "--boot-exit" });
      root.classList.remove("is-live");
      if (!finished) { html.style.overflow = previousOverflow; setScrollLock(false); }
    };
  }, []);

  return <div ref={rootRef} className="boot" aria-hidden="true">
    <div className="boot-grid" />
    <canvas ref={canvasRef} className="boot-canvas" />
    <div className="boot-center">
      <span className="boot-shock" />
      <ArchWordmark className="boot-word" sheenId="boot-sheen" />
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
      <span className="boot-percent" data-boot-percent="">{"\u00a00"}%</span>
      <span className="boot-hint">Press any key to skip</span>
    </div>
    <span className="boot-edge" />
  </div>;
}
