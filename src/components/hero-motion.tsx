"use client";

import { useRef } from "react";
import { afterBoot, gsap, isBootPlaying, useGSAP, ease, motionQueries } from "@/lib/motion";
import { heroScrollState } from "@/lib/hero-scroll";
import { NetworkField } from "@/components/network-field";

const LATE_START_MS = 2400;

/**
 * Hero choreography: staggered entrance for the copy, and scroll-linked exit
 * (copy drifts up, background fades, the 3D card tilts away). Renders the
 * network background so it lives inside the hero's stacking context.
 */
export function HeroMotion() {
  const anchorRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const hero = anchorRef.current?.closest<HTMLElement>(".hero");
    if (!hero) return;
    const items = Array.from(hero.querySelectorAll<HTMLElement>("[data-hero-reveal]:not(.hero-headline)"));
    const show = (elements: HTMLElement[]) => elements.forEach((element) => element.setAttribute("data-ready", ""));
    const mm = gsap.matchMedia();

    mm.add({ motionOk: motionQueries.motionOk, desktop: motionQueries.desktop }, (context) => {
      const { motionOk, desktop } = context.conditions as { motionOk: boolean; desktop: boolean };
      const waitForBoot = isBootPlaying();
      if (!motionOk || (!waitForBoot && performance.now() > LATE_START_MS)) { show(items); return; }

      // Paused behind the boot intro; the "from" state still applies immediately.
      const intro = gsap.timeline({ delay: 0.35, paused: true });
      let watchdog = 0;
      const cancelBootWait = afterBoot(() => {
        intro.play();
        // Watchdog: if frames stall (a busy main thread while the 3D card loads),
        // finish the entrance on a timer so the copy can never stay hidden.
        watchdog = window.setTimeout(() => { if (intro.progress() < 1) intro.progress(1); show(items); }, 3200);
      });
      intro
        .fromTo(items, { autoAlpha: 0, y: 22, filter: "blur(6px)" }, {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.9,
          ease: ease.out,
          stagger: 0.08,
          onStart: () => show(items),
          clearProps: "filter,visibility",
        })
        .fromTo(hero.querySelector(".network-field"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.6, ease: ease.soft }, 0);

      // Scroll-linked exit, scrubbed against the smoothed scroll position.
      const exit = gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6 } });
      exit.to(hero.querySelector(".hero-copy"), { y: -80, autoAlpha: 0.15, ease: "none" }, 0)
        .to(hero.querySelector(".network-field"), { y: 120, autoAlpha: 0, ease: "none" }, 0)
        .to(hero.querySelector(".hero-scroll"), { autoAlpha: 0, ease: "none", duration: 0.25 }, 0);

      if (desktop) {
        // The card mounts asynchronously; its static wrapper always exists.
        const card = hero.querySelector(".hero-card-shell");
        exit.to(heroScrollState, { progress: 1, ease: "none" }, 0);
        if (card) exit.to(card, { autoAlpha: 0.35, ease: "none" }, 0);
      }
      return () => { cancelBootWait(); window.clearTimeout(watchdog); heroScrollState.progress = 0; };
    });

    return () => mm.revert();
  });

  return <div ref={anchorRef} className="hero-motion" aria-hidden="true"><NetworkField /></div>;
}
