"use client";

import { useEffect, useRef } from "react";
import { afterBoot, motionQueries } from "@/lib/motion";

type Node = { x: number; y: number; vx: number; vy: number; ox: number; oy: number; hub: boolean };
type Packet = { from: number; to: number; t: number; speed: number };

const LINK_DISTANCE = 150;
const PARALLAX_RATE = 0.12;
const CURSOR_RADIUS = 190;
const PACKET_COLORS = ["168,230,240", "233,184,240", "255,233,181"];

/**
 * Faint, drifting network graph behind the hero. Nodes lean toward the cursor
 * and small "packets" travel along links. 2D canvas on purpose: the ID card
 * already owns the page's only WebGL context.
 */
/**
 * @param duringBoot run during the boot intro (the intro's own background) instead of waiting for it
 * @param parallax   site-wide background: the field drifts past slowly as the page scrolls
 */
export function NetworkField({ duringBoot = false, parallax = false, className = "" }: { duringBoot?: boolean; parallax?: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ctx = context;

    const motionOk = window.matchMedia(motionQueries.motionOk).matches;
    const interactive = window.matchMedia(motionQueries.desktop).matches;
    let width = 0;
    let height = 0;
    let nodes: Node[] = [];
    const packets: Packet[] = [];
    const pointer = { x: -9999, y: -9999, active: false };
    let frame = 0;
    let visible = true;
    let lastTime = 0;
    let packetTimer = 0;

    function seed() {
      const count = Math.round(Math.min(95, Math.max(28, (width * height) / (interactive ? 15000 : 26000))));
      let state = 0x9e3779b9;
      const random = () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0xffffffff;
      };
      nodes = Array.from({ length: count }, () => ({
        x: random() * width,
        y: random() * height,
        vx: (random() - 0.5) * 9,
        vy: (random() - 0.5) * 9,
        ox: 0,
        oy: 0,
        hub: random() < 0.12,
      }));
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (!motionOk) draw(0);
    }

    function spawnPacket() {
      if (packets.length >= 7 || nodes.length < 2) return;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const from = Math.floor(Math.random() * nodes.length);
        const a = nodes[from];
        let best = -1;
        let bestDistance = Infinity;
        nodes.forEach((b, index) => {
          if (index === from) return;
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance < LINK_DISTANCE && distance > 40 && distance < bestDistance && Math.random() > 0.35) { best = index; bestDistance = distance; }
        });
        if (best >= 0) { packets.push({ from, to: best, t: 0, speed: 0.55 + Math.random() * 0.5 }); return; }
      }
    }

    function step(delta: number) {
      for (const node of nodes) {
        node.x += node.vx * delta;
        node.y += node.vy * delta;
        if (node.x < -20) node.x = width + 20; else if (node.x > width + 20) node.x = -20;
        if (node.y < -20) node.y = height + 20; else if (node.y > height + 20) node.y = -20;
        // Lean toward the cursor with a soft falloff, then ease back.
        let tx = 0;
        let ty = 0;
        if (pointer.active) {
          const dx = pointer.x - node.x;
          const dy = pointer.y - node.y;
          const distance = Math.hypot(dx, dy);
          if (distance < CURSOR_RADIUS) {
            const pull = (1 - distance / CURSOR_RADIUS) ** 2 * 0.28;
            tx = dx * pull;
            ty = dy * pull;
          }
        }
        node.ox += (tx - node.ox) * Math.min(1, delta * 5);
        node.oy += (ty - node.oy) * Math.min(1, delta * 5);
      }
      packetTimer -= delta;
      if (packetTimer <= 0) { spawnPacket(); packetTimer = 0.45 + Math.random() * 0.7; }
      for (let index = packets.length - 1; index >= 0; index -= 1) {
        packets[index].t += delta * packets[index].speed;
        if (packets[index].t >= 1) packets.splice(index, 1);
      }
    }

    function draw(delta: number) {
      if (delta) step(delta);
      ctx.clearRect(0, 0, width, height);
      // Site-wide background: the field drifts up slowly as the page scrolls, wrapping
      // around so it never runs out (a 40px margin hides the wrap at the edges).
      const scrollShift = parallax ? -window.scrollY * PARALLAX_RATE : 0;
      const span = height + 40;
      const px = (node: Node) => node.x + node.ox;
      const py = parallax
        ? (node: Node) => ((((node.y + node.oy + scrollShift + 20) % span) + span) % span) - 20
        : (node: Node) => node.y + node.oy;

      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const distance = Math.hypot(px(a) - px(b), py(a) - py(b));
          if (distance > LINK_DISTANCE) continue;
          let alpha = (1 - distance / LINK_DISTANCE) * 0.16;
          if (pointer.active) {
            const near = Math.hypot((px(a) + px(b)) / 2 - pointer.x, (py(a) + py(b)) / 2 - pointer.y);
            if (near < CURSOR_RADIUS) alpha += (1 - near / CURSOR_RADIUS) * 0.22;
          }
          ctx.strokeStyle = `rgba(201,208,218,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(px(a), py(a));
          ctx.lineTo(px(b), py(b));
          ctx.stroke();
        }
      }

      for (const node of nodes) {
        ctx.beginPath();
        ctx.arc(px(node), py(node), node.hub ? 1.9 : 1.15, 0, Math.PI * 2);
        ctx.fillStyle = node.hub ? "rgba(236,234,228,.62)" : "rgba(236,234,228,.3)";
        ctx.fill();
      }

      packets.forEach((packet, index) => {
        const a = nodes[packet.from];
        const b = nodes[packet.to];
        if (!a || !b) return;
        const ease = packet.t < 0.5 ? 2 * packet.t * packet.t : 1 - (-2 * packet.t + 2) ** 2 / 2;
        const x = px(a) + (px(b) - px(a)) * ease;
        const y = py(a) + (py(b) - py(a)) * ease;
        const fade = Math.sin(packet.t * Math.PI);
        const color = PACKET_COLORS[index % PACKET_COLORS.length];
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 9);
        glow.addColorStop(0, `rgba(${color},${(0.55 * fade).toFixed(3)})`);
        glow.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(245,247,250,${(0.9 * fade).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function loop(time: number) {
      frame = 0;
      if (!visible || document.hidden) { lastTime = 0; return; }
      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
      lastTime = time;
      draw(delta);
      frame = requestAnimationFrame(loop);
    }

    // Hidden behind the boot overlay anyway, so don't spend frames until it's gone.
    let booted = false;
    function play() {
      if (!motionOk || !booted || frame || !visible || document.hidden) return;
      frame = requestAnimationFrame(loop);
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = pointer.y > -40 && pointer.y < rect.height + 40;
    };
    const onPointerLeave = () => { pointer.active = false; };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; play(); });
    intersection.observe(canvas);
    const onVisibility = () => play();
    document.addEventListener("visibilitychange", onVisibility);
    if (interactive) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
    }
    resize();
    // The hero's field waits for the intro; the intro's own field runs right away.
    let cancelBootWait = () => {};
    const start = () => { booted = true; play(); canvas.classList.add("is-live"); };
    if (duringBoot) start();
    else cancelBootWait = afterBoot(start);

    return () => {
      cancelBootWait();
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [duringBoot, parallax]);

  return <canvas ref={canvasRef} className={`network-field ${className}`.trim()} aria-hidden="true" />;
}
