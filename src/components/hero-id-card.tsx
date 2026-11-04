"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ErrorInfo, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { profile } from "@/data/profile";
import { profileFacts } from "@/data/profile-facts";

function CssIdCard({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const [paused, setPaused] = useState(reducedMotion);
  const [fast, setFast] = useState(false);
  const [faceBack, setFaceBack] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    setPaused(true);
  }
  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointer.current || pointer.current.id !== event.pointerId) return;
    const dx = event.clientX - pointer.current.x;
    const dy = event.clientY - pointer.current.y;
    pointer.current.x = event.clientX;
    pointer.current.y = event.clientY;
    setTilt((value) => ({ x: Math.max(-35, Math.min(35, value.x + dy * 0.35)), y: value.y + dx * 0.45 }));
  }
  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null;
  }
  return <div className="hero-card-stage css-id-stage" role="group" aria-label="Floating portfolio card">
    <div className={`css-id-orbit${paused ? " is-paused" : ""}${fast ? " is-boosted" : ""}${faceBack && paused ? " is-directed is-back" : ""}`}>
      <div className="css-id-float">
        <div className="css-id-card" style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
          <div className="css-id-face css-id-front"><span className="css-id-label">PORTFOLIO <small>01 / 01</small></span><span className="css-id-accent" aria-hidden="true" /><strong>{profile.name}</strong><span className="css-id-role">{profile.role.toUpperCase()}</span><span className="css-id-rule" /><span className="css-id-focus-label">CURRENT FOCUS</span><span className="css-id-focus">Useful digital experiences</span><small className="css-id-footer">IT STUDENT · DEVELOPER</small></div>
          <div className="css-id-face css-id-back"><span className="css-id-label">A FEW THINGS ABOUT ME</span>{profileFacts.map((fact) => <div className="css-id-fact" key={fact.label}><small>{fact.label}</small><span>{fact.value}</span></div>)}</div>
        </div>
      </div>
    </div>
    <div className="id-control-dock id-control-dock-fallback" role="group" aria-label="ID card controls">
      <button className="id-control" type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>{paused ? "Resume spin" : "Pause to read"}</button>
      <button className="id-control" type="button" aria-pressed={faceBack} onClick={() => { setPaused(true); setFaceBack((value) => !value); }}>{faceBack ? "Show front" : "Read the back"}</button>
      <button className="id-control id-control-boost" type="button" aria-pressed={fast} onPointerDown={() => setFast(true)} onPointerUp={() => setFast(false)} onPointerCancel={() => setFast(false)} onPointerLeave={() => setFast(false)} onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") setFast(true); }} onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") setFast(false); }} onBlur={() => setFast(false)}><span className="boost-icon" aria-hidden="true">↗</span>Hold to speed up</button>
    </div>
    <span className="sr-only">The card slowly rotates. Drag it to tilt, pause it to read, or hold the speed control to spin faster.</span>
  </div>;
}

function LoadingIdCard() {
  return <div className="hero-card-stage hero-card-loading" aria-hidden="true" />;
}

const InteractiveScene = dynamic(() => import("./floating-id-card-scene").then((module) => module.HeroIdCardScene), {
  ssr: false,
  loading: () => <LoadingIdCard />,
});

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
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* The CSS card remains available if WebGL fails. */ }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

export function HeroIdCard() {
  const [mode, setMode] = useState<"checking" | "interactive" | "fallback">("checking");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 680px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(motion.matches);
      setMode(mobile.matches || motion.matches || !canRenderWebGL() ? "fallback" : "interactive");
    };
    update();
    mobile.addEventListener("change", update);
    motion.addEventListener("change", update);
    return () => { mobile.removeEventListener("change", update); motion.removeEventListener("change", update); };
  }, []);

  if (mode === "fallback") return <CssIdCard reducedMotion={reducedMotion} />;
  if (mode === "checking") return <LoadingIdCard />;
  return <SceneErrorBoundary fallback={<CssIdCard reducedMotion />}><InteractiveScene /></SceneErrorBoundary>;
}
