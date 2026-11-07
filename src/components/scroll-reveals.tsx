"use client";

import { afterBoot, gsap, ScrollTrigger, SplitText, useGSAP, ease, motionQueries } from "@/lib/motion";

/**
 * Wires scroll-triggered reveals to markup through data attributes, so server
 * components stay server components:
 *
 * - `data-reveal="lines"`   heading slides up line by line inside a mask
 * - `data-reveal="stagger"` direct children rise in one after another
 * - `data-reveal="fade"`    the element itself rises in
 * - `data-reveal="grid"`    children pop in as a diagonal wave (pure CSS, see .is-revealed)
 * - `data-count`            number counts up from 0 (value = final number)
 * - `data-process`          steps light up and a rail fills as you scroll
 *
 * Performance: none of this is needed above the fold, so it's all set up after
 * the boot intro, in idle time. (Setting up hundreds of tweens at page load was
 * measured blocking the main thread for ~3s and freezing the intro.) Dense grids
 * are revealed by toggling one class and letting CSS stagger the cells, so they
 * cost nothing at load.
 *
 * Nothing is hidden by CSS until this runs, so content stays visible without
 * JavaScript or if an animation fails. Reduced motion skips the reveals.
 */
export function ScrollReveals() {
  useGSAP((_, contextSafe) => {
    let idle = 0;
    let reverted = false;
    const cleanups: (() => void)[] = [];

    const setup = contextSafe!(() => {
      if (reverted) return;
      cleanups.push(setupProcess());
      if (window.matchMedia(motionQueries.motionOk).matches) cleanups.push(setupReveals());
    });

    const hasIdle = typeof window.requestIdleCallback === "function";
    const cancelBoot = afterBoot(() => {
      idle = hasIdle ? window.requestIdleCallback(() => setup(), { timeout: 800 }) : window.setTimeout(setup, 200);
    });

    return () => {
      reverted = true;
      cancelBoot();
      if (hasIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      cleanups.forEach((cleanup) => cleanup());
    };
  });

  return null;
}

/**
 * Process steps: the rail fills and steps light up with the scroll position.
 * It only moves when the visitor scrolls, so it stays on with reduced motion.
 * Wide screens: a horizontal rail under the row. Phones: a vertical timeline,
 * filling while the list passes through the screen.
 */
function setupProcess() {
  const media = gsap.matchMedia();
  media.add({ phone: "(max-width: 680px)", wide: "(min-width: 681px)" }, (context) => {
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
  return () => media.revert();
}

function setupReveals() {
  const splits: SplitText[] = [];
  let cancelled = false;
  const ctx = gsap.context(() => {});
  const trigger = (element: Element) => ({ trigger: element, start: "top 86%", once: true });

  ctx.add(() => {
    document.querySelectorAll<HTMLElement>("[data-reveal='fade']").forEach((element) => {
      gsap.from(element, { autoAlpha: 0, y: 28, duration: 1, ease: ease.out, scrollTrigger: trigger(element) });
    });

    document.querySelectorAll<HTMLElement>("[data-reveal='stagger']").forEach((group) => {
      gsap.from(group.children, { autoAlpha: 0, y: 36, duration: 1, ease: ease.out, stagger: 0.09, scrollTrigger: trigger(group) });
    });

    // Dense grids: one class toggle; CSS staggers the cells by their --i index.
    document.querySelectorAll<HTMLElement>("[data-reveal='grid']").forEach((grid) => {
      grid.classList.add("will-reveal");
      ScrollTrigger.create({ trigger: grid, start: "top 88%", once: true, onEnter: () => grid.classList.add("is-revealed") });
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
  });

  // Headings split by rendered line, so wait for web fonts to settle line breaks.
  document.fonts.ready.then(() => ctx.add(() => {
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
    document.querySelectorAll("[data-reveal='grid']").forEach((grid) => grid.classList.remove("will-reveal", "is-revealed"));
    ctx.revert();
  };
}
