"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Image as DreiImage, RoundedBox, Text } from "@react-three/drei";
import { CuboidCollider, Physics, RigidBody, useRopeJoint, type RapierRigidBody } from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import * as THREE from "three";
import { profile } from "@/data/profile";

const CARD_WIDTH = 2.15;
const CARD_HEIGHT = 3;
const CARD_SCALE = 0.82;
const CARD_HALF_WIDTH = (CARD_WIDTH * CARD_SCALE) / 2;
const CARD_HALF_HEIGHT = (CARD_HEIGHT * CARD_SCALE) / 2;
const ROPE_LENGTH = 1.08;
const ANCHOR_Y = 2.42;
const CARD_TOP_LOCAL_Y = 1.42;
const INITIAL_CARD_Y = ANCHOR_Y - CARD_TOP_LOCAL_Y * CARD_SCALE - 1.04;

function CardPhysicsRig() {
  const anchor = useRef<RapierRigidBody>(null!);
  const card = useRef<RapierRigidBody>(null!);
  const dragging = useRef(false);
  const activePointerId = useRef<number | null>(null);
  const grabOffset = useRef(new THREE.Vector3());
  const dragTarget = useRef(new THREE.Vector3());
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const pointerNdc = useMemo(() => new THREE.Vector2(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const strapGeometry = useMemo(() => {
    const geometry = new MeshLineGeometry();
    geometry.setPoints([[0, ANCHOR_Y, 0], [0, ANCHOR_Y - 1.04, 0]]);
    return geometry;
  }, []);
  const strapMaterial = useMemo(() => new MeshLineMaterial({ color: "#8997ff", lineWidth: 0.065, resolution: new THREE.Vector2(640, 640), sizeAttenuation: 1, opacity: 0.98 }), []);
  const { size, camera, gl, viewport } = useThree();
  const anchorX = Math.max(0, Math.min(viewport.width * 0.285, viewport.width / 2 - CARD_HALF_WIDTH - 0.18));
  const cardRadius = Math.hypot(CARD_HALF_WIDTH, CARD_HALF_HEIGHT);
  const maxDragX = Math.max(0.3, viewport.width / 2 - cardRadius - 0.16);
  const maxDragY = Math.max(0.3, viewport.height / 2 - cardRadius - 0.12);

  useRopeJoint(anchor, card, [[0, 0, 0], [0, CARD_TOP_LOCAL_Y * CARD_SCALE, 0], ROPE_LENGTH]);

  useFrame(() => {
    const body = card.current;
    if (!body) return;
    const position = body.translation();
    if (dragging.current) {
      const dx = dragTarget.current.x - position.x;
      const dy = dragTarget.current.y - position.y;
      const speed = Math.hypot(dx, dy) * 11;
      const scale = speed > 7 ? 7 / speed : 1;
      body.setLinvel({ x: dx * 11 * scale, y: dy * 11 * scale, z: 0 }, true);
    }
    const rotation = body.rotation();
    const cardRotation = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    const strapOffset = new THREE.Vector3(0, CARD_TOP_LOCAL_Y * CARD_SCALE, 0).applyQuaternion(cardRotation);
    const end = new THREE.Vector3(position.x + strapOffset.x, position.y + strapOffset.y, position.z + strapOffset.z);
    const midpoint = new THREE.Vector3(anchorX + (end.x - anchorX) * 0.52, (ANCHOR_Y + end.y) / 2 - Math.min(0.18, Math.abs(end.x - anchorX) * 0.09), (end.z + 0.02));
    strapGeometry.setPoints(new THREE.QuadraticBezierCurve3(new THREE.Vector3(anchorX, ANCHOR_Y, 0), midpoint, end).getPoints(18));
  });

  useEffect(() => {
    strapMaterial.resolution.set(size.width, size.height);
  }, [size.width, size.height, strapMaterial]);

  useEffect(() => {
    const updateDragTarget = (event: PointerEvent) => {
      if (!dragging.current || event.pointerId !== activePointerId.current) return;
      const bounds = gl.domElement.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      pointerNdc.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointerNdc, camera);
      const point = raycaster.ray.intersectPlane(dragPlane, new THREE.Vector3());
      if (!point) return;
      dragTarget.current.set(
        THREE.MathUtils.clamp(point.x + grabOffset.current.x, -maxDragX, maxDragX),
        THREE.MathUtils.clamp(point.y + grabOffset.current.y, -maxDragY, maxDragY),
        0,
      );
      event.preventDefault();
    };

    const finishDrag = (event: PointerEvent) => {
      if (!dragging.current || event.pointerId !== activePointerId.current) return;
      dragging.current = false;
      activePointerId.current = null;
      if (gl.domElement.hasPointerCapture(event.pointerId)) gl.domElement.releasePointerCapture(event.pointerId);
      document.body.style.cursor = "";
      card.current?.wakeUp();
    };

    window.addEventListener("pointermove", updateDragTarget, { passive: false });
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
    return () => {
      window.removeEventListener("pointermove", updateDragTarget);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      document.body.style.cursor = "";
    };
  }, [camera, dragPlane, gl, maxDragX, maxDragY, pointerNdc, raycaster]);

  function onPointerDown(event: ThreeEvent<PointerEvent>) {
    if (!card.current) return;
    event.stopPropagation();
    event.nativeEvent.preventDefault();
    dragging.current = true;
    activePointerId.current = event.pointerId;
    gl.domElement.setPointerCapture(event.pointerId);
    const bodyPosition = card.current.translation();
    dragTarget.current.set(bodyPosition.x, bodyPosition.y, bodyPosition.z);
    grabOffset.current.set(bodyPosition.x - event.point.x, bodyPosition.y - event.point.y, bodyPosition.z - event.point.z);
    document.body.style.cursor = "grabbing";
  }

  return <>
    <mesh geometry={strapGeometry} material={strapMaterial} frustumCulled={false} />
    <RigidBody ref={anchor} type="fixed" colliders={false} position={[anchorX, ANCHOR_Y, 0]} />
    <RigidBody ref={card} colliders={false} position={[anchorX, INITIAL_CARD_Y, 0]} mass={0.9} linearDamping={1.05} angularDamping={1.25} restitution={0.025} friction={0.85}>
      <CuboidCollider args={[CARD_HALF_WIDTH, CARD_HALF_HEIGHT, 0.075 * CARD_SCALE]} />
      <group scale={CARD_SCALE} onPointerDown={onPointerDown} onPointerOver={() => { document.body.style.cursor = "grab"; }} onPointerOut={() => { if (!dragging.current) document.body.style.cursor = ""; }}>
        <RoundedBox args={[CARD_WIDTH, CARD_HEIGHT, 0.16]} radius={0.18} smoothness={8}>
          <meshPhysicalMaterial color="#17171d" roughness={0.22} metalness={0.38} clearcoat={0.9} clearcoatRoughness={0.14} />
        </RoundedBox>
        <mesh position={[0, 0, 0.083]}><planeGeometry args={[1.99, 2.83]} /><meshStandardMaterial color="#101116" roughness={0.58} metalness={0.12} /></mesh>
        <mesh position={[0, 1.46, 0.115]}><torusGeometry args={[0.15, 0.035, 10, 32]} /><meshPhysicalMaterial color="#aeb5d2" metalness={0.82} roughness={0.2} /></mesh>
        <Text position={[0, 1.18, 0.12]} fontSize={0.09} color="#c2c4d1" anchorX="center" anchorY="middle" letterSpacing={0.07}>PERSONAL PORTFOLIO</Text>
        <Text position={[0.79, 1.18, 0.12]} fontSize={0.065} color="#8d91a5" anchorX="center" anchorY="middle" letterSpacing={0.04}>01 / 01</Text>
        <RoundedBox args={[1.78, 1.48, 0.045]} radius={0.13} smoothness={6} position={[0, 0.25, 0.105]}>
          <meshPhysicalMaterial color="#282a37" roughness={0.3} metalness={0.22} clearcoat={0.55} />
        </RoundedBox>
        <DreiImage url="/images/profile-placeholder.svg" position={[0, 0.25, 0.132]} scale={[1.62, 1.32]} toneMapped={false} />
        <mesh position={[0, 0.25, 0.137]}><planeGeometry args={[1.62, 1.32]} /><meshBasicMaterial color="#7c8cff" transparent opacity={0.1} /></mesh>
        <mesh position={[-0.78, -0.69, 0.12]}><planeGeometry args={[0.035, 0.08]} /><meshBasicMaterial color="#7c8cff" /></mesh>
        <Text position={[0, -0.69, 0.12]} fontSize={0.19} color="#f4f4f5" anchorX="center" anchorY="middle" maxWidth={1.72} textAlign="center">{profile.name}</Text>
        <Text position={[0, -0.96, 0.12]} fontSize={0.078} color="#c2c2cc" anchorX="center" anchorY="middle" letterSpacing={0.085}>{profile.role.toUpperCase()}</Text>
        <mesh position={[-0.81, -1.25, 0.12]}><circleGeometry args={[0.045, 32]} /><meshBasicMaterial color="#91a0ff" /></mesh>
        <Text position={[0.03, -1.25, 0.12]} fontSize={0.072} color="#d6d6dc" anchorX="center" anchorY="middle" letterSpacing={0.055}>AVAILABLE FOR FREELANCE</Text>
      </group>
    </RigidBody>
    <ContactShadows position={[anchorX, -2.02, -0.65]} opacity={0.28} scale={5.2} blur={2.5} far={3.5} />
  </>;
}

function CardRig() {
  return <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}><CardPhysicsRig /></Physics>;
}

export function HeroIdCardScene() {
  return <div className="hero-card-stage hero-card-canvas" role="group" aria-label="Interactive 3D ID card; drag the card to swing it">
    <div className="hero-glow" aria-hidden="true" />
    <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 0.05, 8], fov: 34 }} gl={{ alpha: true, antialias: true }} onCreated={({ gl }) => { gl.setClearColor("#000000", 0); }}>
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 4, 5]} intensity={2.3} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[2, 1.1, 3]} intensity={26} color="#7c8cff" />
      <pointLight position={[-2, -1, 2]} intensity={8} color="#c6a7ff" />
      <CardRig />
    </Canvas>
    <span className="sr-only">Drag the card with a pointer to swing it. The card uses a CSS fallback on small screens, when reduced motion is enabled, or if WebGL is unavailable.</span>
  </div>;
}