"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Image as DreiImage, RoundedBox, Text } from "@react-three/drei";
import { CuboidCollider, Physics, RigidBody, useRopeJoint, type RapierRigidBody } from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import * as THREE from "three";
import { profile } from "@/data/profile";

function CardPhysicsRig() {
  const anchor = useRef<RapierRigidBody>(null!);
  const card = useRef<RapierRigidBody>(null!);
  const dragging = useRef(false);
  const grabOffset = useRef(new THREE.Vector3());
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const strapGeometry = useMemo(() => {
    const geometry = new MeshLineGeometry();
    geometry.setPoints([[0, 2.42, 0], [0, 1.38, 0]]);
    return geometry;
  }, []);
  const strapMaterial = useMemo(() => new MeshLineMaterial({ color: "#7c8cff", lineWidth: 0.055, resolution: new THREE.Vector2(640, 640), sizeAttenuation: 1, opacity: 0.95 }), []);
  const { size } = useThree();

  useRopeJoint(anchor, card, [[0, 0, 0], [0, 1.42, 0], 1.08]);

  useFrame(() => {
    const body = card.current;
    if (!body) return;
    const position = body.translation();
    strapGeometry.setPoints([[0, 2.42, 0], [position.x, position.y + 1.42, position.z]]);
  });

  useEffect(() => { strapMaterial.resolution.set(size.width, size.height); }, [size.width, size.height, strapMaterial]);

  function onPointerDown(event: ThreeEvent<PointerEvent>) {
    if (!card.current) return;
    event.stopPropagation();
    dragging.current = true;
    if (event.nativeEvent.target instanceof HTMLCanvasElement) event.nativeEvent.target.setPointerCapture(event.pointerId);
    const bodyPosition = card.current.translation();
    grabOffset.current.set(bodyPosition.x - event.point.x, bodyPosition.y - event.point.y, bodyPosition.z - event.point.z);
    document.body.style.cursor = "grabbing";
  }

  function onPointerMove(event: ThreeEvent<PointerEvent>) {
    if (!dragging.current || !card.current) return;
    const point = event.ray.intersectPlane(dragPlane, new THREE.Vector3());
    if (!point) return;
    card.current.setTranslation({ x: point.x + grabOffset.current.x, y: point.y + grabOffset.current.y, z: grabOffset.current.z }, true);
    card.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    card.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  function onPointerUp(event: ThreeEvent<PointerEvent>) {
    if (!dragging.current) return;
    dragging.current = false;
    if (event.nativeEvent.target instanceof HTMLCanvasElement && event.nativeEvent.target.hasPointerCapture(event.pointerId)) event.nativeEvent.target.releasePointerCapture(event.pointerId);
    document.body.style.cursor = "";
    card.current?.wakeUp();
  }

  return <>
    <mesh geometry={strapGeometry} material={strapMaterial} frustumCulled={false} />
      <RigidBody ref={anchor} type="fixed" colliders={false} position={[0, 2.42, 0]} />
      <RigidBody ref={card} colliders={false} position={[0, -0.04, 0]} mass={0.9} linearDamping={1.4} angularDamping={1.7} restitution={0.08} friction={0.8}>
        <CuboidCollider args={[1.06, 1.48, 0.075]} />
        <group onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onPointerOver={() => { document.body.style.cursor = "grab"; }} onPointerOut={() => { if (!dragging.current) document.body.style.cursor = ""; }}>
          <RoundedBox args={[2.15, 3, 0.13]} radius={0.16} smoothness={5}>
            <meshPhysicalMaterial color="#17171d" roughness={0.27} metalness={0.25} clearcoat={0.75} clearcoatRoughness={0.2} />
          </RoundedBox>
          <mesh position={[0, 0, 0.071]}><planeGeometry args={[1.99, 2.83]} /><meshStandardMaterial color="#111115" roughness={0.65} /></mesh>
          <Text position={[0, 1.22, 0.085]} fontSize={0.09} color="#aaaab4" anchorX="center" anchorY="middle" letterSpacing={0.05}>PERSONAL PORTFOLIO</Text>
          <DreiImage url="/images/profile-placeholder.svg" position={[0, 0.28, 0.09]} scale={[1.63, 1.34]} toneMapped={false} />
          <mesh position={[0, 0.28, 0.092]}><planeGeometry args={[1.63, 1.34]} /><meshBasicMaterial color="#7c8cff" transparent opacity={0.14} /></mesh>
          <Text position={[0, -0.69, 0.09]} fontSize={0.19} color="#f4f4f5" anchorX="center" anchorY="middle" maxWidth={1.86} textAlign="center">{profile.name}</Text>
          <Text position={[0, -0.94, 0.09]} fontSize={0.085} color="#b4b4bb" anchorX="center" anchorY="middle" letterSpacing={0.08}>{profile.role.toUpperCase()}</Text>
          <mesh position={[0, -1.22, 0.095]}><circleGeometry args={[0.045, 32]} /><meshBasicMaterial color="#7c8cff" /></mesh>
          <Text position={[0, -1.22, 0.09]} fontSize={0.075} color="#d6d6dc" anchorX="center" anchorY="middle" letterSpacing={0.06}>AVAILABLE FOR FREELANCE</Text>
        </group>
      </RigidBody>
    <ContactShadows position={[0, -2.02, -0.6]} opacity={0.3} scale={5} blur={2.6} far={3.5} />
  </>;
}

function CardRig() {
  return <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}><CardPhysicsRig /></Physics>;
}

export function HeroIdCardScene() {
  return <div className="hero-card-stage hero-card-canvas" role="group" aria-label="Interactive 3D ID card; drag the card to swing it">
    <div className="hero-glow" aria-hidden="true" />
    <Canvas shadows dpr={[1, 1.6]} camera={{ position: [0, 0.05, 8], fov: 34 }} gl={{ alpha: true, antialias: true }} onCreated={({ gl }) => { gl.setClearColor("#000000", 0); }}>
      <ambientLight intensity={1.15} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-3, 1, 3]} intensity={24} color="#7c8cff" />
      <CardRig />
    </Canvas>
    <span className="sr-only">Drag the card with a pointer to swing it. The card uses a CSS fallback on small screens, when reduced motion is enabled, or if WebGL is unavailable.</span>
  </div>;
}