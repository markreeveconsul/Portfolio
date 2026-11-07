import { archConstellation } from "@/data/arch-constellation";

const pct = (value: number) => `${(value * 100).toFixed(3)}%`;

/**
 * Per-element keyframes with literal values (no CSS variables), so the browser
 * can run every star and link on the compositor thread. They keep moving even
 * while the main thread is busy loading the page.
 */
const KEYFRAMES = [
  ...archConstellation.stars.map((star, index) => `@keyframes bcs${index}{0%{opacity:0;transform:translate(${star.scatterX.toFixed(2)}vw,${star.scatterY.toFixed(2)}vh) scale(.5)}20%{opacity:.85}100%{opacity:1;transform:translate(0,0) scale(1)}}`),
  ...archConstellation.links.map((link, index) => `@keyframes bcl${index}{from{opacity:0;transform:rotate(${link.angle.toFixed(2)}deg) scaleX(0)}to{opacity:1;transform:rotate(${link.angle.toFixed(2)}deg) scaleX(1)}}`),
].join("");

/**
 * Stars that fly in from the background constellation and link up into the
 * Arch logo, rendered inside the glyph box. Plain server-rendered HTML + CSS,
 * so it plays from the first paint, before any JavaScript runs.
 */
export function BootConstellation() {
  return <span className="bc" aria-hidden="true">
    <style>{KEYFRAMES}</style>
    {archConstellation.links.map((link, index) => <i
      key={`l${index}`}
      className={`bc-link${link.chord ? " is-chord" : ""}`}
      style={{ left: pct(link.x), top: pct(link.y), width: pct(link.length), transform: `rotate(${link.angle.toFixed(2)}deg)`, animation: `bcl${index} .35s ease-out ${link.delay.toFixed(3)}s both, bc-link-out .6s ease-in 2.1s forwards` }}
    />)}
    {archConstellation.stars.map((star, index) => <i
      key={`s${index}`}
      className={`bc-star${star.bright ? " is-bright" : ""}`}
      style={{ left: pct(star.x), top: pct(star.y), animation: star.bright
        ? `bcs${index} 1.15s cubic-bezier(.16,1,.3,1) ${star.delay.toFixed(3)}s both, bc-twinkle .5s ease-in-out 1.6s 2 alternate, bc-star-out .7s ease-in 2.55s forwards`
        : `bcs${index} 1.15s cubic-bezier(.16,1,.3,1) ${star.delay.toFixed(3)}s both, bc-star-out .6s ease-in 2.15s forwards` }}
    />)}
  </span>;
}
