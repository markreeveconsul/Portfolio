import type { ReactNode } from "react";
import { ARCH_LINUX_PATH } from "@/data/id-card-design";

// The logo path spans y 0.605 → 23.395 inside a 24×24 box. Cropping the viewBox
// to the shape lets CSS size it to the cap height and sit its feet on the baseline.
const GLYPH_VIEWBOX = "0 0.605 24 22.79";

/**
 * "MARK" set in the display font with the A replaced by the Arch Linux logo,
 * which already reads as an A. The real word is exposed to assistive tech.
 *
 * `animated` (boot intro): the path gets pathLength=1 so CSS can draw its
 * outline, and a gradient fill whose light band sweeps across via SMIL, which
 * runs from first paint without any JavaScript. `glyphExtra` renders inside
 * the glyph box (e.g. an effect centred on the logo).
 */
export function ArchWordmark({ className = "", label = "Mark", animated = false, glyphExtra }: { className?: string; label?: string; animated?: boolean; glyphExtra?: ReactNode }) {
  const sheenId = animated ? "arch-sheen" : undefined;
  return <span className={`arch-wordmark ${className}`} role="img" aria-label={label}>
    <span className="arch-letter" aria-hidden="true"><span>M</span></span>
    <span className="arch-letter arch-glyph" aria-hidden="true">
      {glyphExtra}
      <svg viewBox={GLYPH_VIEWBOX} focusable="false">
        {sheenId && <defs>
          <linearGradient id={sheenId} gradientUnits="userSpaceOnUse" x1="-24" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#ECEAE4" />
            <stop offset="0.42" stopColor="#ECEAE4" />
            <stop offset="0.5" stopColor="#FFFFFF" />
            <stop offset="0.54" stopColor="#A8E6F0" />
            <stop offset="0.6" stopColor="#E9B8F0" />
            <stop offset="0.68" stopColor="#ECEAE4" />
            <stop offset="1" stopColor="#ECEAE4" />
            <animate attributeName="x1" values="-24;24" begin="2.7s" dur="1.1s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.65 0 0.35 1" />
            <animate attributeName="x2" values="0;48" begin="2.7s" dur="1.1s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.65 0 0.35 1" />
          </linearGradient>
        </defs>}
        <path d={ARCH_LINUX_PATH} pathLength={animated ? 1 : undefined} fill={sheenId ? `url(#${sheenId})` : undefined} />
      </svg>
    </span>
    <span className="arch-letter" aria-hidden="true"><span>R</span></span>
    <span className="arch-letter" aria-hidden="true"><span>K</span></span>
  </span>;
}
