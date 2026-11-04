import {
  ARCH_LINUX_SVG,
  CARD_PHOTO_SRC,
  PORTFOLIO_URL,
  cardFacePixels,
  idCardCopy,
  idCardPalette,
} from "@/data/id-card-design";

// @ts-expect-error qrcode is a CommonJS package without bundled TypeScript declarations.
import QRCode from "qrcode";

export type CardFaceCanvases = { front: HTMLCanvasElement; back: HTMLCanvasElement };

let cachedFaces: Promise<CardFaceCanvases> | null = null;

function canvas2d(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Unable to create the ID card texture canvas.");
  context.scale(cardFacePixels.scale, cardFacePixels.scale);
  return context;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load card image: ${src}`));
    image.src = src;
  });
}

function loadedFontFamily(variableName: string, fallback: string) {
  const value = getComputedStyle(document.body).getPropertyValue(variableName).trim();
  return value || fallback;
}

function drawNoise(ctx: CanvasRenderingContext2D) {
  const grain = document.createElement("canvas");
  grain.width = 640;
  grain.height = 640;
  const grainCtx = grain.getContext("2d");
  if (!grainCtx) return;
  const pixels = grainCtx.createImageData(grain.width, grain.height);
  let seed = 0x29a71;
  for (let index = 0; index < pixels.data.length; index += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const value = 104 + (seed & 0x7f);
    pixels.data[index] = value;
    pixels.data[index + 1] = value;
    pixels.data[index + 2] = value;
    pixels.data[index + 3] = 255;
  }
  grainCtx.putImageData(pixels, 0, 0);
  const pattern = ctx.createPattern(grain, "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, cardFacePixels.textureWidth, cardFacePixels.textureHeight);
  ctx.restore();
}

function drawCardShell(ctx: CanvasRenderingContext2D) {
  ctx.save();
  roundRect(ctx, 0.5, 0.5, 379, 589, 22);
  ctx.clip();
  ctx.fillStyle = idCardPalette.card;
  ctx.fillRect(0, 0, 380, 590);
  ctx.strokeStyle = idCardPalette.edge;
  ctx.lineWidth = 1;
  roundRect(ctx, 0.5, 0.5, 379, 589, 22);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.035)";
  ctx.fillRect(1, 1, 378, 1);
  ctx.restore();
}

function drawSlot(ctx: CanvasRenderingContext2D) {
  roundRect(ctx, 158, 22, 64, 12, 6);
  ctx.fillStyle = idCardPalette.background;
  ctx.fill();
  ctx.strokeStyle = idCardPalette.edge;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawGrayscalePhoto(ctx: CanvasRenderingContext2D, image: HTMLImageElement | null, monoFont: string) {
  const x = 22;
  const y = 79;
  const width = 336;
  const height = 236;
  ctx.save();
  roundRect(ctx, x, y, width, height, 12);
  ctx.clip();
  if (image) {
    const ratio = Math.max(width / image.width, height / image.height);
    const drawWidth = image.width * ratio;
    const drawHeight = image.height * ratio;
    ctx.filter = "grayscale(1)";
    ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
    ctx.filter = "none";
  } else {
    ctx.fillStyle = "#1A1D22";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "#1F2328";
    for (let offset = -height; offset < width + height; offset += 18) {
      ctx.beginPath();
      ctx.moveTo(x + offset, y + height);
      ctx.lineTo(x + offset + height, y);
      ctx.lineTo(x + offset + height + 9, y);
      ctx.lineTo(x + offset + 9, y + height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = idCardPalette.mute;
    ctx.font = `500 12px ${monoFont}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("[ your photo, grayscale ]", x + width / 2, y + height / 2);
  }
  ctx.restore();
  ctx.strokeStyle = idCardPalette.edge;
  ctx.lineWidth = 1;
  roundRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, 12);
  ctx.stroke();
  ctx.strokeStyle = idCardPalette.platinum;
  ctx.lineWidth = 2;
  const marks = [
    [x + 8, y + 8, 1, 1], [x + width - 8, y + 8, -1, 1],
    [x + 8, y + height - 8, 1, -1], [x + width - 8, y + height - 8, -1, -1],
  ];
  for (const [mx, my, directionX, directionY] of marks) {
    ctx.beginPath();
    ctx.moveTo(mx, my + directionY * 14);
    ctx.lineTo(mx, my);
    ctx.lineTo(mx + directionX * 14, my);
    ctx.stroke();
  }
}

