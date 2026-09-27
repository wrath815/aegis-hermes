import { useEffect, useRef, useState } from "react";
import * as THREE_NS from "three";

// three's types are aliased to `any` so the port reads like the original
// imperative code and survives three version bumps.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const THREE: any = THREE_NS;

/**
 * Orb — the AEGIS Mission Control particle sphere (port of the Jarvis orb:
 * 2000 additive particles, connection lines, travelling "electrons", idle /
 * thinking states with the transition tumble and depth breathing).
 *
 * Changes from the AEGIS console version:
 *   - sized with a ResizeObserver (no react-use-measure dependency);
 *   - the tint is the active dashboard theme's primary colour, resolved through
 *     a probe element so `color-mix()` / `oklch()` values still yield an RGB
 *     three.js can parse;
 *   - geometries/materials are disposed on rebuild, and the renderer's context
 *     is released, so resizing or switching themes never leaks GPU memory.
 */

function themeColor(): string {
  const probe = document.createElement("span");
  probe.style.color = "var(--ui-accent, var(--color-primary, var(--midground-base, #4ca8e8)))";
  probe.style.display = "none";
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  const m = rgb.match(/[\d.]+/g);
  if (!m || m.length < 3) return "#4ca8e8";
  const [r, g, b] = m.slice(0, 3).map(Number);
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function isLightBackground(): boolean {
  const probe = document.createElement("span");
  probe.style.color = "var(--theme-background-seed, var(--background-base, #000))";
  probe.style.display = "none";
  document.body.appendChild(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g);
  probe.remove();
  if (!m || m.length < 3) return false;
  const [r, g, b] = m.slice(0, 3).map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const ro = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(frame);
      // Coalesce a drag-resize into one rebuild per frame.
      frame = requestAnimationFrame(() => {
        const { width, height } = entry.contentRect;
        setSize(s => (Math.round(s.width) === Math.round(width) && Math.round(s.height) === Math.round(height) ? s : { width, height }));
      });
    });
    ro.observe(el);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); };
  }, []);
  return [ref, size] as const;
}

type OrbState = "idle" | "listening" | "thinking" | "speaking" | "compacting";

