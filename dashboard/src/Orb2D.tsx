import { useEffect, useRef, useState } from "react";

/**
 * Orb2D — the Mission Control orb on a plain 2D canvas, no three.js.
 *
 * Same behaviour as the WebGL orb (Orb.tsx): particles drift on a sphere under
 * a radial pull, near neighbours are joined by faint lines, "electrons" travel
 * those lines while agents work, and the cloud tightens, brightens and speeds
 * up when `active`. Projected with a simple perspective and composited
 * additively on dark themes, so it reads the same at a glance.
 *
 * It exists because Hermes Desktop's plugin catalog forbids prototype writes in
 * a desktop bundle, and three.js makes plenty of them internally. The desktop
 * build uses this; the dashboard keeps the WebGL orb.
 */

const N = 900;
const LINK_DIST = 0.23;          // in unit-sphere space
const LINK_SAMPLE = 380;         // particles considered for links each frame
const MAX_LINKS = 900;

function accentRgb(): [number, number, number] {
  const probe = document.createElement("span");
  probe.style.color = "var(--ui-accent, var(--color-primary, var(--midground-base, #4ca8e8)))";
  probe.style.display = "none";
  document.body.appendChild(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g);
  probe.remove();
  return m && m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2])] : [76, 168, 232];
}

function isLightBackground(): boolean {
  const probe = document.createElement("span");
  probe.style.color = "var(--theme-background-seed, var(--background-base, #000))";
  probe.style.display = "none";
  document.body.appendChild(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g);
  probe.remove();
  if (!m || m.length < 3) return false;
  return 0.2126 * Number(m[0]) + 0.7152 * Number(m[1]) + 0.0722 * Number(m[2]) > 140;
}

