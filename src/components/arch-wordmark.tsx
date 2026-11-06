import { ARCH_LINUX_PATH } from "@/data/id-card-design";

// The logo path spans y 0.605 → 23.395 inside a 24×24 box. Cropping the viewBox
// to the shape lets CSS size it to the cap height and sit its feet on the baseline.
const GLYPH_VIEWBOX = "0 0.605 24 22.79";

/**
 * "MARK" set in the display font with the A replaced by the Arch Linux logo,
 * which already reads as an A. The real word is exposed to assistive tech.
 * Pass `sheenId` to give the glyph a gradient fill that can be animated.
 */
export function ArchWordmark({ className = "", label = "Mark", sheenId }: { className?: string; label?: string; sheenId?: string }) {
  return <span className={`arch-wordmark ${className}`} role="img" aria-label={label}>
    <span className="arch-letter" aria-hidden="true"><span>M</span></span>
    <span className="arch-letter arch-glyph" aria-hidden="true">
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
          </linearGradient>
        </defs>}
        <path d={ARCH_LINUX_PATH} fill={sheenId ? `url(#${sheenId})` : undefined} />
      </svg>
    </span>
    <span className="arch-letter" aria-hidden="true"><span>R</span></span>
    <span className="arch-letter" aria-hidden="true"><span>K</span></span>
  </span>;
}
