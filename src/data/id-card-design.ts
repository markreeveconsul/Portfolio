export const idCardDimensions = {
  width: 2.45,
  height: 3.5,
  depth: 0.06,
  cornerRadius: 0.14,
} as const;

export const idCardPalette = {
  shell: "#101b20",
  front: "#0e121a",
  back: "#111a20",
  edge: "rgba(104,221,211,.22)",
  accent: "#57e2d3",
  accentSoft: "#22504f",
  label: "#75b9b4",
  secondary: "#9dc7c5",
  primaryText: "#f2f2f5",
  bodyText: "#d8e7e5",
  factText: "#e1e2e7",
  factLabel: "#92b9b6",
  backRule: "#303643",
} as const;

export const idCardCopy = {
  name: "Mark Reeve Consul",
  role: "IT STUDENT · FULL STACK DEVELOPER",
  frontLabel: "NET ID / PORTFOLIO",
  serial: "PROFILE 001",
  focusLabel: "CURRENT FOCUS",
  focus: "Backend development & networking",
  backHeading: "A FEW THINGS ABOUT ME",
} as const;

export const idCardCssVars = {
  "--id-card-aspect": `${idCardDimensions.width} / ${idCardDimensions.height}`,
  "--id-shell": idCardPalette.shell,
  "--id-front": idCardPalette.front,
  "--id-back": idCardPalette.back,
  "--id-edge": idCardPalette.edge,
  "--id-accent": idCardPalette.accent,
  "--id-accent-soft": idCardPalette.accentSoft,
  "--id-label": idCardPalette.label,
  "--id-secondary": idCardPalette.secondary,
  "--id-primary-text": idCardPalette.primaryText,
  "--id-body-text": idCardPalette.bodyText,
  "--id-fact-text": idCardPalette.factText,
  "--id-fact-label": idCardPalette.factLabel,
  "--id-back-rule": idCardPalette.backRule,
} as const;

export function fitCardText(text: string, max: number, width: number, min: number) {
  const estimatedCharacterWidth = 0.62;
  return Math.max(min, Math.min(max, width / Math.max(1, text.length * estimatedCharacterWidth)));
}
