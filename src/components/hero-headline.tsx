"use client";

import { useEffect, useRef } from "react";
import { motionQueries } from "@/lib/motion";

const GLYPHS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789/<>_+=#";
// If hydration is this late, the CSS failsafe has already shown the text; don't re-hide it.
const LATE_START_MS = 2400;

/**
 * Hero headline that "decodes": each character cycles through random glyphs
 * before settling, left to right. The real text is server-rendered, and screen
 * readers get it once through a visually hidden copy.
 */
export function HeroHeadline({ lineOne, lineTwo }: { lineOne: string; lineTwo: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;
    const lines = Array.from(heading.querySelectorAll<HTMLElement>("[data-decode]"));
    const reveal = () => heading.setAttribute("data-ready", "");
    if (!window.matchMedia(motionQueries.motionOk).matches || performance.now() > LATE_START_MS) { reveal(); return; }

    const finals = lines.map((line) => line.dataset.decode ?? "");
    const startDelay = 120;
    const charStagger = 38;
    const scrambleTime = 300;
    const lineGap = 160;
    let frame = 0;
    let startTime = 0;
    let random = 0x51f15e;
    const nextGlyph = () => {
      random = (random * 1664525 + 1013904223) >>> 0;
      return GLYPHS[random % GLYPHS.length];
    };

    heading.classList.add("is-decoding");
    reveal();
    const finish = () => {
      cancelAnimationFrame(frame);
      lines.forEach((line, index) => { line.textContent = finals[index]; });
      heading.classList.remove("is-decoding");
      heading.classList.add("is-decoded");
    };
    // Watchdog: never leave scrambled glyphs on screen if frames stop arriving.
    const watchdog = window.setTimeout(finish, 3500);
    const render = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime - startDelay;
      let done = true;
      let lineOffset = 0;
      finals.forEach((text, lineIndex) => {
        let output = "";
        for (let index = 0; index < text.length; index += 1) {
          const char = text[index];
          const settleAt = lineOffset + index * charStagger + scrambleTime;
          if (char === " " || elapsed >= settleAt) output += char;
          else if (elapsed < lineOffset + index * charStagger) output += "\u00a0";
          else { output += nextGlyph(); done = false; }
          if (elapsed < settleAt) done = false;
        }
        lines[lineIndex].textContent = output;
        lineOffset += text.length * charStagger + lineGap;
      });
      if (done) {
        window.clearTimeout(watchdog);
        finish();
        return;
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      window.clearTimeout(watchdog);
      cancelAnimationFrame(frame);
      lines.forEach((line, index) => { line.textContent = finals[index]; });
      heading.classList.remove("is-decoding");
    };
  }, []);

  return <h1 id="hero-title" ref={headingRef} className="hero-headline" data-hero-reveal="">
    <span className="sr-only">{lineOne} {lineTwo}</span>
    <span className="hero-line" aria-hidden="true" data-decode={lineOne}>{lineOne}</span>
    <span className="hero-line hero-line-accent" aria-hidden="true" data-decode={lineTwo}>{lineTwo}</span>
  </h1>;
}