export function Orb2D({ active, motion }: { active: boolean; motion: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [themeKey, setThemeKey] = useState(0);

  useEffect(() => {
    let last = accentRgb().join(",");
    const obs = new MutationObserver(() => {
      const next = accentRgb().join(",");
      if (next !== last) { last = next; setThemeKey(k => k + 1); }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    const [r, g, b] = accentRgb();
    const light = isLightBackground();
    const rgba = (a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;

    // Particles start inside the unit sphere; physics keeps them near its shell.
    const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N);
    const vx = new Float32Array(N), vy = new Float32Array(N), vz = new Float32Array(N);
    const phase = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1);
      const rad = Math.sqrt(Math.random());
      px[i] = rad * Math.sin(phi) * Math.cos(theta);
      py[i] = rad * Math.sin(phi) * Math.sin(theta);
      pz[i] = rad * Math.cos(phi);
      phase[i] = Math.random() * 1000;
    }
    const electrons: { a: number; b: number; t: number; speed: number }[] = [];
    const sx = new Float32Array(N), sy = new Float32Array(N), sd = new Float32Array(N);

    let W = 0, H = 0, ratio = 1;
    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, wrap.clientWidth);
      H = Math.max(1, wrap.clientHeight);
      canvas.width = Math.round(W * ratio);
      canvas.height = Math.round(H * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let radius = 0.95, speed = 0.2, bright = 0.5, linkAmt = 0.2, spin = 0, lastSpawn = 0, raf = 0;
    const start = performance.now();

    const frame = () => {
      const t = (performance.now() - start) / 1000;
      const busy = activeRef.current;
      radius += ((busy ? 0.62 : 0.95) - radius) * 0.02;
      speed += ((busy ? 0.5 : 0.2) - speed) * 0.02;
      bright += ((busy ? 0.75 : 0.5) - bright) * 0.02;
      linkAmt += ((busy ? 1 : 0.2) - linkAmt) * 0.02;
      spin += 0.0012 + speed * 0.004;

      for (let i = 0; i < N; i++) {
        const p = phase[i], x = px[i], y = py[i], z = pz[i];
        vx[i] += (Math.sin(t * 0.05 + p) * 0.00004 + Math.sin(t * 0.02 + p * 2.1 + y * 3) * 0.00003) * speed;
        vy[i] += (Math.cos(t * 0.06 + p * 1.3) * 0.00004 + Math.cos(t * 0.025 + p * 1.7 + z * 3) * 0.00003) * speed;
        vz[i] += (Math.sin(t * 0.055 + p * 0.7) * 0.00004 + Math.sin(t * 0.022 + p * 0.9 + x * 3) * 0.00003) * speed;
        const d = Math.sqrt(x * x + y * y + z * z) || 0.001;
        const pull = Math.max(0, d - radius) * 0.002 + 0.000012;
        vx[i] = (vx[i] - (x / d) * pull) * 0.992;
        vy[i] = (vy[i] - (y / d) * pull) * 0.992;
        vz[i] = (vz[i] - (z / d) * pull) * 0.992;
        px[i] += vx[i]; py[i] += vy[i]; pz[i] += vz[i];
      }

      // Project: rotate about Y (and a gentle tilt about X), then perspective.
      const cy = Math.cos(spin), syn = Math.sin(spin), tilt = Math.sin(t * 0.1) * 0.25;
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      const scale = Math.min(W, H) * 0.36, cxs = W / 2, cys = H / 2;
      for (let i = 0; i < N; i++) {
        const x1 = px[i] * cy + pz[i] * syn, z1 = -px[i] * syn + pz[i] * cy;
        const y2 = py[i] * ct - z1 * st, z2 = py[i] * st + z1 * ct;
        const persp = 2.6 / (2.6 + z2);
        sx[i] = cxs + x1 * scale * persp;
        sy[i] = cys + y2 * scale * persp;
        sd[i] = (1 - z2) / 2; // 0 far .. 1 near
      }

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = light ? "source-over" : "lighter";

      // Links between near neighbours, sampled so cost stays bounded.
      const links: [number, number][] = [];
      if (linkAmt > 0.02) {
        const step = Math.max(1, Math.floor(N / LINK_SAMPLE));
        const maxSq = LINK_DIST * LINK_DIST;
        ctx.strokeStyle = rgba((light ? 0.22 : 0.2) * (0.35 + linkAmt));
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (let i = 0; i < N && links.length < MAX_LINKS; i += step) {
          for (let j = i + step; j < N && links.length < MAX_LINKS; j += step) {
            const dx = px[i] - px[j], dy = py[i] - py[j], dz = pz[i] - pz[j];
            if (dx * dx + dy * dy + dz * dz < maxSq) {
              ctx.moveTo(sx[i], sy[i]);
              ctx.lineTo(sx[j], sy[j]);
              links.push([i, j]);
            }
          }
        }
        ctx.stroke();
      }

      for (let i = 0; i < N; i++) {
        ctx.fillStyle = rgba(Math.min(1, (0.3 + sd[i] * 0.9) * bright * 1.5));
        const s = 0.9 + sd[i] * 1.9;
        ctx.fillRect(sx[i] - s / 2, sy[i] - s / 2, s, s);
      }

      // Electrons ride the links while agents are working.
      if (busy && links.length && electrons.length < 4 && t - lastSpawn > 0.8) {
        const [a, bIdx] = links[Math.floor(Math.random() * links.length)];
        electrons.push({ a, b: bIdx, t: 0, speed: 0.012 + Math.random() * 0.012 });
        lastSpawn = t;
      }
      ctx.fillStyle = light ? rgba(1) : "rgba(255, 255, 255, 0.95)";
      for (let e = electrons.length - 1; e >= 0; e--) {
        const el = electrons[e];
        el.t += el.speed;
        if (el.t >= 1) { electrons.splice(e, 1); continue; }
        const ex = sx[el.a] + (sx[el.b] - sx[el.a]) * el.t, ey = sy[el.a] + (sy[el.b] - sy[el.a]) * el.t;
        ctx.beginPath();
        ctx.arc(ex, ey, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      if (motion) raf = requestAnimationFrame(frame);
    };
    frame();

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [motion, themeKey]);

  return (
    <div className="aegis-orb" ref={wrapRef}>
      <canvas ref={canvasRef} className="aegis-orb-canvas" role="img" aria-label="Agent activity orb" />
    </div>
  );
}
