"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type CSSProperties, type ErrorInfo, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { profileFacts } from "@/data/profile-facts";
import { fitCardText, idCardCopy, idCardCssVars } from "@/data/id-card-design";

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
  const cardStyle = { ...idCardCssVars, transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` } as CSSProperties;
  const nameSize = fitCardText(idCardCopy.name, 23, 180, 15);
  const roleSize = fitCardText(idCardCopy.role, 8.5, 180, 7);
  const focusSize = fitCardText(idCardCopy.focus, 13, 180, 10);

  return <div className="hero-card-stage css-id-stage" role="group" aria-label="Floating portfolio card">
    <div className={`css-id-orbit${paused ? " is-paused" : ""}${fast ? " is-boosted" : ""}${faceBack && paused ? " is-directed is-back" : ""}`}>
      <div className="css-id-float">
        <div className="css-id-card" style={cardStyle} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
          <div className="css-id-face css-id-front"><span className="css-id-label"><span>{idCardCopy.frontLabel}</span><small>{idCardCopy.serial}</small></span><span className="css-id-accent" aria-hidden="true" /><strong style={{ fontSize: `${nameSize}px` }}>{idCardCopy.name}</strong><span className="css-id-role" style={{ fontSize: `${roleSize}px` }}>{idCardCopy.role}</span><span className="css-id-rule" /><span className="css-id-focus-label">{idCardCopy.focusLabel}</span><span className="css-id-focus" style={{ fontSize: `${focusSize}px` }}>{idCardCopy.focus}</span><span className="css-id-trace" aria-hidden="true" /></div>
          <div className="css-id-face css-id-back"><span className="css-id-label">{idCardCopy.backHeading}</span>{profileFacts.map((fact, index) => <div className={`css-id-fact css-id-fact-${index + 1}`} key={fact.label}><small>{fact.label}</small><span style={{ fontSize: `${fitCardText(fact.value, 13, 180, 10)}px` }}>{fact.value}</span></div>)}</div>
        </div>
      </div>
    </div>
    <div className="id-control-dock id-control-dock-fallback" role="group" aria-label="ID card controls">
      <button className="id-control" type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>{paused ? "Resume spin" : "Pause to read"}</button>
      <button className="id-control" type="button" aria-pressed={faceBack} onClick={() => { setPaused(true); setFaceBack((value) => !value); }}>{faceBack ? "Show front" : "Read the back"}</button>
      <button className="id-control id-control-boost" type="button" aria-pressed={fast} onPointerDown={() => setFast(true)} onPointerUp={() => setFast(false)} onPointerCancel={() => setFast(false)} onPointerLeave={() => setFast(false)} onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") setFast(true); }} onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") setFast(false); }} onBlur={() => setFast(false)}>Hold to speed up</button>
    </div>
    <span className="sr-only">The card slowly rotates. Drag it to tilt, pause it to read, or hold the speed control to spin faster.</span>
  </div>;
}

const InteractiveScene = dynamic(() => import("./floating-id-card-scene").then((module) => module.HeroIdCardScene), {
  ssr: false,
  loading: () => <CssIdCard />,
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
  if (mode === "checking") return <CssIdCard reducedMotion={reducedMotion} />;
  return <SceneErrorBoundary fallback={<CssIdCard reducedMotion />}><InteractiveScene /></SceneErrorBoundary>;
}