export function Orb({ active, motion }: { active: boolean; motion: boolean }) {
  const [ref, bounds] = useSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<OrbState>("idle");
  stateRef.current = active ? "thinking" : "idle";
  const [themeKey, setThemeKey] = useState(0);
  // No WebGL (blocked GPU, remote desktop, locked-down VM): fall back to a
  // 2D-canvas sphere instead of letting three.js throw and take the page down.
  const [lite, setLite] = useState(false);

  useEffect(() => {
    // Theme switches rewrite inline CSS variables on <html>; rebuild the tint.
    // Only a real colour change rebuilds the scene.
    let last = themeColor();
    const obs = new MutationObserver(() => {
      const next = themeColor();
      if (next !== last) { last = next; setThemeKey(k => k + 1); }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || lite) return;
    const W = Math.max(1, Math.round(bounds.width || 640));
    const H = Math.max(1, Math.round(bounds.height || 480));

    let destroyed = false;
    let raf = 0;

    const base = new THREE.Color(themeColor());
    const cIdle = base.clone();
    const cThink = base.clone().lerp(new THREE.Color(0xffffff), 0.28);
    const cSpeak = base.clone().lerp(new THREE.Color(0xffffff), 0.12);
    const cCompact = base.clone().multiplyScalar(0.5);

    const N = 2000;
    let renderer;
    try {
      // Transparent clear: the theme's background shows through, so the orb
      // sits on Porcelain paper as naturally as on Amber black.
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      setLite(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);
    // Additive light vanishes on a light canvas; blend normally there instead.
    const blending = isLightBackground() ? THREE.NormalBlending : THREE.AdditiveBlending;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 1, 1000);
    camera.position.z = 80;

    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), phase = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.5) * 25;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      phase[i] = Math.random() * 1000;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: cIdle.clone(), size: 0.2, transparent: true, opacity: 0.6, sizeAttenuation: true, blending, depthWrite: false });
    const points = new THREE.Points(geo, mat); scene.add(points);

    const MAX_LINES = 8000;
    const linePos = new Float32Array(MAX_LINES * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    lineGeo.setDrawRange(0, 0);
    const lineMat = new THREE.LineBasicMaterial({ color: cIdle.clone(), transparent: true, opacity: 0, blending, depthWrite: false });
    const lines = new THREE.LineSegments(lineGeo, lineMat); scene.add(lines);

    const MAX_ELECTRONS = 200;
    const electronGeo = new THREE.BufferGeometry();
    const electronPos = new Float32Array(MAX_ELECTRONS * 3);
    electronGeo.setAttribute("position", new THREE.BufferAttribute(electronPos, 3));
    electronGeo.setDrawRange(0, 0);
    const electronMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 1.0, sizeAttenuation: true, blending, depthWrite: false });
    const electrons = new THREE.Points(electronGeo, electronMat); scene.add(electrons);
    interface Electron { sx: number; sy: number; sz: number; ex: number; ey: number; ez: number; t: number; speed: number; }
    const activeElectrons: Electron[] = [];
    let electronSpawnRate = 0, lastElectronSpawn = 0;
    let activeConnections: { x1: number; y1: number; z1: number; x2: number; y2: number; z2: number }[] = [];

    let targetRadius = 25, currentRadius = 25, targetSpeed = 0.3, currentSpeed = 0.3;
    let targetBright = 0.6, currentBright = 0.6, targetSize = 0.2, currentSize = 0.2;
    let lineAmount = 0, targetLineAmount = 0, targetElectronRate = 0;
    const lineDistance = 8;
    let spinX = 0, spinY = 0, spinZ = 0, transitionEnergy = 0;
    let lastState: OrbState = "idle";
    let cloudZ = 0, cloudZVel = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      if (destroyed) return;
      const t = clock.getElapsedTime();
      const state = stateRef.current;

      switch (state) {
        case "idle": targetRadius = 28; targetSpeed = 0.2; targetBright = 0.5; targetSize = 0.18; targetLineAmount = 0.15; targetElectronRate = 0; break;
        case "listening": targetRadius = 22; targetSpeed = 0.3; targetBright = 0.65; targetSize = 0.2; targetLineAmount = 0.4; targetElectronRate = 0; break;
        case "thinking": targetRadius = 16; targetSpeed = 0.5; targetBright = 0.7; targetSize = 0.16; targetLineAmount = 1.0; targetElectronRate = 0.015; break;
        case "speaking": targetRadius = 18; targetSpeed = 0.2; targetBright = 0.7; targetSize = 0.2; targetLineAmount = 0.8; targetElectronRate = 0; break;
        case "compacting": targetRadius = 12; targetSpeed = 0.08; targetBright = 0.28; targetSize = 0.15; targetLineAmount = 0.0; targetElectronRate = 0; break;
      }

      currentRadius += (targetRadius - currentRadius) * 0.02;
      currentSpeed += (targetSpeed - currentSpeed) * 0.02;
      currentBright += (targetBright - currentBright) * 0.02;
      currentSize += (targetSize - currentSize) * 0.02;
      lineAmount += (targetLineAmount - lineAmount) * 0.02;
      electronSpawnRate += (targetElectronRate - electronSpawnRate) * 0.02;

      if (state !== lastState) { transitionEnergy = 1.0; lastState = state; }
      transitionEnergy *= 0.985;
      if (transitionEnergy > 0.05) {
        spinX += transitionEnergy * 0.012 * Math.sin(t * 1.7);
        spinY += transitionEnergy * 0.015;
        spinZ += transitionEnergy * 0.008 * Math.cos(t * 1.3);
      }

      let zTarget = Math.sin(t * 0.12) * 8;
      if (state === "thinking") zTarget = Math.sin(t * 0.3) * 15 + Math.sin(t * 0.9) * 6;
      else if (state === "speaking") zTarget = Math.sin(t * 0.15) * 6;
      else if (state === "compacting") zTarget = -20 + Math.sin(t * 0.08) * 3;
      cloudZVel += (zTarget - cloudZ) * 0.008; cloudZVel *= 0.94; cloudZ += cloudZVel;

      points.rotation.set(spinX, spinY, spinZ); points.position.z = cloudZ;
      lines.rotation.set(spinX, spinY, spinZ); lines.position.z = cloudZ;

      const p = geo.getAttribute("position"); const a = p.array as Float32Array;
      for (let i = 0; i < N; i++) {
        const i3 = i * 3; const x = a[i3], y = a[i3 + 1], z = a[i3 + 2]; const px = phase[i];
        vel[i3] += Math.sin(t * 0.05 + px) * 0.001 * currentSpeed;
        vel[i3 + 1] += Math.cos(t * 0.06 + px * 1.3) * 0.001 * currentSpeed;
        vel[i3 + 2] += Math.sin(t * 0.055 + px * 0.7) * 0.001 * currentSpeed;
        vel[i3] += Math.sin(t * 0.02 + px * 2.1 + y * 0.1) * 0.0008 * currentSpeed;
        vel[i3 + 1] += Math.cos(t * 0.025 + px * 1.7 + z * 0.1) * 0.0008 * currentSpeed;
        vel[i3 + 2] += Math.sin(t * 0.022 + px * 0.9 + x * 0.1) * 0.0008 * currentSpeed;
        const dist = Math.sqrt(x * x + y * y + z * z) || 0.01;
        const pull = Math.max(0, dist - currentRadius) * 0.002 + 0.0003;
        vel[i3] -= (x / dist) * pull; vel[i3 + 1] -= (y / dist) * pull; vel[i3 + 2] -= (z / dist) * pull;
        vel[i3] *= 0.992; vel[i3 + 1] *= 0.992; vel[i3 + 2] *= 0.992;
        a[i3] += vel[i3]; a[i3 + 1] += vel[i3 + 1]; a[i3 + 2] += vel[i3 + 2];
      }
      p.needsUpdate = true;

      if (lineAmount > 0.01) {
        const lp = lineGeo.getAttribute("position"); const la = lp.array as Float32Array;
        let lineCount = 0; const maxDistSq = lineDistance * lineDistance;
        const step = Math.max(1, Math.floor(N / 600));
        for (let i = 0; i < N && lineCount < MAX_LINES; i += step) {
          const i3 = i * 3; const x1 = a[i3], y1 = a[i3 + 1], z1 = a[i3 + 2];
          for (let j = i + step; j < N && lineCount < MAX_LINES; j += step) {
            const j3 = j * 3; const dx = a[j3] - x1, dy = a[j3 + 1] - y1, dz = a[j3 + 2] - z1;
            if (dx * dx + dy * dy + dz * dz < maxDistSq) {
              const idx = lineCount * 6;
              la[idx] = x1; la[idx + 1] = y1; la[idx + 2] = z1;
              la[idx + 3] = a[j3]; la[idx + 4] = a[j3 + 1]; la[idx + 5] = a[j3 + 2];
              lineCount++;
            }
          }
        }
        lineGeo.setDrawRange(0, lineCount * 2); lp.needsUpdate = true; lineMat.opacity = lineAmount * 0.12;
        activeConnections = [];
        for (let c = 0; c < Math.min(lineCount, 500); c++) {
          const ci = c * 6;
          activeConnections.push({ x1: la[ci], y1: la[ci + 1], z1: la[ci + 2], x2: la[ci + 3], y2: la[ci + 4], z2: la[ci + 5] });
        }
      } else { lineGeo.setDrawRange(0, 0); activeConnections = []; }

      if (activeConnections.length > 0 && electronSpawnRate > 0.005) {
        if (activeElectrons.length < 3 && (t - lastElectronSpawn) > 1.0) {
          const conn = activeConnections[Math.floor(Math.random() * activeConnections.length)];
          activeElectrons.push({ sx: conn.x1, sy: conn.y1, sz: conn.z1, ex: conn.x2, ey: conn.y2, ez: conn.z2, t: 0, speed: 0.003 + Math.random() * 0.003 });
          lastElectronSpawn = t;
        }
      }
      const ep = electronGeo.getAttribute("position"); const ea = ep.array as Float32Array;
      let aliveCount = 0;
      for (let e = activeElectrons.length - 1; e >= 0; e--) {
        const el = activeElectrons[e]; el.t += el.speed;
        if (el.t >= 1) { activeElectrons.splice(e, 1); continue; }
        const ei = aliveCount * 3;
        ea[ei] = el.sx + (el.ex - el.sx) * el.t; ea[ei + 1] = el.sy + (el.ey - el.sy) * el.t; ea[ei + 2] = el.sz + (el.ez - el.sz) * el.t;
        aliveCount++;
      }
      electronGeo.setDrawRange(0, aliveCount); ep.needsUpdate = true;
      electrons.rotation.set(spinX, spinY, spinZ); electrons.position.z = cloudZ;

      mat.opacity = currentBright; mat.size = currentSize;
      const tint = state === "thinking" ? cThink : state === "speaking" ? cSpeak : state === "compacting" ? cCompact : cIdle;
      mat.color.lerp(tint, state === "compacting" ? 0.03 : 0.015);
      lineMat.color.lerp(tint, state === "compacting" ? 0.03 : 0.015);

      camera.position.x = Math.sin(t * 0.02) * 5; camera.position.y = Math.cos(t * 0.03) * 3; camera.lookAt(0, 0, cloudZ * 0.2);
      renderer.render(scene, camera);
      if (motion) raf = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      for (const disposable of [geo, mat, lineGeo, lineMat, electronGeo, electronMat]) {
        try { disposable.dispose(); } catch { /* already gone */ }
      }
      try {
        renderer.dispose();
        // A resize or theme rebuild reuses this canvas (and its context); only
        // release the context for real once the canvas has left the page.
        if (!canvas.isConnected) renderer.forceContextLoss();
      } catch { /* ignore */ }
    };
  }, [bounds.width, bounds.height, motion, themeKey, lite]);

  if (lite) {
    return (
      <div className="aegis-orb" ref={ref}>
        <LiteOrb active={active} motion={motion} width={bounds.width} height={bounds.height} themeKey={themeKey} />
        <span className="aegis-orb-note">lite orb · WebGL unavailable</span>
      </div>
    );
  }

  return (
    <div className="aegis-orb" ref={ref}>
      <canvas ref={canvasRef} className="aegis-orb-canvas" role="img" aria-label="Agent activity orb" />
    </div>
  );
}

