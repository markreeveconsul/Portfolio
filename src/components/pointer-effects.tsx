"use client";

import { useEffect, useRef } from "react";
import { gsap, motionQueries } from "@/lib/motion";

const INTERACTIVE = "a, button, [role='tab'], [data-cursor], label, summary";
const TEXT_ENTRY = "input, textarea, select, [contenteditable='true']";
const MAGNET_MAX = 8;
const TILT_MAX = 6;

/**
 * Desktop-only pointer layer, attached once with delegated listeners so it
 * also covers content that mounts later (tab panels, lightbox):
 *
 * - a trailing cursor ring that grows over interactive elements and can show a
 *   short label (`data-cursor="view"`); the native cursor stays visible
 * - `data-magnetic`  element leans up to 8px toward the pointer
 * - `data-tilt`      element tilts in 3D (max 6°)
 * - `data-spotlight` sets --mx / --my so CSS can draw a pointer-following glow
 */
export function PointerEffects() {
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const query = window.matchMedia(motionQueries.desktop);
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!ring || !label) return;
    let teardown: (() => void) | null = null;

    const enable = () => {
      const moveX = gsap.quickTo(ring, "x", { duration: 0.38, ease: "power3.out" });
      const moveY = gsap.quickTo(ring, "y", { duration: 0.38, ease: "power3.out" });
      let magnet: HTMLElement | null = null;
      let tilt: HTMLElement | null = null;
      let shown = false;

      const release = (element: HTMLElement | null, kind: "magnet" | "tilt") => {
        if (!element) return;
        if (kind === "magnet") gsap.to(element, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.45)", overwrite: "auto" });
        else gsap.to(element, { rotateX: 0, rotateY: 0, y: 0, duration: 0.6, ease: "power3.out", overwrite: "auto" });
      };

      const onMove = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        if (!shown) { gsap.set(ring, { x: event.clientX, y: event.clientY }); ring.classList.add("is-visible"); shown = true; }
        moveX(event.clientX);
        moveY(event.clientY);
        const target = event.target as Element | null;

        const nextMagnet = target?.closest?.<HTMLElement>("[data-magnetic]") ?? null;
        if (nextMagnet !== magnet) { release(magnet, "magnet"); magnet = nextMagnet; }
        if (magnet) {
          const rect = magnet.getBoundingClientRect();
          const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
          const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
          gsap.to(magnet, { x: gsap.utils.clamp(-1, 1, dx) * MAGNET_MAX, y: gsap.utils.clamp(-1, 1, dy) * MAGNET_MAX * 0.6, duration: 0.4, ease: "power3.out", overwrite: "auto" });
        }

        const nextTilt = target?.closest?.<HTMLElement>("[data-tilt]") ?? null;
        if (nextTilt !== tilt) { release(tilt, "tilt"); tilt = nextTilt; }
        if (tilt) {
          const rect = tilt.getBoundingClientRect();
          const nx = (event.clientX - rect.left) / rect.width - 0.5;
          const ny = (event.clientY - rect.top) / rect.height - 0.5;
          gsap.to(tilt, { rotateY: nx * TILT_MAX * 2, rotateX: -ny * TILT_MAX * 2, y: -4, transformPerspective: 1000, duration: 0.5, ease: "power3.out", overwrite: "auto" });
        }

        const spotlight = target?.closest?.<HTMLElement>("[data-spotlight]");
        if (spotlight) {
          const rect = spotlight.getBoundingClientRect();
          spotlight.style.setProperty("--mx", `${event.clientX - rect.left}px`);
          spotlight.style.setProperty("--my", `${event.clientY - rect.top}px`);
        }

        // Cursor ring state: hidden over text entry, grown over interactive elements.
        const typing = Boolean(target?.closest?.(TEXT_ENTRY));
        const hint = document.documentElement.dataset.cursorHint;
        const interactive = target?.closest?.<HTMLElement>(INTERACTIVE);
        const text = hint ?? interactive?.closest<HTMLElement>("[data-cursor]")?.dataset.cursor ?? "";
        ring.classList.toggle("is-hidden", typing);
        ring.classList.toggle("is-hover", Boolean(interactive || hint));
        ring.classList.toggle("has-label", Boolean(text));
        if (label.textContent !== text) label.textContent = text;
      };

      const onDown = () => ring.classList.add("is-pressed");
      const onUp = () => ring.classList.remove("is-pressed");
      const onLeave = () => {
        ring.classList.remove("is-visible");
        shown = false;
        release(magnet, "magnet");
        release(tilt, "tilt");
        magnet = null;
        tilt = null;
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      window.addEventListener("pointerup", onUp, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      window.addEventListener("blur", onLeave);
      document.documentElement.classList.add("has-pointer-effects");

      teardown = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointerup", onUp);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("blur", onLeave);
        document.documentElement.classList.remove("has-pointer-effects");
        onLeave();
      };
    };

    const sync = () => {
      teardown?.();
      teardown = null;
      if (query.matches) enable();
    };
    sync();
    query.addEventListener("change", sync);
    return () => { query.removeEventListener("change", sync); teardown?.(); };
  }, []);

  return <div ref={ringRef} className="cursor-ring" aria-hidden="true"><span ref={labelRef} className="cursor-label" /></div>;
}