function drawNetworkMark(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = "rgba(236,234,228,.25)";
  ctx.lineWidth = 1;
  const points = [[200, 364], [280, 414], [370, 374], [260, 494], [350, 474]] as const;
  for (const [from, to] of [[0, 1], [1, 2], [1, 3], [3, 4], [2, 4]] as const) {
    ctx.beginPath();
    ctx.moveTo(points[from][0], points[from][1]);
    ctx.lineTo(points[to][0], points[to][1]);
    ctx.stroke();
  }
  points.forEach(([x, y], index) => {
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = index === 4 ? idCardPalette.platinum : idCardPalette.card;
    ctx.fill();
    ctx.strokeStyle = index === 4 ? idCardPalette.platinum : "rgba(236,234,228,.35)";
    ctx.stroke();
  });
  ctx.restore();
}

function drawQRPanel(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number) {
  roundRect(ctx, x, y, 56, 56, 6);
  ctx.fillStyle = idCardPalette.ink;
  ctx.fill();
  ctx.drawImage(image, x + 4, y + 4, 48, 48);
}

function drawFront(ctx: CanvasRenderingContext2D, displayFont: string, monoFont: string, photo: HTMLImageElement | null, qr: HTMLImageElement) {
  drawCardShell(ctx);
  drawSlot(ctx);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `500 12px ${monoFont}`;
  ctx.fillStyle = idCardPalette.mute;
  ctx.fillText(idCardCopy.frontDomain.toUpperCase(), 22, 64);
  ctx.textAlign = "right";
  ctx.fillStyle = idCardPalette.ink;
  ctx.fillText(idCardCopy.availability.toUpperCase(), 358, 64);
  const availabilityWidth = ctx.measureText(idCardCopy.availability.toUpperCase()).width;
  const marker = ctx.createConicGradient(0, 260, 60);
  marker.addColorStop(0, idCardPalette.platinum);
  marker.addColorStop(0.5, idCardPalette.ink);
  marker.addColorStop(1, idCardPalette.dimPlatinum);
  ctx.beginPath();
  ctx.arc(358 - availabilityWidth - 15, 60, 4, 0, Math.PI * 2);
  ctx.fillStyle = marker;
  ctx.fill();

  drawGrayscalePhoto(ctx, photo, monoFont);
  drawNetworkMark(ctx);

  let nameSize = 44;
  const nameMaxWidth = 380 - 44 - 40;
  const setNameFont = () => { ctx.font = `800 ${nameSize}px ${displayFont}`; };
  setNameFont();
  while (Math.max(...idCardCopy.nameLines.map((line) => ctx.measureText(line.toUpperCase()).width)) > nameMaxWidth && nameSize > 12) {
    nameSize -= 0.5;
    setNameFont();
  }
  ctx.fillStyle = idCardPalette.ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = "-0.01em";
  const firstBaseline = 374;
  idCardCopy.nameLines.forEach((line, index) => ctx.fillText(line.toUpperCase(), 22, firstBaseline + index * nameSize * 0.94, nameMaxWidth));
  ctx.letterSpacing = "0px";

  const ruleY = firstBaseline + nameSize * 0.94 * 3 - nameSize * 0.1 + 10;
  const rule = ctx.createLinearGradient(22, 0, 78, 0);
  rule.addColorStop(0, idCardPalette.dimPlatinum);
  rule.addColorStop(0.5, idCardPalette.ink);
  rule.addColorStop(1, idCardPalette.dimPlatinum);
  ctx.fillStyle = rule;
  ctx.fillRect(22, ruleY, 56, 3);
  ctx.fillStyle = idCardPalette.ink;
  ctx.font = `500 14px ${monoFont}`;
  ctx.fillText(idCardCopy.frontRole, 22, ruleY + 25);

  ctx.font = `500 14px ${monoFont}`;
  ctx.fillStyle = idCardPalette.platinum;
  ctx.fillText(idCardCopy.frontSkills[0], 22, 523);
  ctx.fillText(idCardCopy.frontSkills[1], 22, 545);
  ctx.fillStyle = idCardPalette.ink;
  ctx.fillRect(22, 512, 6, 6);
  ctx.fillRect(22, 534, 6, 6);
  drawQRPanel(ctx, qr, 302, 512);
}

