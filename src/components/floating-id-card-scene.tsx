"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { idCardDimensions, idCardPalette, idCardRendering } from "@/data/id-card-design";
import { getCardSurfaceNormalCanvas, type CardFaceCanvases } from "@/components/id-card-textures";
import { heroScrollState } from "@/lib/hero-scroll";

const CARD_WIDTH = idCardDimensions.width;
const CARD_HEIGHT = idCardDimensions.height;
const CARD_DEPTH = idCardDimensions.depth;
const SOURCE_ASPECT = 380 / 590;
const MODEL_VISUAL_SCALE_X = (CARD_HEIGHT * SOURCE_ASPECT) / CARD_WIDTH;
const CARD_PRESENTATION_SCALE = 0.82;
const CARD_HALF_WIDTH = (CARD_WIDTH * MODEL_VISUAL_SCALE_X * CARD_PRESENTATION_SCALE) / 2;
const FACE_WIDTH = CARD_WIDTH;
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
    float band = 1.0 - smoothstep(0.12, 0.42, distanceFromSweep);
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
    float intensity = min(0.08 + (1.0 - facing) * 0.2, 0.22);
    gl_FragColor = vec4(spectrum, band * intensity);
  }
`;
const foilFragmentShader = `
  varying vec2 vUv;
  varying vec3 vViewPosition;
  varying vec3 vViewNormal;
  void main() {
    float facing = abs(dot(normalize(vViewNormal), normalize(vViewPosition)));
    float glancing = 1.0 - facing;
    float t = vUv.y;
    vec3 graphite = vec3(0.42, 0.45, 0.49);
    vec3 pearl = vec3(0.93, 0.94, 0.96);
    vec3 platinum = vec3(0.75, 0.79, 0.84);
    vec3 ice = vec3(0.66, 0.84, 0.91);
    vec3 lilac = vec3(0.82, 0.70, 0.88);
    vec3 rose = vec3(0.91, 0.72, 0.84);
    vec3 champagne = vec3(0.96, 0.88, 0.68);
    float phase = clamp(t + glancing * 0.2, 0.0, 1.0);
    vec3 spectrum = mix(graphite, pearl, smoothstep(0.0, 0.12, phase));
    spectrum = mix(spectrum, platinum, smoothstep(0.12, 0.27, phase));
    spectrum = mix(spectrum, ice, smoothstep(0.27, 0.38, phase));
    spectrum = mix(spectrum, lilac, smoothstep(0.38, 0.48, phase));
    spectrum = mix(spectrum, rose, smoothstep(0.48, 0.59, phase));
    spectrum = mix(spectrum, pearl, smoothstep(0.59, 0.72, phase));
    spectrum = mix(spectrum, platinum, smoothstep(0.72, 0.88, phase));
    spectrum = mix(spectrum, graphite, smoothstep(0.88, 1.0, phase));
    float iridescence = smoothstep(0.12, 0.72, glancing);
    vec3 foil = mix(platinum, spectrum, iridescence * 0.88);
    float visibility = 0.62 + iridescence * 0.32;
    gl_FragColor = vec4(foil, visibility);
  }
`;
const ruleFragmentShader = `
  varying vec2 vUv;
  void main() {
    float x = vUv.x;
    vec3 graphite = vec3(0.56, 0.59, 0.64);
    vec3 pearl = vec3(0.93, 0.94, 0.96);
    vec3 ice = vec3(0.66, 0.84, 0.91);
    vec3 lilac = vec3(0.91, 0.72, 0.84);
    vec3 champagne = vec3(1.0, 0.91, 0.71);
    vec3 spectrum = mix(graphite, pearl, smoothstep(0.0, 0.18, x));
    spectrum = mix(spectrum, ice, smoothstep(0.18, 0.32, x));
    spectrum = mix(spectrum, lilac, smoothstep(0.32, 0.46, x));
    spectrum = mix(spectrum, champagne, smoothstep(0.46, 0.60, x));
    spectrum = mix(spectrum, pearl, smoothstep(0.60, 0.74, x));
    spectrum = mix(spectrum, graphite, smoothstep(0.74, 1.0, x));
    gl_FragColor = vec4(spectrum, 1.0);
  }
`;
const shadowFragmentShader = `
  uniform float uOpacity;
  uniform float uInner;
  uniform float uOuter;
  varying vec2 vUv;
  void main() {
    vec2 point = (vUv - 0.5) * vec2(1.0, 1.12);
    float distanceFromCenter = length(point);
    float softness = 1.0 - smoothstep(uInner, uOuter, distanceFromCenter);
    // Squared falloff reads as a soft penumbra instead of a hard-edged disc.
    gl_FragColor = vec4(0.0, 0.0, 0.0, softness * softness * uOpacity);
  }
