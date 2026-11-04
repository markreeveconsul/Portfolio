"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { profile } from "@/data/profile";
import { profileFacts } from "@/data/profile-facts";

const CARD_WIDTH = 2.45;
const CARD_HEIGHT = 3.5;
const CARD_DEPTH = 0.06;
const CARD_HALF_WIDTH = CARD_WIDTH / 2;

function createCardGeometry() {
  const halfWidth = CARD_WIDTH / 2;
  const halfHeight = CARD_HEIGHT / 2;
  const corner = 0.14;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + corner, -halfHeight);
  shape.lineTo(halfWidth - corner, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + corner);
  shape.lineTo(halfWidth, halfHeight - corner);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - corner, halfHeight);
  shape.lineTo(-halfWidth + corner, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - corner);
  shape.lineTo(-halfWidth, -halfHeight + corner);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + corner, -halfHeight);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: CARD_DEPTH - 0.02,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    curveSegments: 8,
  });
  geometry.computeBoundingBox();
  if (geometry.boundingBox) geometry.translate(0, 0, -(geometry.boundingBox.min.z + geometry.boundingBox.max.z) / 2);
  return geometry;
}

type DragState = { active: boolean; pointerId: number | null; x: number; y: number };

function FloatingCard({ paused, fast, faceBack }: { paused: boolean; fast: boolean; faceBack: boolean }) {
  const card = useRef<THREE.Group>(null);
  const targetRotation = useRef({ x: 0, y: 0 });
  const drag = useRef<DragState>({ active: false, pointerId: null, x: 0, y: 0 });
  const cardGeometry = useMemo(createCardGeometry, []);
  const { gl, viewport } = useThree();
  const cardX = Math.max(0, Math.min(2, viewport.width / 2 - CARD_HALF_WIDTH - 0.35));

  useEffect(() => () => cardGeometry.dispose(), [cardGeometry]);

  useEffect(() => {
    const turns = Math.round(targetRotation.current.y / (Math.PI * 2));
    targetRotation.current.y = turns * Math.PI * 2 + (faceBack ? Math.PI : 0);
  }, [faceBack]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const activeDrag = drag.current;
      if (!activeDrag.active || event.pointerId !== activeDrag.pointerId) return;
      const dx = event.clientX - activeDrag.x;
      const dy = event.clientY - activeDrag.y;
      activeDrag.x = event.clientX;
      activeDrag.y = event.clientY;
      targetRotation.current.y += dx * 0.012;
      targetRotation.current.x = THREE.MathUtils.clamp(targetRotation.current.x + dy * 0.01, -1.15, 1.15);
      event.preventDefault();
    };
    const finish = (event: PointerEvent) => {
      if (!drag.current.active || event.pointerId !== drag.current.pointerId) return;
      drag.current.active = false;
      drag.current.pointerId = null;
      if (gl.domElement.hasPointerCapture(event.pointerId)) gl.domElement.releasePointerCapture(event.pointerId);
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      document.body.style.cursor = "";
    };
  }, [gl]);

  useFrame((state, delta) => {
    const mesh = card.current;
    if (!mesh) return;
    if (!paused && !drag.current.active) targetRotation.current.y += delta * (fast ? 2.2 : Math.PI * 2 / 22);
    mesh.rotation.y = THREE.MathUtils.damp(mesh.rotation.y, targetRotation.current.y, drag.current.active ? 13 : 4.2, delta);
    mesh.rotation.x = THREE.MathUtils.damp(mesh.rotation.x, targetRotation.current.x, 8, delta);
    mesh.rotation.z = THREE.MathUtils.damp(mesh.rotation.z, -targetRotation.current.x * 0.12, 5, delta);
    mesh.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.075;
  });

  function startDrag(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    event.nativeEvent.preventDefault();
    drag.current = { active: true, pointerId: event.pointerId, x: event.nativeEvent.clientX, y: event.nativeEvent.clientY };
    gl.domElement.setPointerCapture(event.pointerId);
    document.body.style.cursor = "grabbing";
  }

  return <group ref={card} position={[cardX, 0, 0]} onPointerDown={startDrag} onPointerOver={() => { if (!drag.current.active) document.body.style.cursor = "grab"; }} onPointerOut={() => { if (!drag.current.active) document.body.style.cursor = ""; }}>
    <mesh geometry={cardGeometry}>
      <meshPhysicalMaterial color="#101219" roughness={0.4} metalness={0.22} clearcoat={0.42} clearcoatRoughness={0.28} />
    </mesh>

    {/* Front: typography and a single printed accent, without a raised faceplate. */}
    <mesh position={[-0.93, 0.72, 0.032]}><boxGeometry args={[0.025, 0.46, 0.002]} /><meshBasicMaterial color="#8997ff" /></mesh>
    <Text position={[-0.82, 1.36, 0.032]} fontSize={0.085} color="#bfc1d0" anchorX="left" anchorY="middle" letterSpacing={0.08}>PORTFOLIO</Text>
    <Text position={[0.9, 1.36, 0.032]} fontSize={0.07} color="#84899d" anchorX="right" anchorY="middle" letterSpacing={0.04}>01 / 01</Text>
    <Text position={[-0.82, 0.86, 0.032]} fontSize={0.245} color="#f2f2f5" anchorX="left" anchorY="middle" maxWidth={1.78} textAlign="left">{profile.name}</Text>
    <Text position={[-0.82, 0.48, 0.032]} fontSize={0.095} color="#b5b7c4" anchorX="left" anchorY="middle" letterSpacing={0.015} maxWidth={1.78} textAlign="left">{profile.role.toUpperCase()}</Text>
    <mesh position={[-0.38, -0.13, 0.032]}><boxGeometry args={[1.12, 0.01, 0.002]} /><meshBasicMaterial color="#333746" /></mesh>
    <Text position={[-0.82, -0.43, 0.032]} fontSize={0.075} color="#8f95ab" anchorX="left" anchorY="middle" letterSpacing={0.055}>CURRENT FOCUS</Text>
    <Text position={[-0.82, -0.78, 0.032]} fontSize={0.13} color="#d8d9e0" anchorX="left" anchorY="middle" maxWidth={1.82} textAlign="left">Useful digital experiences</Text>
    <Text position={[-0.82, -1.32, 0.032]} fontSize={0.068} color="#858a9c" anchorX="left" anchorY="middle" letterSpacing={0.04}>IT STUDENT · DEVELOPER</Text>

    {/* Back: editable facts, kept short so they remain readable while the card turns. */}
    <group rotation={[0, Math.PI, 0]}>
      <Text position={[-0.86, 1.34, 0.032]} fontSize={0.08} color="#bfc1d0" anchorX="left" anchorY="middle" letterSpacing={0.055}>A FEW THINGS ABOUT ME</Text>
      {profileFacts.map((fact, index) => {
        const y = 0.7 - index * 0.78;
        return <group key={fact.label}>
          <mesh position={[-0.52, y - 0.2, 0.032]}><boxGeometry args={[1.84, 0.01, 0.002]} /><meshBasicMaterial color="#303643" /></mesh>
          <Text position={[-0.86, y + 0.06, 0.032]} fontSize={0.07} color="#929bb9" anchorX="left" anchorY="middle" letterSpacing={0.05}>{fact.label}</Text>
          <Text position={[-0.86, y - 0.11, 0.032]} fontSize={0.12} color="#e1e2e7" anchorX="left" anchorY="middle" maxWidth={1.72} textAlign="left">{fact.value}</Text>
        </group>;
      })}
    </group>
  </group>;
}