function drawBack(ctx: CanvasRenderingContext2D, monoFont: string, archLogo: HTMLImageElement, qr: HTMLImageElement) {
  drawCardShell(ctx);
  drawSlot(ctx);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `500 12px ${monoFont}`;
  ctx.fillStyle = idCardPalette.mute;
  ctx.fillText(idCardCopy.backHeading.toUpperCase(), 22, 64);
  ctx.drawImage(archLogo, 334, 48, 24, 24);

  ctx.font = `500 14px ${monoFont}`;
  ctx.fillStyle = idCardPalette.platinum;
  ctx.fillText(idCardCopy.terminalUser, 22, 100);
  ctx.fillStyle = idCardPalette.ink;
  ctx.fillText(idCardCopy.terminalCommand, 22 + ctx.measureText(idCardCopy.terminalUser).width, 100);
  ctx.fillText(idCardCopy.fullName, 22, 129);

  const rowsTop = 116;
  const rowHeight = 30;
  idCardCopy.backRows.forEach((row, index) => {
    const y = rowsTop + index * rowHeight;
    ctx.strokeStyle = idCardPalette.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(22, y + rowHeight - 2);
    ctx.lineTo(358, y + rowHeight - 2);
    ctx.stroke();
    ctx.font = `500 14px ${monoFont}`;
    ctx.fillStyle = idCardPalette.dimPlatinum;
    ctx.fillText(row.label, 22, y + 20);
    ctx.fillStyle = idCardPalette.ink;
    ctx.fillText(row.value, 124, y + 20, 234);
  });

  const promptY = rowsTop + idCardCopy.backRows.length * rowHeight + 20;
  ctx.font = `500 14px ${monoFont}`;
  ctx.fillStyle = idCardPalette.platinum;
  ctx.fillText(idCardCopy.terminalUser, 22, promptY);
  ctx.fillStyle = idCardPalette.ink;
  ctx.fillText(":~$", 22 + ctx.measureText(idCardCopy.terminalUser).width, promptY);
  ctx.fillRect(22 + ctx.measureText(`${idCardCopy.terminalUser}:~$ `).width, promptY - 13, 9, 17);

  ctx.strokeStyle = idCardPalette.edge;
  ctx.beginPath();
  ctx.moveTo(22, 486);
  ctx.lineTo(358, 486);
  ctx.stroke();
  ctx.font = `500 12px ${monoFont}`;
  ctx.fillStyle = idCardPalette.mute;
  ctx.fillText(idCardCopy.issued.toUpperCase(), 22, 508);
  ctx.fillStyle = idCardPalette.ink;
  ctx.fillText(idCardCopy.qrCaption[0].toUpperCase(), 22, 544);
  ctx.fillText(idCardCopy.qrCaption[1].toUpperCase(), 22, 563);
  drawQRPanel(ctx, qr, 302, 512);
}

async function createFaces(): Promise<CardFaceCanvases> {
  const displayFont = loadedFontFamily("--font-display", "Syne");
  const monoFont = loadedFontFamily("--font-card-mono", "JetBrains Mono");
  await document.fonts.load(`800 44px ${displayFont}`);
  await document.fonts.load(`500 14px ${monoFont}`);
  await document.fonts.ready;

  const qrData = await QRCode.toDataURL(PORTFOLIO_URL, {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 192,
    color: { dark: idCardPalette.card, light: idCardPalette.ink },
  });
  const qr = await loadImage(qrData);
  const photo = CARD_PHOTO_SRC ? await loadImage(CARD_PHOTO_SRC) : null;
  const arch = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(ARCH_LINUX_SVG)}`);
  const front = document.createElement("canvas");
  const back = document.createElement("canvas");
  front.width = back.width = cardFacePixels.textureWidth;
  front.height = back.height = cardFacePixels.textureHeight;
  drawFront(canvas2d(front), displayFont, monoFont, photo, qr);
  drawBack(canvas2d(back), monoFont, arch, qr);
  drawNoise(front.getContext("2d")!);
  drawNoise(back.getContext("2d")!);
  return { front, back };
}

export function getIdCardFaceCanvases() {
  if (!cachedFaces) cachedFaces = createFaces();
  return cachedFaces;
}
