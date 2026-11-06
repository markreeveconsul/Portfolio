"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { getIdCardFaceCanvases, type CardFaceCanvases } from "@/components/id-card-textures";
import { idCardCopy } from "@/data/id-card-design";
import { afterBoot, useAfterBoot } from "@/lib/motion";
import { CardMaterialize } from "@/components/card-materialize";

/**
 * The WebGL card mounts this long after the boot ends: after the headline has
 * decoded and the hero copy has risen in, so the shader compile can't stutter
 * them. The materializing placeholder covers the wait.
 */
const SCENE_DELAY_MS = 1700;

// Encoding a 1520×2360 canvas is expensive. Do it once per canvas, off the
// render path (toBlob is async), and reuse the object URL on every re-render.
const encodedFaces = new WeakMap<HTMLCanvasElement, Promise<string>>();
function encodeFace(canvas: HTMLCanvasElement) {
  let encoded = encodedFaces.get(canvas);
  if (!encoded) {
    encoded = new Promise<string>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error("Card encoding failed"))), "image/webp", 0.94));
    encodedFaces.set(canvas, encoded);
  }
  return encoded;
}

const SPIN_DEG_PER_SECOND = 360 / 22; // same pace as the WebGL card
const DRAG_DEG_PER_PX = 0.6;
const TAP_SLOP_PX = 6;

/**
 * Spin, drag, and flip for the flat (phone / no-WebGL) card. It turns slowly on
 * its own, follows a horizontal drag (vertical swipes still scroll the page),
 * and flips on tap, click, Enter, or Space. Reduced motion: no auto-spin, and
 * turns land instantly. The loop only runs while the card is on screen.
 */
function useCardSpin(reducedMotion: boolean, onSideChange: (back: boolean) => void) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const flipRef = useRef<() => void>(() => {});
  const sideRef = useRef(onSideChange);
  sideRef.current = onSideChange;

  useEffect(() => {
    const button = buttonRef.current;
    const inner = innerRef.current;
    if (!button || !inner) return;
    let angle = 0;
    let target = 0;
    let back = false;
    let frame = 0;
    let last = 0;
    let visible = true;
    let booted = false;
    let drag: { id: number; x: number; moved: number } | null = null;
    let suppressClick = false;

    const render = () => {
      inner.style.transform = `rotateY(${angle.toFixed(2)}deg)`;
      const showingBack = Math.cos((angle * Math.PI) / 180) < 0;
      if (showingBack !== back) { back = showingBack; sideRef.current(back); }
    };
    const loop = (time: number) => {
      frame = 0;
      const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
      last = time;
      if (!drag && !reducedMotion) target += SPIN_DEG_PER_SECOND * dt;
      angle = reducedMotion || drag ? target : angle + (target - angle) * Math.min(1, dt * 7);
      render();
      const settled = Math.abs(target - angle) < 0.05;
      if (visible && booted && (!reducedMotion || drag || !settled)) frame = requestAnimationFrame(loop);
      else last = 0;
    };
    const kick = () => { if (!frame && visible && booted) frame = requestAnimationFrame(loop); };

    flipRef.current = () => {
      if (suppressClick) { suppressClick = false; return; }
      // Turn to the nearest half-turn, then 180° further: always a clean flip.
      target = Math.round(target / 180) * 180 + 180;
      kick();
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      suppressClick = false;
      drag = { id: event.pointerId, x: event.clientX, moved: 0 };
      kick();
    };
    const onMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      drag.x = event.clientX;
      drag.moved += Math.abs(dx);
      if (drag.moved > TAP_SLOP_PX && !button.hasPointerCapture(event.pointerId)) button.setPointerCapture(event.pointerId);
      target += dx * DRAG_DEG_PER_PX;
    };
    const onUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      if (drag.moved > TAP_SLOP_PX) suppressClick = true; // a drag is not a tap
      drag = null;
      if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
      kick();
    };

    button.addEventListener("pointerdown", onDown);
    button.addEventListener("pointermove", onMove);
    button.addEventListener("pointerup", onUp);
    button.addEventListener("pointercancel", onUp);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) kick(); });
    observer.observe(button);
    const cancelBootWait = afterBoot(() => { booted = true; kick(); });
    render();

    return () => {
      cancelAnimationFrame(frame);
      cancelBootWait();
      observer.disconnect();
      button.removeEventListener("pointerdown", onDown);
      button.removeEventListener("pointermove", onMove);
      button.removeEventListener("pointerup", onUp);
      button.removeEventListener("pointercancel", onUp);
    };
  }, [reducedMotion]);

  return { buttonRef, innerRef, flip: () => flipRef.current() };
}