function CardRig({ paused, fast, faceBack }: { paused: boolean; fast: boolean; faceBack: boolean }) {
  return <FloatingCard paused={paused} fast={fast} faceBack={faceBack} />;
}

function HoldToBoost({ fast, onChange }: { fast: boolean; onChange: (value: boolean) => void }) {
  return <button className="id-control id-control-boost" type="button" aria-pressed={fast} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onChange(true); }} onPointerUp={() => onChange(false)} onPointerCancel={() => onChange(false)} onPointerLeave={() => onChange(false)} onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") onChange(true); }} onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") onChange(false); }} onBlur={() => onChange(false)} onContextMenu={(event) => event.preventDefault()}><span className="boost-icon" aria-hidden="true">↗</span>Hold to speed up</button>;
}

export function HeroIdCardScene() {
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const [faceBack, setFaceBack] = useState(false);
  return <div className="hero-card-stage hero-card-canvas" role="group" aria-label="Floating 3D portfolio card">
    <Canvas dpr={[1, 1.4]} camera={{ position: [0, 0.05, 8], fov: 34 }} gl={{ alpha: true, antialias: true }} onCreated={({ gl }) => { gl.setClearColor("#000000", 0); }}>
      <ambientLight intensity={1.25} />
      <directionalLight position={[3, 4, 5]} intensity={1.8} />
      <pointLight position={[2, 0.8, 3]} intensity={7} color="#8997ff" />
      <pointLight position={[-2, -1, 2]} intensity={3} color="#7bd7d1" />
      <CardRig paused={paused} fast={fast} faceBack={faceBack} />
    </Canvas>
    <div className="id-control-dock" role="group" aria-label="ID card controls">
      <button className="id-control" type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>{paused ? "Resume spin" : "Pause to read"}</button>
      <button className="id-control" type="button" aria-pressed={faceBack} onClick={() => { setPaused(true); setFaceBack((value) => !value); }}>{faceBack ? "Show front" : "Read the back"}</button>
      <HoldToBoost fast={fast} onChange={setFast} />
    </div>
    <span className="sr-only">The card slowly rotates. Drag it to tilt, pause it to read, or hold the speed control to spin faster.</span>
  </div>;
}
