"use client";

import { useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
// Animations follow real time. GSAP's default lag smoothing pretends long frames
// were short, which can leave entrance animations crawling (and content
// invisible) while the main thread is busy loading the 3D card.
gsap.ticker.lagSmoothing(0);

export { gsap, ScrollTrigger, SplitText, useGSAP };

// Media queries shared by every effect, so "full motion" means the same thing everywhere.
export const motionQueries = {
  /** Any motion at all. */
  motionOk: "(prefers-reduced-motion: no-preference)",
  /** Desktop-class effects: precise pointer, wide enough viewport, motion allowed. */
  desktop: "(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine) and (min-width: 681px)",
} as const;

export function matches(query: string) {
  return typeof window !== "undefined" && window.matchMedia(query).matches;
}

// Custom events for coordinating smooth scrolling with modals and overlays.
export const SCROLL_LOCK_EVENT = "portfolio:scroll-lock";

export function setScrollLock(locked: boolean) {
  window.dispatchEvent(new CustomEvent<boolean>(SCROLL_LOCK_EVENT, { detail: locked }));
}

// Programmatic section scrolling that goes through Lenis when it's active.
export const SCROLL_TO_EVENT = "portfolio:scroll-to";

export function scrollToSection(id: string) {
  const handled = !window.dispatchEvent(new CustomEvent<string>(SCROLL_TO_EVENT, { detail: id, cancelable: true }));
  if (handled) return;
  document.getElementById(id)?.scrollIntoView({ behavior: matches(motionQueries.motionOk) ? "smooth" : "auto", block: "start" });
}

// Boot intro coordination. The <html data-boot> attribute is set before first
// paint by an inline script: "play" while the intro runs, "done" afterwards,
// "skip" when it won't run (returning visit this session, reduced motion).
export const BOOT_DONE_EVENT = "portfolio:boot-done";

export function isBootPlaying() {
  return typeof document !== "undefined" && document.documentElement.dataset.boot === "play";
}

/** Runs `callback` once the boot intro has finished (immediately if it isn't playing). */
export function afterBoot(callback: () => void) {
  if (!isBootPlaying()) { callback(); return () => {}; }
  const onDone = () => callback();
  window.addEventListener(BOOT_DONE_EVENT, onDone, { once: true });
  return () => window.removeEventListener(BOOT_DONE_EVENT, onDone);
}

/** Fired when the boot overlay starts sliding away, so the page can appear underneath it. */
export const BOOT_REVEAL_EVENT = "portfolio:boot-reveal";

/**
 * Runs `callback` when the main page should start appearing: as the boot overlay
 * begins its exit wipe (or immediately if the intro isn't playing). Use this for
 * the hero entrance so the page is visible while the overlay slides away; use
 * afterBoot for heavy work that should wait until the intro is fully gone.
 */
export function afterBootReveal(callback: () => void) {
  if (!isBootPlaying() || document.documentElement.dataset.bootReveal) { callback(); return () => {}; }
  let done = false;
  const run = () => { if (done) return; done = true; cleanup(); callback(); };
  const cleanup = () => { window.removeEventListener(BOOT_REVEAL_EVENT, run); window.removeEventListener(BOOT_DONE_EVENT, run); };
  window.addEventListener(BOOT_REVEAL_EVENT, run);
  window.addEventListener(BOOT_DONE_EVENT, run);
  return cleanup;
}

/**
 * True once the boot intro is over, plus `delayMs`, plus an idle moment. Use it
 * to hold back heavy work (WebGL scenes, canvas loops) so it never competes
 * with the intro or the hero entrance for main-thread time. Starts false on the
 * server and the first client render, so hydration always matches.
 */
export function useAfterBoot(delayMs = 0) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let timer = 0;
    let idle = 0;
    const cancel = afterBoot(() => {
      timer = window.setTimeout(() => {
        if ("requestIdleCallback" in window) idle = window.requestIdleCallback(() => setReady(true), { timeout: 700 });
        else setReady(true);
      }, delayMs);
    });
    return () => {
      cancel();
      window.clearTimeout(timer);
      if (idle && "cancelIdleCallback" in window) window.cancelIdleCallback(idle);
    };
  }, [delayMs]);
  return ready;
}

// Signature easing: fast in, gentle settle.
export const ease = { out: "expo.out", inOut: "power3.inOut", soft: "power2.out" } as const;
