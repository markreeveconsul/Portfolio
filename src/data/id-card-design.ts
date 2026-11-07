export const idCardDimensions = {
  width: 2.45,
  height: 3.5,
  depth: 0.06,
  cornerRadius: 0.14,
} as const;

/** Camera and placement of the WebGL card, shared with the loading placeholder so both line up exactly. */
export const idCardStage = { cameraY: 0.05, cameraZ: 8, fov: 34, presentationScale: 0.82, maxX: 2, edgeGap: 0.35 } as const;

/**
 * Where the WebGL card's front face lands on screen, for a canvas of
 * `width` × `height` CSS px (the canvas spans the viewport width and the hero height).
 * Mirrors the maths in floating-id-card-scene.tsx.
 */
export function idCardScreenRect(width: number, height: number) {
  const visibleHeight = 2 * idCardStage.cameraZ * Math.tan(((idCardStage.fov / 2) * Math.PI) / 180);
  const visibleWidth = visibleHeight * (width / height);
  const visualScaleX = (idCardDimensions.height * (380 / 590)) / idCardDimensions.width;
  const halfWidth = (idCardDimensions.width * visualScaleX * idCardStage.presentationScale) / 2;
  const cardX = Math.max(0, Math.min(idCardStage.maxX, visibleWidth / 2 - halfWidth - idCardStage.edgeGap));
  const pxPerUnit = height / visibleHeight;
  const cardHeight = idCardDimensions.height * idCardStage.presentationScale * pxPerUnit;
  const cardWidth = halfWidth * 2 * pxPerUnit;
  return {
    centerX: width / 2 + cardX * pxPerUnit,
    centerY: height / 2 + idCardStage.cameraY * pxPerUnit,
    width: cardWidth,
    height: cardHeight,
  };
}

export const cardFacePixels = { width: 380, height: 590, scale: 4, textureWidth: 1520, textureHeight: 2360 } as const;

// Rendering quality knobs for the WebGL card. Tune here instead of in the scene.
export const idCardRendering = {
  maxDpr: 2,
  toneMappingExposure: 1.0,
  environmentIntensity: 1.0,
  geometry: { curveSegments: 16, bevelSegments: 4 },
  surfaceNormalSize: 256,
  // Card faces: artwork is emitted unchanged; lighting only adds a glossy coat on top.
  face: {
    roughness: 0.55,
    specularIntensity: 0.35,
    clearcoat: 0.45,
    clearcoatRoughness: 0.28,
    clearcoatNormalScale: 0.12,
    envMapIntensity: 0.7,
    normalRepeat: [3, 4.5] as [number, number],
  },
  // Card edge and bevel.
  shell: {
    roughness: 0.42,
    metalness: 0.12,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
    normalScale: 0.2,
    envMapIntensity: 1.0,
    normalRepeat: 6,
  },
  foil: { roughness: 0.4, envMapIntensity: 1.2 },
} as const;

export const idCardPalette = {
  background: "#0B0C0E",
  card: "#121418",
  edge: "#2A2E35",
  ink: "#ECEAE4",
  mute: "#9AA0A8",
  platinum: "#C9D0DA",
  dimPlatinum: "#98A1AE",
  rule: "#1E2228",
} as const;

export const idCardCopy = {
  frontDomain: "consul.dev",
  availability: "Open to opportunities",
  nameLines: ["Mark", "Reeve", "Consul"],
  frontRole: "IT student · Developer",
  frontSkills: ["Websites", "Small tools"],
  backHeading: "system profile",
  terminalUser: "mark@consul",
  terminalCommand: ":~$ whoami",
  fullName: "Mark Reeve Consul",
  backRows: [
    { label: "role", value: "IT student · Developer" },
    { label: "based in", value: "Cebu, Philippines" },
    { label: "building", value: "Websites & small tools" },
    { label: "os", value: "Arch Linux (btw)" },
    { label: "off-hours", value: "Gaming between builds" },
    { label: "status", value: "Open to opportunities" },
  ],
  issued: "Issued Nov 2026 · consul.dev",
  qrCaption: ["Scan to see", "my projects"],
  interactionHint: "Drag to swing · Click to flip · Foil thread catches the light",
  lanyardText: "CONSUL.DEV · WEBSITES · SMALL TOOLS · CONSUL.DEV · WEBSITES · SMALL TOOLS · CONSUL.DEV · WEBSITES · SMALL TOOLS",
} as const;

// Arch Linux logo path (24×24 viewBox), shared by the ID card, boot intro, and wordmarks.
export const ARCH_LINUX_PATH = "M11.39.605C10.376 3.092 9.764 4.72 8.635 7.132c.693.734 1.543 1.589 2.923 2.554-1.484-.61-2.496-1.224-3.252-1.86C6.86 10.842 4.596 15.138 0 23.395c3.612-2.085 6.412-3.37 9.021-3.862a6.61 6.61 0 0 1-.171-1.547l.003-.115c.058-2.315 1.261-4.095 2.687-3.973 1.426.12 2.534 2.096 2.478 4.409a6.52 6.52 0 0 1-.146 1.243c2.58.505 5.352 1.787 8.914 3.844-.702-1.293-1.33-2.459-1.929-3.57-.943-.73-1.926-1.682-3.933-2.713 1.38.359 2.367.772 3.137 1.234-6.09-11.334-6.582-12.84-8.67-17.74z";

// Replace this one line with a public image path when the portrait is ready.
export const CARD_PHOTO_SRC: string | null = "/images/id%20pic.jpg";

// Replace this one line with the live portfolio URL before publishing the QR.
export const PORTFOLIO_URL = "https://mark-consul-dev.vercel.app";

export const ARCH_LINUX_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ECEAE4"><path d="${ARCH_LINUX_PATH}"/></svg>`;
