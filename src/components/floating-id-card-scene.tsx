"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { idCardDimensions, idCardPalette } from "@/data/id-card-design";
import type { CardFaceCanvases } from "@/components/id-card-textures";

const CARD_WIDTH = idCardDimensions.width;
const CARD_HEIGHT = idCardDimensions.height;
const CARD_DEPTH = idCardDimensions.depth;
const CARD_HALF_WIDTH = CARD_WIDTH / 2;
const FACE_WIDTH = CARD_HEIGHT * (380 / 590);
const FACE_HALF_WIDTH = FACE_WIDTH / 2;
const sheenVertexShader = `
  varying vec2 vUv;
  varying vec3 vViewPosition;
  varying vec3 vViewNormal;
  void main() {
    vUv = uv;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -viewPosition.xyz;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewPosition;
  }
`;
const sheenFragmentShader = `
  varying vec2 vUv;
  varying vec3 vViewPosition;
  varying vec3 vViewNormal;
  void main() {
    float facing = abs(dot(normalize(vViewNormal), normalize(vViewPosition)));
    float diagonal = vUv.x + (1.0 - vUv.y) * 0.34;
    float sweepCenter = 0.52 + (1.0 - facing) * 0.55;
    float distanceFromSweep = abs(diagonal - sweepCenter);
    float band = 1.0 - smoothstep(0.12, 0.48, distanceFromSweep);
    float hueShift = clamp((diagonal - sweepCenter + 0.32) / 0.64, 0.0, 1.0);
    vec3 ice = vec3(0.66, 0.84, 0.91);
    vec3 pearl = vec3(0.91, 0.92, 0.94);
    vec3 lilac = vec3(0.83, 0.73, 0.88);
    vec3 rose = vec3(0.91, 0.76, 0.86);
    vec3 champagne = vec3(0.96, 0.91, 0.76);
    vec3 spectrum = mix(ice, lilac, smoothstep(0.08, 0.38, hueShift));
    spectrum = mix(spectrum, rose, smoothstep(0.38, 0.62, hueShift));
    spectrum = mix(spectrum, champagne, smoothstep(0.62, 0.82, hueShift));
    spectrum = mix(spectrum, pearl, smoothstep(0.82, 1.0, hueShift));
    float intensity = min(0.22 + (1.0 - facing) * 0.16, 0.36);
    gl_FragColor = vec4(spectrum, band * intensity);
  }
`;
const foilFragmentShader = `
  varying vec2 vUv;
  varying vec3 vViewPosition;
  varying vec3 vViewNormal;
  void main() {
    float facing = abs(dot(normalize(vViewNormal), normalize(vViewPosition)));
    float t = vUv.y;
    vec3 graphite = vec3(0.42, 0.45, 0.49);
    vec3 pearl = vec3(0.93, 0.94, 0.96);
    vec3 platinum = vec3(0.75, 0.79, 0.84);
    vec3 ice = vec3(0.66, 0.84, 0.91);
    vec3 lilac = vec3(0.82, 0.70, 0.88);
    vec3 rose = vec3(0.91, 0.72, 0.84);
    vec3 champagne = vec3(0.96, 0.88, 0.68);
    vec3 spectrum = mix(graphite, pearl, smoothstep(0.0, 0.12, t));
    spectrum = mix(spectrum, platinum, smoothstep(0.12, 0.27, t));
    spectrum = mix(spectrum, ice, smoothstep(0.27, 0.38, t));
    spectrum = mix(spectrum, lilac, smoothstep(0.38, 0.48, t));
    spectrum = mix(spectrum, rose, smoothstep(0.48, 0.59, t));
    spectrum = mix(spectrum, pearl, smoothstep(0.59, 0.72, t));
    spectrum = mix(spectrum, platinum, smoothstep(0.72, 0.88, t));
    spectrum = mix(spectrum, graphite, smoothstep(0.88, 1.0, t));
    float angleLift = 0.78 + (1.0 - facing) * 0.22;
    gl_FragColor = vec4(spectrum, angleLift);
  }
`;

