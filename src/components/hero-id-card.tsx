"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { getIdCardFaceCanvases, type CardFaceCanvases } from "@/components/id-card-textures";
import { idCardCopy } from "@/data/id-card-design";

function CssIdCard({ faces, reducedMotion }: { faces: CardFaceCanvases | null; reducedMotion: boolean }) {
  const [faceBack, setFaceBack] = useState(false);
  const frontImage = faces?.front.toDataURL("image/webp", 0.94);
  const backImage = faces?.back.toDataURL("image/webp", 0.94);

  return <div className={`hero-card-stage css-id-stage${reducedMotion ? " reduced-motion" : ""}`} role="group" aria-label="Portfolio ID card">
    <button className={`css-flat-card${faceBack ? " is-back" : ""}`} type="button" aria-label={faceBack ? "Show the front of Mark’s card" : "Flip card to see the system profile"} onClick={() => setFaceBack((value) => !value)}>
      <span className="css-flat-card-inner">
        <span className="css-flat-face css-flat-front">{frontImage ? <img src={frontImage} alt="Front of Mark Reeve Consul’s portfolio ID card" /> : <span className="css-flat-loading"><b>MARK<br />REEVE<br />CONSUL</b><small>IT student · Full stack dev</small></span>}</span>
        <span className="css-flat-face css-flat-back">{backImage ? <img src={backImage} alt="Back of Mark Reeve Consul’s portfolio ID card, showing his system profile" /> : <span className="css-flat-loading"><b>system profile</b><small>Mark Reeve Consul<br />Backend · Networking<br />Arch Linux (btw)</small></span>}</span>
      </span>
    </button>
    <p className="css-flat-hint">{idCardCopy.interactionHint}</p>
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
  const [fallbackMode, setFallbackMode] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let active = true;
    getIdCardFaceCanvases().then((result) => { if (active) setFaces(result); }).catch(() => { if (active) setTextureError(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 680px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(motion.matches);
      setFallbackMode(mobile.matches || motion.matches || !canRenderWebGL());
    };
    update();
    mobile.addEventListener("change", update);
    motion.addEventListener("change", update);
    return () => { mobile.removeEventListener("change", update); motion.removeEventListener("change", update); };
  }, []);

  if (!faces) return <CssIdCard faces={null} reducedMotion={reducedMotion} />;
  const cssFallback = <CssIdCard faces={faces} reducedMotion={reducedMotion} />;
  if (fallbackMode || textureError) return cssFallback;
  return <SceneErrorBoundary fallback={cssFallback}><InteractiveScene faces={faces} /></SceneErrorBoundary>;
}