`;

function createShadowMaterial(opacity: number, inner: number, outer: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uOpacity: { value: opacity }, uInner: { value: inner }, uOuter: { value: outer } },
    vertexShader: sheenVertexShader,
    fragmentShader: shadowFragmentShader,
  });
}

function createNormalTexture(canvas: HTMLCanvasElement, repeatX: number, repeatY: number, anisotropy: number) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = anisotropy;
  return texture;
}

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
    bevelSegments: idCardRendering.geometry.bevelSegments,
    steps: 1,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    curveSegments: idCardRendering.geometry.curveSegments,
  });
  geometry.computeBoundingBox();
  if (geometry.boundingBox) geometry.translate(0, 0, -(geometry.boundingBox.min.z + geometry.boundingBox.max.z) / 2);

  // ExtrudeGeometry emits the two cap faces first (group 0: back cap, then front
  // cap), followed by bevel and side triangles. Give both caps stable, full-card
  // UVs so the canvas textures sit directly on the rounded card. The cap vertex
  // count depends on curveSegments, so read it from the generated lid group.
  const positions = geometry.getAttribute("position");
  const uvs = geometry.getAttribute("uv");
  const lidGroup = geometry.groups.find((group) => group.materialIndex === 0);
  if (!lidGroup || lidGroup.start !== 0 || lidGroup.count % 6 !== 0) throw new Error("Unexpected ID card geometry layout.");
  const capVertexCount = lidGroup.count;
  for (let index = 0; index < capVertexCount; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const isBackCap = index < capVertexCount / 2;
    const rawU = (x + halfWidth) / CARD_WIDTH;
    const u = isBackCap ? 1 - rawU : rawU;
    const v = (y + halfHeight) / CARD_HEIGHT;
    uvs.setXY(index, u, v);
  }
  uvs.needsUpdate = true;
  geometry.clearGroups();
  geometry.addGroup(0, capVertexCount / 2, 1); // back, viewed from -Z
  geometry.addGroup(capVertexCount / 2, capVertexCount / 2, 0); // front, viewed from +Z
  geometry.addGroup(capVertexCount, positions.count - capVertexCount, 2); // original beveled shell
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
  const scrollRig = useRef<THREE.Group>(null);
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
  const surfaceNormals = useMemo(() => {
    const canvas = getCardSurfaceNormalCanvas(idCardRendering.surfaceNormalSize);
    const anisotropy = gl.capabilities.getMaxAnisotropy();
    const [faceRepeatX, faceRepeatY] = idCardRendering.face.normalRepeat;
    return {
      face: createNormalTexture(canvas, faceRepeatX, faceRepeatY, anisotropy),
      shell: createNormalTexture(canvas, idCardRendering.shell.normalRepeat, idCardRendering.shell.normalRepeat, anisotropy),
    };
  }, [gl]);
  const shadowGeometry = useMemo(() => new THREE.PlaneGeometry(CARD_WIDTH * MODEL_VISUAL_SCALE_X * CARD_PRESENTATION_SCALE * 1.35, CARD_HEIGHT * CARD_PRESENTATION_SCALE * 1.22), []);
  // A tight contact shadow plus a wide, faint penumbra under it.
  const shadowMaterial = useMemo(() => createShadowMaterial(0.2, 0.12, 0.5), []);
  const penumbraMaterial = useMemo(() => createShadowMaterial(0.09, 0.05, 0.5), []);
  const foilGeometry = useMemo(() => new THREE.PlaneGeometry(0.035, CARD_HEIGHT * (498 / 590)), []);
  const ruleGeometry = useMemo(() => new THREE.PlaneGeometry(CARD_WIDTH * (56 / 380), CARD_HEIGHT * (3 / 590)), []);
  const foilMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: idCardPalette.platinum,
    metalness: 0.9,
    roughness: idCardRendering.foil.roughness,
    envMapIntensity: idCardRendering.foil.envMapIntensity,
    iridescence: 1.0,
    iridescenceIOR: 1.3,
    iridescenceThicknessMinimum: 120,
    iridescenceThicknessMaximum: 460,
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
  const ruleMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: sheenVertexShader,
    fragmentShader: ruleFragmentShader,
  }), []);
  const sheenMaterial = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    side: THREE.DoubleSide,
    vertexShader: sheenVertexShader,
    fragmentShader: sheenFragmentShader,
  }), []);
  // Face artwork goes through the emissive channel with a black base color, so
  // it shows exactly as authored (no tone mapping, no light tinting). The
  // physical material then adds a glossy clearcoat with a fine grain on top,
  // which is what makes the face catch moving highlights like real plastic.
  const createFaceMaterial = (artwork: THREE.Texture) => {
    const face = idCardRendering.face;
    return new THREE.MeshPhysicalMaterial({
      color: 0x000000,
      emissive: 0xffffff,
      emissiveMap: artwork,
      roughness: face.roughness,
      metalness: 0,
      specularIntensity: face.specularIntensity,
      clearcoat: face.clearcoat,
      clearcoatRoughness: face.clearcoatRoughness,
      clearcoatNormalMap: surfaceNormals.face,
      clearcoatNormalScale: new THREE.Vector2(face.clearcoatNormalScale, face.clearcoatNormalScale),
      envMapIntensity: face.envMapIntensity,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
  };
  const frontFaceMaterial = useMemo(() => createFaceMaterial(textures.front), [textures.front, surfaceNormals]);
  const backFaceMaterial = useMemo(() => createFaceMaterial(textures.back), [textures.back, surfaceNormals]);
  const shellMaterial = useMemo(() => {
    const shell = idCardRendering.shell;
    return new THREE.MeshPhysicalMaterial({
      color: idCardPalette.card,
      roughness: shell.roughness,
      metalness: shell.metalness,
      clearcoat: shell.clearcoat,
      clearcoatRoughness: shell.clearcoatRoughness,
      normalMap: surfaceNormals.shell,
      normalScale: new THREE.Vector2(shell.normalScale, shell.normalScale),
      envMapIntensity: shell.envMapIntensity,
    });
  }, [surfaceNormals]);
  const sheenSideMaterial = useMemo(() => new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }), []);
  const cardMaterials = useMemo(() => [frontFaceMaterial, backFaceMaterial, shellMaterial], [frontFaceMaterial, backFaceMaterial, shellMaterial]);
  const sheenMaterials = useMemo(() => [sheenMaterial, sheenMaterial, sheenSideMaterial], [sheenMaterial, sheenSideMaterial]);

  useEffect(() => () => {
    cardGeometry.dispose();
    shadowGeometry.dispose();
    foilGeometry.dispose();
    ruleGeometry.dispose();
    textures.front.dispose();
    textures.back.dispose();
    surfaceNormals.face.dispose();
    surfaceNormals.shell.dispose();
    penumbraMaterial.dispose();
    foilMaterial.dispose();
    foilSpectrumMaterial.dispose();
    ruleMaterial.dispose();
    sheenMaterial.dispose();
    frontFaceMaterial.dispose();
    backFaceMaterial.dispose();
    shellMaterial.dispose();
    sheenSideMaterial.dispose();
    shadowMaterial.dispose();
  }, [cardGeometry, shadowGeometry, foilGeometry, ruleGeometry, textures, surfaceNormals, penumbraMaterial, foilMaterial, foilSpectrumMaterial, ruleMaterial, sheenMaterial, frontFaceMaterial, backFaceMaterial, shellMaterial, sheenSideMaterial, shadowMaterial]);

  useEffect(() => {
    if (!faceBack && !paused) return;
    const turns = Math.round(targetRotation.current.y / (Math.PI * 2));
    targetRotation.current.y = turns * Math.PI * 2 + (faceBack ? Math.PI : 0);
    if (paused) targetRotation.current.x = 0;
  }, [faceBack, paused]);

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
      delete document.documentElement.dataset.cursorHint;
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

    // Scroll-linked exit: as the hero scrolls away the card tips back, sinks, and shrinks.
    const rig = scrollRig.current;
    if (rig) {
      const progress = heroScrollState.progress;
      rig.rotation.x = THREE.MathUtils.damp(rig.rotation.x, -progress * 0.7, 6, delta);
      rig.position.y = THREE.MathUtils.damp(rig.position.y, -progress * 0.9, 6, delta);
      rig.scale.setScalar(THREE.MathUtils.damp(rig.scale.x, 1 - progress * 0.18, 6, delta));
    }
  });

  function startDrag(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    event.nativeEvent.preventDefault();
    drag.current = { active: true, pointerId: event.pointerId, x: event.nativeEvent.clientX, y: event.nativeEvent.clientY };
    gl.domElement.setPointerCapture(event.pointerId);
    document.body.style.cursor = "grabbing";
  }

  return <group ref={scrollRig}>
    <mesh geometry={shadowGeometry} material={penumbraMaterial} position={[cardX, -0.14, -0.2]} scale={[1.35, 1.25, 1]} renderOrder={0} />
    <mesh geometry={shadowGeometry} material={shadowMaterial} position={[cardX, -0.08, -0.16]} renderOrder={0} />
    <group ref={card} position={[cardX, 0, 0]} scale={[MODEL_VISUAL_SCALE_X * CARD_PRESENTATION_SCALE, CARD_PRESENTATION_SCALE, CARD_PRESENTATION_SCALE]} onPointerDown={startDrag} onClick={(event) => { if (event.delta < 6) onFlip(); }} onPointerOver={() => { document.documentElement.dataset.cursorHint = "drag"; if (!drag.current.active) document.body.style.cursor = "grab"; }} onPointerOut={() => { delete document.documentElement.dataset.cursorHint; if (!drag.current.active) document.body.style.cursor = ""; }}>
    <mesh geometry={cardGeometry} material={cardMaterials} />
    <mesh geometry={cardGeometry} material={sheenMaterials} renderOrder={2} />
    <mesh geometry={ruleGeometry} position={[-CARD_WIDTH / 2 + CARD_WIDTH * (50 / 380), CARD_HEIGHT / 2 - CARD_HEIGHT * (472.5 / 590), CARD_DEPTH / 2 + 0.009]} material={ruleMaterial} renderOrder={3} />
    <mesh geometry={foilGeometry} position={[FACE_HALF_WIDTH - 0.065, 0, CARD_DEPTH / 2 + 0.006]} material={foilMaterial} renderOrder={3} />
    <mesh geometry={foilGeometry} position={[-(FACE_HALF_WIDTH - 0.065), 0, -CARD_DEPTH / 2 - 0.006]} rotation={[0, Math.PI, 0]} material={foilMaterial} renderOrder={3} />
    <mesh geometry={foilGeometry} position={[FACE_HALF_WIDTH - 0.065, 0, CARD_DEPTH / 2 + 0.008]} material={foilSpectrumMaterial} renderOrder={4} />
    <mesh geometry={foilGeometry} position={[-(FACE_HALF_WIDTH - 0.065), 0, -CARD_DEPTH / 2 - 0.008]} rotation={[0, Math.PI, 0]} material={foilSpectrumMaterial} renderOrder={4} />
    </group>
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

/** Calls `onReady` once, after the first frame has actually been drawn (shaders compiled, textures uploaded). */
function FirstFrame({ onReady }: { onReady?: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(() => onReady?.());
  });
  return null;
}

export function HeroIdCardScene({ faces, onReady }: { faces: CardFaceCanvases; onReady?: () => void }) {
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const [faceBack, setFaceBack] = useState(false);
  const flip = () => setFaceBack((value) => !value);
  return <div className="hero-card-stage hero-card-canvas" role="group" aria-label="Floating 3D portfolio card">
    <Canvas dpr={[1, idCardRendering.maxDpr]} camera={{ position: [0, 0.05, 8], fov: 34 }} gl={{
      alpha: true,
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: idCardRendering.toneMappingExposure,
      outputColorSpace: THREE.SRGBColorSpace,
    }} onCreated={({ gl }) => { gl.setClearColor("#000000", 0); }}>
      {/* Studio softboxes rendered once into the environment map (no network HDR). */}
      <Environment resolution={256} frames={1} environmentIntensity={idCardRendering.environmentIntensity}>
        <Lightformer form="rect" intensity={2.4} color="#F4F2EC" position={[0, 3.2, 5]} scale={[6, 2.2]} />
        <Lightformer form="rect" intensity={1.1} color="#C9D0DA" position={[-5, 0.5, 2]} scale={[2.2, 5]} />
        <Lightformer form="rect" intensity={1.6} color="#E9DDF0" position={[5, -0.5, -3]} scale={[1.4, 6]} />
        <Lightformer form="ring" intensity={0.8} color="#A8E6F0" position={[2, -3, 4]} scale={1.6} />
      </Environment>
      <ambientLight intensity={0.4} />
      <directionalLight position={[2, 3, 5]} intensity={1.1} />
      <directionalLight position={[-3, -1, -4]} intensity={0.35} color="#C9D0DA" />
      <CardRig paused={paused} fast={fast} faceBack={faceBack} faces={faces} onFlip={flip} />
      <FirstFrame onReady={onReady} />
    </Canvas>
    <div className="id-control-dock" role="group" aria-label="ID card controls">
      <button className="id-control" type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>{paused ? "Resume spin" : "Pause to read"}</button>
      <button className="id-control" type="button" aria-pressed={faceBack} onClick={flip}>{faceBack ? "Show front" : "Read the back"}</button>
      <HoldToBoost fast={fast} onChange={setFast} />
    </div>
    <span className="sr-only">The card slowly rotates. Drag it to tilt, pause it to read, or hold the speed control to spin faster.</span>
  </div>;
}