/**
 * 2D fallback: 700 points on a slowly turning sphere, depth-shaded, drawn in
 * the theme colour. Tightens and speeds up while agents are working, like the
 * WebGL orb, so the signal survives even without a GPU.
 */
function LiteOrb({ active, motion, width, height, themeKey }: { active: boolean; motion: boolean; width: number; height: number; themeKey: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(1, Math.round(width || 640));
    const H = Math.max(1, Math.round(height || 480));
    canvas.width = W * ratio;
    canvas.height = H * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const color = themeColor();
    const N = 700;
    const pts = Array.from({ length: N }, () => {
      const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1);
      return { x: Math.sin(phi) * Math.cos(theta), y: Math.sin(phi) * Math.sin(theta), z: Math.cos(phi), j: Math.random() };
    });
    let angle = 0, radius = 0.34, raf = 0;
    const draw = () => {
      const busy = activeRef.current;
      radius += ((busy ? 0.26 : 0.34) - radius) * 0.03;
      angle += busy ? 0.006 : 0.0025;
      const R = Math.min(W, H) * radius;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = color;
      for (const p of pts) {
        const x = p.x * cos - p.z * sin, z = p.x * sin + p.z * cos;
        const depth = (z + 1) / 2;
        ctx.globalAlpha = 0.15 + depth * 0.7;
        const size = 0.6 + depth * 1.6 + p.j * 0.4;
        ctx.fillRect(W / 2 + x * R, H / 2 + p.y * R, size, size);
      }
      ctx.globalAlpha = 1;
      if (motion) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [width, height, motion, themeKey]);

  return <canvas ref={canvasRef} className="aegis-orb-canvas" role="img" aria-label="Agent activity orb" />;
}
