"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

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

// Signature easing: fast in, gentle settle.
export const ease = { out: "expo.out", inOut: "power3.inOut", soft: "power2.out" } as const;
