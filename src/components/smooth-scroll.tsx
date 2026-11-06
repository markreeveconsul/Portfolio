"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, SCROLL_LOCK_EVENT, motionQueries } from "@/lib/motion";

const NAV_OFFSET = -96;

/**
 * Smooth, weighted scrolling on desktop pointers (Lenis), driven by GSAP's ticker
 * so ScrollTrigger animations stay in sync with the smoothed position.
 * Touch devices and reduced-motion visitors keep native scrolling.
 */
export function SmoothScroll() {
  useEffect(() => {
    const query = window.matchMedia(motionQueries.desktop);
    let lenis: Lenis | null = null;
    let tick: ((time: number) => void) | null = null;

    const start = () => {
      if (lenis) return;
      lenis = new Lenis({
        autoRaf: false,
        lerp: 0.1,
        wheelMultiplier: 1,
        allowNestedScroll: true,
        stopInertiaOnNavigate: true,
        // Overlays with their own scroll areas keep native scrolling.
        prevent: (node) => Boolean(node.closest?.(".chat-assistant, .lightbox, [data-lenis-prevent]")),
      });
      lenis.on("scroll", ScrollTrigger.update);
      tick = (time) => lenis?.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    };

    const stop = () => {
      if (tick) gsap.ticker.remove(tick);
      tick = null;
      lenis?.destroy();
      lenis = null;
      gsap.ticker.lagSmoothing(500, 33);
    };

    // Same-page anchor links: cancel the browser's instant jump and glide instead.
    const onClick = (event: MouseEvent) => {
      if (!lenis || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href*='#']") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: NAV_OFFSET, duration: 1.3 });
      history.pushState(null, "", url.hash);
    };

    const sync = () => (query.matches ? start() : stop());
    const onLock = (event: Event) => {
      if (!lenis) return;
      if ((event as CustomEvent<boolean>).detail) lenis.stop();
      else lenis.start();
    };

    sync();
    query.addEventListener("change", sync);
    window.addEventListener(SCROLL_LOCK_EVENT, onLock);
    document.addEventListener("click", onClick);
    return () => {
      query.removeEventListener("change", sync);
      window.removeEventListener(SCROLL_LOCK_EVENT, onLock);
      document.removeEventListener("click", onClick);
      stop();
    };
  }, []);

  return null;
}
