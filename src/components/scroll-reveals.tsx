"use client";

import { gsap, ScrollTrigger, SplitText, useGSAP, ease, motionQueries } from "@/lib/motion";

/**
 * Wires scroll-triggered reveals to markup through data attributes, so server
 * components stay server components:
 *
 * - `data-reveal="lines"`   heading slides up line by line inside a mask
 * - `data-reveal="stagger"` direct children rise in one after another
 * - `data-reveal="fade"`    the element itself rises in
 * - `data-reveal="grid"`    children pop in as a diagonal wave (2D grids)
 * - `data-count`            number counts up from 0 (value = final number)
 * - `data-process`          steps light up and a rail fills as you scroll
 *
 * Nothing is hidden by CSS: elements only get a "from" state once this runs,
 * so content stays visible without JavaScript or if an animation fails.
 * Reduced motion skips the reveals and leaves content in place.
 */
export function ScrollReveals() {
  useGSAP(() => {
    // Process steps: the rail fills and steps light up in step with the scroll
    // position. It only moves when the visitor scrolls (like the navbar progress
    // line), so it stays on with reduced motion too.
    // Wide screens: a horizontal rail under the row of steps.
    // Phones: the steps stack into a vertical timeline and the rail fills
    // downward while the list passes through the screen, so it starts empty
    // when the section arrives instead of already being full.
    const processMedia = gsap.matchMedia();
    processMedia.add({ phone: "(max-width: 680px)", wide: "(min-width: 681px)" }, (context) => {
      const { phone } = context.conditions as { phone: boolean };
      document.querySelectorAll<HTMLElement>("[data-process]").forEach((row) => {
        const steps = Array.from(row.querySelectorAll<HTMLElement>("[data-process-step]"));
        const rail = row.querySelector<HTMLElement>("[data-process-rail]");
        row.classList.add("is-scrubbed");
        const threshold = (index: number) => (phone ? index / Math.max(1, steps.length - 1) - 0.03 : index / steps.length + 0.02);
        const light = (progress: number) => steps.forEach((step, index) => step.classList.toggle("is-active", progress >= threshold(index)));
        const scrollTrigger = {
          trigger: row,
          start: phone ? "top 80%" : "top 88%",
          end: phone ? "bottom 55%" : "top 38%",
          scrub: 0.4,
          onUpdate: (self: ScrollTrigger) => light(self.progress),
          onRefresh: (self: ScrollTrigger) => light(self.progress),
        };
        if (!rail) { ScrollTrigger.create(scrollTrigger); return; }
        if (phone) gsap.fromTo(rail, { scaleY: 0, scaleX: 1 }, { scaleY: 1, ease: "none", transformOrigin: "50% 0%", scrollTrigger });
        else gsap.fromTo(rail, { scaleX: 0, scaleY: 1 }, { scaleX: 1, ease: "none", transformOrigin: "0% 50%", scrollTrigger });
      });
      return () => document.querySelectorAll("[data-process]").forEach((row) => row.classList.remove("is-scrubbed"));
    });

    const mm = gsap.matchMedia();
    mm.add(motionQueries.motionOk, (context) => {
      const splits: SplitText[] = [];
      let cancelled = false;
      const trigger = (element: Element) => ({ trigger: element, start: "top 86%", once: true });

      document.querySelectorAll<HTMLElement>("[data-reveal='fade']").forEach((element) => {
        gsap.from(element, { autoAlpha: 0, y: 28, duration: 1, ease: ease.out, scrollTrigger: trigger(element) });
      });

      document.querySelectorAll<HTMLElement>("[data-reveal='stagger']").forEach((group) => {
        gsap.from(group.children, { autoAlpha: 0, y: 36, duration: 1, ease: ease.out, stagger: 0.09, scrollTrigger: trigger(group) });
      });

      // Dense grids (activity heatmap): cells pop in as a diagonal wave.
      document.querySelectorAll<HTMLElement>("[data-reveal='grid']").forEach((grid) => {
        gsap.from(grid.children, { autoAlpha: 0, scale: 0.2, duration: 0.5, ease: "back.out(2)", stagger: { amount: 1.4, grid: "auto", from: "start" }, scrollTrigger: trigger(grid) });
      });

      document.querySelectorAll<HTMLElement>("[data-count]").forEach((element) => {
        const target = Number(element.dataset.count);
        if (!Number.isFinite(target) || target <= 0) return;
        const digits = element.textContent?.trim().length ?? 2;
        const counter = { value: 0 };
        element.textContent = "0".padStart(digits, "0");
        gsap.to(counter, {
          value: target,
          duration: 1.4,
          ease: "power2.out",
          scrollTrigger: trigger(element),
          onUpdate: () => { element.textContent = String(Math.round(counter.value)).padStart(digits, "0"); },
        });
      });

      // Headings split by rendered line, so wait for web fonts to settle line breaks.
      document.fonts.ready.then(() => context.add(() => {
        if (cancelled) return;
        document.querySelectorAll<HTMLElement>("[data-reveal='lines']").forEach((heading) => {
          const split = SplitText.create(heading, { type: "lines", mask: "lines", linesClass: "split-line" });
          splits.push(split);
          gsap.from(split.lines, {
            yPercent: 115,
            duration: 1.1,
            ease: ease.out,
            stagger: 0.1,
            scrollTrigger: trigger(heading),
            // Restore the original markup once revealed, so resizing reflows naturally.
            onComplete: () => split.revert(),
          });
        });
        ScrollTrigger.refresh();
      }));

      return () => {
        cancelled = true;
        splits.forEach((split) => split.revert());
      };
    });

    return () => { mm.revert(); processMedia.revert(); };
  });

  return null;
}
