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
 * Reduced motion skips everything and leaves content in place.
 */
export function ScrollReveals() {
  useGSAP(() => {
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

      document.querySelectorAll<HTMLElement>("[data-process]").forEach((row) => {
        const steps = Array.from(row.querySelectorAll<HTMLElement>("[data-process-step]"));
        const rail = row.querySelector<HTMLElement>("[data-process-rail]");
        row.classList.add("is-scrubbed");
        ScrollTrigger.create({
          trigger: row,
          start: "top 88%",
          end: "top 38%",
          scrub: true,
          onUpdate: (self) => {
            rail?.style.setProperty("--progress", self.progress.toFixed(4));
            steps.forEach((step, index) => step.classList.toggle("is-active", self.progress >= index / steps.length + 0.02));
          },
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
        document.querySelectorAll("[data-process]").forEach((row) => row.classList.remove("is-scrubbed"));
      };
    });

    return () => mm.revert();
  });

  return null;
}
