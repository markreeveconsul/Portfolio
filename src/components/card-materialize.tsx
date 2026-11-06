"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { idCardScreenRect } from "@/data/id-card-design";

/**
 * Loading state for the ID card: a holographic wireframe of the card that
 * "materializes" while the real one loads, with a scan line sweeping through a
 * faint outline of the card's layout (slot, photo, name, QR).
 *
 * - `floating` (desktop): placed exactly where the WebGL card's front face will
 *   appear, so the real card fades in on top of it with no jump.
 * - inline (phones / no WebGL): sits where the flat card will be.
 * `leaving` fades it out as the real card arrives.
 */
export function CardMaterialize({ floating = false, leaving = false }: { floating?: boolean; leaving?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties | undefined>(undefined);

  useLayoutEffect(() => {
    if (!floating) return;
    const element = ref.current;
    const hero = element?.closest<HTMLElement>(".hero");
    if (!element || !hero) return;
    const place = () => {
      // The WebGL canvas spans the viewport width (from x = 0) and the hero's height.
      const heroRect = hero.getBoundingClientRect();
      const rect = idCardScreenRect(window.innerWidth, hero.offsetHeight);
      setStyle({ left: rect.centerX - rect.width / 2 - heroRect.left, top: rect.centerY - rect.height / 2, width: rect.width, height: rect.height });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(hero);
    window.addEventListener("resize", place);
    return () => { observer.disconnect(); window.removeEventListener("resize", place); };
  }, [floating]);

  return <div ref={ref} className={`card-materialize${floating ? " is-floating" : ""}${leaving ? " is-leaving" : ""}`} style={style} aria-hidden="true">
    <span className="cm-frame">
      <i className="cm-corner cm-tl" /><i className="cm-corner cm-tr" /><i className="cm-corner cm-bl" /><i className="cm-corner cm-br" />
      <span className="cm-slot" />
      <span className="cm-row cm-meta"><b /><b /></span>
      <span className="cm-photo" />
      <span className="cm-name"><b /><b /><b /></span>
      <span className="cm-row cm-foot"><b /><b className="cm-qr" /></span>
      <span className="cm-scan" />
    </span>
    <span className="cm-label">rendering card<span className="cm-dots"><i>.</i><i>.</i><i>.</i></span></span>
  </div>;
}