function createCardGeometry() {
  const halfWidth = CARD_WIDTH / 2;
  const halfHeight = CARD_HEIGHT / 2;
  const corner = idCardDimensions.cornerRadius;
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

function FloatingCard({ paused, fast, faceBack, faces, onFlip }: {
  paused: boolean;
  fast: boolean;
  faceBack: boolean;
  faces: CardFaceCanvases;
  onFlip: () => void;
}) {
  const card = useRef<THREE.Group>(null);
  const targetRotation = useRef({ x: 0, y: 0 });
  const drag = useRef<DragState>({ active: false, pointerId: null, x: 0, y: 0 });
  const cardGeometry = useMemo(createCardGeometry, []);
  const { gl, viewport } = useThree();
  const cardX = Math.max(0, Math.min(2, viewport.width / 2 - CARD_HALF_WIDTH - 0.35));
  const textures = useMemo(() => {
    const front = new THREE.CanvasTexture(faces.front);
    const back = new THREE.CanvasTexture(faces.back);
    for (const texture of [front, back]) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = gl.capabilities.getMaxAnisotropy();
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
    }
    return { front, back };
  }, [faces, gl]);
  const faceGeometry = useMemo(() => new THREE.PlaneGeometry(FACE_WIDTH, CARD_HEIGHT), []);
  const foilGeometry = useMemo(() => new THREE.PlaneGeometry(0.035, CARD_HEIGHT * (498 / 590)), []);
  const foilMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: idCardPalette.platinum,
    metalness: 0.82,
    roughness: 0.64,
    iridescence: 1.0,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [120, 460],
    clearcoat: 0.14,
    clearcoatRoughness: 0.72,
  }), []);
  const foilSpectrumMaterial = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: sheenVertexShader,
    fragmentShader: foilFragmentShader,
  }), []);
  const sheenMaterial = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: sheenVertexShader,
    fragmentShader: sheenFragmentShader,
  }), []);
  const frontFaceMaterial = useMemo(() => new THREE.MeshBasicMaterial({ map: textures.front, toneMapped: false, transparent: true, alphaTest: 0.05, depthWrite: false }), [textures.front]);
  const backFaceMaterial = useMemo(() => new THREE.MeshBasicMaterial({ map: textures.back, toneMapped: false, transparent: true, alphaTest: 0.05, depthWrite: false }), [textures.back]);

  useEffect(() => () => {
    cardGeometry.dispose();
    faceGeometry.dispose();
    foilGeometry.dispose();
    textures.front.dispose();
    textures.back.dispose();
    foilMaterial.dispose();
    foilSpectrumMaterial.dispose();
    sheenMaterial.dispose();
    frontFaceMaterial.dispose();
    backFaceMaterial.dispose();
  }, [cardGeometry, faceGeometry, foilGeometry, textures, foilMaterial, foilSpectrumMaterial, sheenMaterial, frontFaceMaterial, backFaceMaterial]);

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

  return <group ref={card} position={[cardX, 0, 0]} onPointerDown={startDrag} onClick={(event) => { if (event.delta < 6) onFlip(); }} onPointerOver={() => { if (!drag.current.active) document.body.style.cursor = "grab"; }} onPointerOut={() => { if (!drag.current.active) document.body.style.cursor = ""; }}>
    <mesh geometry={cardGeometry}>
      <meshPhysicalMaterial color={idCardPalette.card} roughness={0.52} metalness={0.12} clearcoat={0.2} clearcoatRoughness={0.52} />
    </mesh>
    <mesh geometry={faceGeometry} position={[0, 0, CARD_DEPTH / 2 + 0.002]} material={frontFaceMaterial} />
    <mesh geometry={faceGeometry} position={[0, 0, -CARD_DEPTH / 2 - 0.002]} rotation={[0, Math.PI, 0]} material={backFaceMaterial} />
    <mesh geometry={faceGeometry} position={[0, 0, CARD_DEPTH / 2 + 0.004]} material={sheenMaterial} renderOrder={2} />
    <mesh geometry={faceGeometry} position={[0, 0, -CARD_DEPTH / 2 - 0.004]} rotation={[0, Math.PI, 0]} material={sheenMaterial} renderOrder={2} />
    <mesh geometry={foilGeometry} position={[FACE_HALF_WIDTH - 0.065, 0, CARD_DEPTH / 2 + 0.006]} material={foilMaterial} renderOrder={3} />
    <mesh geometry={foilGeometry} position={[-(FACE_HALF_WIDTH - 0.065), 0, -CARD_DEPTH / 2 - 0.006]} rotation={[0, Math.PI, 0]} material={foilMaterial} renderOrder={3} />
    <mesh geometry={foilGeometry} position={[FACE_HALF_WIDTH - 0.065, 0, CARD_DEPTH / 2 + 0.008]} material={foilSpectrumMaterial} renderOrder={4} />
    <mesh geometry={foilGeometry} position={[-(FACE_HALF_WIDTH - 0.065), 0, -CARD_DEPTH / 2 - 0.008]} rotation={[0, Math.PI, 0]} material={foilSpectrumMaterial} renderOrder={4} />
  </group>;
}

function CardRig({ paused, fast, faceBack, faces, onFlip }: {
  paused: boolean;
  fast: boolean;
  faceBack: boolean;
  faces: CardFaceCanvases;
  onFlip: () => void;
}) {
  return <FloatingCard paused={paused} fast={fast} faceBack={faceBack} faces={faces} onFlip={onFlip} />;
}

function HoldToBoost({ fast, onChange }: { fast: boolean; onChange: (value: boolean) => void }) {
  return <button className="id-control id-control-boost" type="button" aria-pressed={fast} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onChange(true); }} onPointerUp={() => onChange(false)} onPointerCancel={() => onChange(false)} onPointerLeave={() => onChange(false)} onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") onChange(true); }} onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") onChange(false); }} onBlur={() => onChange(false)} onContextMenu={(event) => event.preventDefault()}>Hold to speed up</button>;
}

export function HeroIdCardScene({ faces }: { faces: CardFaceCanvases }) {
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const [faceBack, setFaceBack] = useState(false);
  const flip = () => setFaceBack((value) => !value);
  return <div className="hero-card-stage hero-card-canvas" role="group" aria-label="Floating 3D portfolio card">
    <Canvas dpr={[1, 1.4]} camera={{ position: [0, 0.05, 8], fov: 34 }} gl={{ alpha: true, antialias: true }} onCreated={({ gl }) => { gl.setClearColor("#000000", 0); }}>
      <ambientLight intensity={0.82} />
      <directionalLight position={[2, 3, 5]} intensity={1.25} />
      <directionalLight position={[-3, -1, -4]} intensity={0.35} color="#C9D0DA" />
      <CardRig paused={paused} fast={fast} faceBack={faceBack} faces={faces} onFlip={flip} />
    </Canvas>
    <div className="id-control-dock" role="group" aria-label="ID card controls">
      <button className="id-control" type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>{paused ? "Resume spin" : "Pause to read"}</button>
      <button className="id-control" type="button" aria-pressed={faceBack} onClick={flip}>{faceBack ? "Show front" : "Read the back"}</button>
      <HoldToBoost fast={fast} onChange={setFast} />
    </div>
    <span className="sr-only">The card slowly rotates. Drag it to tilt, pause it to read, or hold the speed control to spin faster.</span>
  </div>;
}
