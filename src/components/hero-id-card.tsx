"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import Image from "next/image";
import { profile } from "@/data/profile";

function CssIdCard({ reducedMotion = false }: { reducedMotion?: boolean }) {
  return <div className={`hero-card-stage css-id-stage${reducedMotion ? " reduced-motion" : ""}`} role="group" aria-label="Portfolio ID card preview">
    <div className="hero-glow" aria-hidden="true" />
    <div className="lanyard css-lanyard" aria-hidden="true" />
    <div className="id-card css-id-card"><div className="id-inner">
      <div className="id-top"><span>PERSONAL PORTFOLIO</span><span>01 / 01</span></div>
      <div className="id-photo"><Image src="/images/profile-placeholder.svg" alt="Profile portrait placeholder on the ID card" width={640} height={640} priority /></div>
      <div className="id-name">{profile.name}</div><div className="id-role">{profile.role.toUpperCase()}</div>
      <div className="id-bottom"><span>AVAILABLE FOR<br />FREELANCE</span><span className="id-seal" aria-hidden="true">✳</span></div>
    </div></div>
    <span className="sr-only">On larger screens, drag the card to swing it.</span>
  </div>;
}

function LoadingIdCard() {
  return <div className="hero-card-stage hero-card-loading" aria-hidden="true"><div className="hero-glow" /></div>;
}

const InteractiveScene = dynamic(() => import("./hero-id-card-scene").then((module) => module.HeroIdCardScene), {
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