import { ARCH_LINUX_PATH } from "@/data/id-card-design";

/**
 * "MARK" set in the display font with the A replaced by the Arch Linux logo,
 * which already reads as an A. The real word is exposed to assistive tech.
 */
export function ArchWordmark({ className = "", label = "Mark" }: { className?: string; label?: string }) {
  return <span className={`arch-wordmark ${className}`} role="img" aria-label={label}>
    <span className="arch-letter" aria-hidden="true"><span>M</span></span>
    <span className="arch-letter arch-glyph" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false"><path d={ARCH_LINUX_PATH} /></svg>
    </span>
    <span className="arch-letter" aria-hidden="true"><span>R</span></span>
    <span className="arch-letter" aria-hidden="true"><span>K</span></span>
  </span>;
}
