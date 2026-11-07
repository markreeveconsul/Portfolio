import { ARCH_LINUX_PATH } from "@/data/id-card-design";

/**
 * The Arch logo outline as a constellation: evenly spaced stars along the
 * outline plus the links between them, in the logo's viewBox units
 * (x 0 → 24, y 0.605 → 23.395). Pure maths, computed once at import, so the
 * server and the browser produce identical markup (no hydration mismatch) and
 * the boot intro can render it as plain HTML/CSS from the first paint.
 */
export type ConstellationStar = { x: number; y: number; scatterX: number; scatterY: number; delay: number; bright: boolean };
export type ConstellationLink = { x: number; y: number; length: number; angle: number; delay: number; chord: boolean };

const STARS = 46;
const VIEW = { x: 0, y: 0.605, width: 24, height: 22.79 };

/** Flattens the path into a polyline (cubic Béziers sampled; the two tiny arcs become lines). */
function flatten(d: string) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const points: [number, number][] = [];
  let index = 0;
  let command = "";
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  const next = () => Number(tokens[index++]);
  const isNumber = () => index < tokens.length && !/[a-zA-Z]/.test(tokens[index]);
  while (index < tokens.length) {
    if (!isNumber()) command = tokens[index++];
    const relative = command === command.toLowerCase();
    const ox = relative ? x : 0;
    const oy = relative ? y : 0;
    switch (command.toLowerCase()) {
      case "m": x = ox + next(); y = oy + next(); startX = x; startY = y; points.push([x, y]); command = relative ? "l" : "L"; break;
      case "l": x = ox + next(); y = oy + next(); points.push([x, y]); break;
      case "c": {
        const [x1, y1, x2, y2, ex, ey] = [ox + next(), oy + next(), ox + next(), oy + next(), ox + next(), oy + next()];
        for (let step = 1; step <= 24; step += 1) {
          const t = step / 24;
          const u = 1 - t;
          points.push([u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * ex, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ey]);
        }
        x = ex; y = ey;
        break;
      }
      case "a": next(); next(); next(); next(); next(); x = ox + next(); y = oy + next(); points.push([x, y]); break;
      case "z": x = startX; y = startY; points.push([x, y]); break;
      default: index = tokens.length; // unknown command: stop rather than throw at import time
    }
  }
  return points;
}

function build() {
  const outline = flatten(ARCH_LINUX_PATH);
  const lengths = [0];
  for (let k = 1; k < outline.length; k += 1) lengths.push(lengths[k - 1] + Math.hypot(outline[k][0] - outline[k - 1][0], outline[k][1] - outline[k - 1][1]));
  const total = lengths[lengths.length - 1] || 1;

  // Deterministic randomness, so server and client agree.
  let seed = 0x2a9c1;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };

  const points: [number, number][] = [];
  for (let n = 0; n < STARS; n += 1) {
    const target = (n / STARS) * total;
    let k = 1;
    while (k < lengths.length - 1 && lengths[k] < target) k += 1;
    const f = (target - lengths[k - 1]) / (lengths[k] - lengths[k - 1] || 1);
    points.push([outline[k - 1][0] + (outline[k][0] - outline[k - 1][0]) * f, outline[k - 1][1] + (outline[k][1] - outline[k - 1][1]) * f]);
  }

  // Stars start scattered across the screen (vw / vh offsets) and fly into place.
  const stars: ConstellationStar[] = points.map(([x, y], n) => {
    const angle = random() * Math.PI * 2;
    const distance = 22 + random() * 30;
    return {
      x: (x - VIEW.x) / VIEW.width,
      y: (y - VIEW.y) / VIEW.height,
      scatterX: Math.cos(angle) * distance,
      scatterY: Math.sin(angle) * distance * 0.75,
      delay: 0.2 + random() * 0.55 + (n % 3) * 0.04,
      bright: n % 6 === 0,
    };
  });

  // Links trace the outline in order, then a few short chords add the constellation look.
  const link = (a: number, b: number, delay: number, chord: boolean): ConstellationLink => {
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    // In units of the glyph box width (the box has the viewBox's aspect ratio, so one scale fits both axes).
    return { x: (ax - VIEW.x) / VIEW.width, y: (ay - VIEW.y) / VIEW.height, length: Math.hypot(bx - ax, by - ay) / VIEW.width, angle: (Math.atan2(by - ay, bx - ax) * 180) / Math.PI, delay, chord };
  };
  const links: ConstellationLink[] = points.map((_, n) => link(n, (n + 1) % STARS, 1.0 + n * 0.012, false));
  for (let a = 0; a < STARS; a += 1) {
    for (let b = a + 4; b < STARS; b += 1) {
      const distance = Math.hypot(points[a][0] - points[b][0], points[a][1] - points[b][1]);
      if (distance < 2.4 && (a + b) % 3 === 0) links.push(link(a, b, 1.3 + random() * 0.25, true));
    }
  }
  return { stars, links };
}

export const archConstellation = build();
