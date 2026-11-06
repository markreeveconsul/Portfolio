"use client";

import { useEffect, useRef } from "react";
import { ArchWordmark } from "@/components/arch-wordmark";
import { BOOT_STORAGE_KEY } from "@/lib/boot";
import { BOOT_DONE_EVENT, gsap, setScrollLock } from "@/lib/motion";

const LOG = [
  { tag: "::", text: "Synchronizing package databases…" },
  { tag: "OK", text: "Mounted /home/mark/portfolio" },
  { tag: "OK", text: "Started consul.dev" },
];
const WATCHDOG_MS = 4200;

/**
 * First-visit boot sequence (once per session). The overlay is server-rendered
 * and only shown when the pre-paint script set <html data-boot="play">, so it
 * never flashes for anyone else. Any key, click, scroll, or touch skips it, and
 * a CSS failsafe hides it even if this script never runs.
 */
export function BootIntro() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const html = document.documentElement;
    if (!root || html.dataset.boot !== "play") return;

    let finished = false;
    const previousOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    setScrollLock(true);

    const finish = () => {
      if (finished) return;
      finished = true;
      html.dataset.boot = "done";
      html.style.overflow = previousOverflow;
      try { sessionStorage.setItem(BOOT_STORAGE_KEY, "1"); } catch { /* private mode */ }
      setScrollLock(false);
      window.dispatchEvent(new Event(BOOT_DONE_EVENT));
    };

    const path = root.querySelector<SVGPathElement>(".arch-glyph path");
    const length = path?.getTotalLength() ?? 0;
    const letters = root.querySelectorAll(".boot-word .arch-letter:not(.arch-glyph) > span");
    const percent = root.querySelector<HTMLElement>("[data-boot-percent]");
    const progress = { value: 0 };

    const timeline = gsap.timeline({ onComplete: finish });
    timeline
      .from(root.querySelectorAll("[data-boot-line]"), { autoAlpha: 0, x: -8, duration: 0.28, ease: "power2.out", stagger: 0.16 }, 0)
      .to(progress, { value: 100, duration: 1.15, ease: "power2.inOut", onUpdate: () => {
        if (percent) percent.textContent = `${Math.round(progress.value)}%`;
        root.style.setProperty("--boot-progress", (progress.value / 100).toFixed(3));
      } }, 0.05)
      .from(letters, { yPercent: 110, duration: 0.7, ease: "expo.out", stagger: 0.07 }, 0.12);
    if (path && length) {
      timeline
        .fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 0.75, ease: "power2.inOut" }, 0.15)
        .to(path, { fillOpacity: 1, strokeOpacity: 0, duration: 0.35, ease: "power1.out" }, 0.8)
        .fromTo(root.querySelector(".arch-glyph"), { filter: "drop-shadow(0 0 0px rgba(168,230,240,0))" }, { filter: "drop-shadow(0 0 18px rgba(168,230,240,.55))", duration: 0.3, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0.95);
    }
    timeline
      .from(root.querySelector(".boot-sub"), { autoAlpha: 0, letterSpacing: "0.7em", duration: 0.8, ease: "expo.out" }, 0.62)
      .addLabel("exit", 1.5)
      .to(root.querySelector(".boot-center"), { y: -24, autoAlpha: 0, duration: 0.45, ease: "power2.in" }, "exit")
      .to(root.querySelectorAll(".boot-log, .boot-meter"), { autoAlpha: 0, duration: 0.3 }, "exit")
      .to(root, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.75, ease: "expo.inOut" }, "exit+=0.15");

    const skip = () => {
      if (timeline.time() < timeline.labels.exit) timeline.seek("exit");
      timeline.timeScale(1.8);
    };
    const events = ["keydown", "pointerdown", "wheel", "touchstart"] as const;
    events.forEach((type) => window.addEventListener(type, skip, { passive: true, once: true }));
    const watchdog = window.setTimeout(() => { timeline.progress(1); finish(); }, WATCHDOG_MS);

    // Undo side effects without marking the intro as seen, so React's dev-mode
    // double mount replays it cleanly instead of skipping it.
    return () => {
      window.clearTimeout(watchdog);
      events.forEach((type) => window.removeEventListener(type, skip));
      timeline.kill();
      gsap.set(root, { clearProps: "clipPath" });
      if (!finished) { html.style.overflow = previousOverflow; setScrollLock(false); }
    };
  }, []);

  return <div ref={rootRef} className="boot" aria-hidden="true">
    <div className="boot-center">
      <ArchWordmark className="boot-word" />
      <span className="boot-sub">Reeve Consul</span>
    </div>
    <div className="boot-log">
      {LOG.map((line) => <p key={line.text} data-boot-line=""><b className={line.tag === "OK" ? "is-ok" : undefined}>{line.tag === "OK" ? "[  OK  ]" : line.tag}</b> {line.text}</p>)}
    </div>
    <div className="boot-meter">
      <span className="boot-bar"><i /></span>
      <span data-boot-percent="">0%</span>
      <span className="boot-hint">Press any key to skip</span>
    </div>
  </div>;
}