function CssIdCard({ faces, reducedMotion }: { faces: CardFaceCanvases | null; reducedMotion: boolean }) {
  const [faceBack, setFaceBack] = useState(false);
  const { buttonRef, innerRef, flip } = useCardSpin(reducedMotion, setFaceBack);
  const [images, setImages] = useState<{ front: string; back: string } | null>(null);
  useEffect(() => {
    if (!faces) return;
    let active = true;
    Promise.all([encodeFace(faces.front), encodeFace(faces.back)])
      .then(([front, back]) => { if (active) setImages({ front, back }); })
      .catch(() => { /* keep the text fallback */ });
    return () => { active = false; };
  }, [faces]);
  const ready = Boolean(images);
  // Keep the placeholder briefly after the card arrives, fading out, so it's a crossfade, not a swap.
  const [placeholderGone, setPlaceholderGone] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => setPlaceholderGone(true), 800);
    return () => window.clearTimeout(timer);
  }, [ready]);

  return <div className={`hero-card-stage css-id-stage${reducedMotion ? " reduced-motion" : ""}`} role="group" aria-label="Portfolio ID card">
    {/* The button stays mounted (the spin hook needs it); it's hidden until the card images are ready. */}
    {!placeholderGone && <CardMaterialize leaving={ready} />}
    <button ref={buttonRef} className={`css-flat-card is-spinning${ready ? " is-ready" : " is-waiting"}`} type="button" aria-label={faceBack ? "Show the front of Mark’s card" : "Flip card to see the system profile"} onClick={flip} disabled={!ready}>
      <span ref={innerRef} className="css-flat-card-inner">
        <span className="css-flat-face css-flat-front">{images && <img src={images.front} alt="Front of Mark Reeve Consul’s portfolio ID card" />}<span className="css-irid-rule" aria-hidden="true" /></span>
        <span className="css-flat-face css-flat-back">{images && <img src={images.back} alt="Back of Mark Reeve Consul’s portfolio ID card, showing his system profile" />}</span>
      </span>
    </button>
    <p className={`css-flat-hint${ready ? "" : " is-waiting"}`}>{idCardCopy.interactionHint}</p>
  </div>;
}

const InteractiveScene = dynamic(() => import("./floating-id-card-scene").then((module) => module.HeroIdCardScene), { ssr: false });

function canRenderWebGL() {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

class SceneErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* The source-texture CSS card stays available if WebGL fails. */ }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

export function HeroIdCard() {
  const [faces, setFaces] = useState<CardFaceCanvases | null>(null);
  const [textureError, setTextureError] = useState(false);
  // "pending" until the first client effect decides between the flat card and WebGL.
  const [mode, setMode] = useState<"pending" | "css" | "webgl">("pending");
  const [reducedMotion, setReducedMotion] = useState(false);
  // Scene mounts only once the textures exist and the intro + hero entrance have had the main thread.
  const sceneReady = useAfterBoot(SCENE_DELAY_MS);
  const [sceneDrawn, setSceneDrawn] = useState(false);
  const [placeholderGone, setPlaceholderGone] = useState(false);
  const onSceneReady = () => {
    setSceneDrawn(true);
    window.setTimeout(() => setPlaceholderGone(true), 1000); // after the 900ms crossfade
  };

  useEffect(() => {
    let active = true;
    // During the intro, the boot sequence generates the textures at a quiet moment
    // (same cached promise); otherwise start once the page has settled.
    const cancel = afterBoot(() => {
      getIdCardFaceCanvases().then((result) => { if (active) setFaces(result); }).catch(() => { if (active) setTextureError(true); });
    });
    return () => { active = false; cancel(); };
  }, []);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 680px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(motion.matches);
      setMode(mobile.matches || motion.matches || !canRenderWebGL() ? "css" : "webgl");
    };
    update();
    mobile.addEventListener("change", update);
    motion.addEventListener("change", update);
    return () => { mobile.removeEventListener("change", update); motion.removeEventListener("change", update); };
  }, []);

  // Undecided yet (server render and first client render): reserve the space, show nothing.
  if (mode === "pending") return <div className="hero-card-stage css-id-stage" aria-hidden="true" />;

  const cssCard = <CssIdCard faces={faces} reducedMotion={reducedMotion} />;
  if (mode === "css" || textureError) return cssCard;

  // WebGL: the materializing wireframe sits exactly where the card will appear, and
  // crossfades out once the scene has drawn its first frame. The scene itself waits
  // for the boot intro and hero entrance (shader compile is heavy).
  return <>
    {!placeholderGone && <CardMaterialize floating leaving={sceneDrawn} />}
    {faces && sceneReady && <SceneErrorBoundary fallback={cssCard}><InteractiveScene faces={faces} onReady={onSceneReady} /></SceneErrorBoundary>}
  </>;
}
