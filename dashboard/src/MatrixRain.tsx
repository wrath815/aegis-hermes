import { useEffect, useRef } from "react";

/**
 * Rain behind the boot plate, in the active theme's accent.
 *
 * Scoped to the loading screen on purpose. Glyphs falling behind live
 * transcript output would make an operator console harder to read; during boot
 * there is nothing to read yet, so it can be as busy as it likes. A radial
 * mask in the stylesheet keeps it clear of the artwork in the centre.
 *
 * Three things keep it cheap enough to leave running all day:
 *   - it draws on an interval, not every animation frame (rain at 24fps is the
 *     classic look anyway, and this is a third of the work);
 *   - it stops entirely while the tab is hidden; and
 *   - it never touches React state, so nothing here schedules a render.
 */

// Half-width katakana and digits: the classic alphabet, and every glyph is
// monospace-safe so columns stay aligned.
const GLYPHS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789";

const FONT_SIZE = 15;
const FRAME_MS = 42; // ~24fps

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    // Rain in the theme's accent rather than a fixed gold.
    const probe = document.createElement("span");
    probe.style.color = "var(--ui-accent, var(--color-primary, #ffc233))";
    document.body.appendChild(probe);
    const [cr, cg, cb] = (getComputedStyle(probe).color.match(/[\d.]+/g) ?? ["255", "194", "51"]).map(Number);
    probe.remove();
    const accent = (alpha: number) => `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;

    let columns = 0;
    let drops: number[] = [];
    let speeds: number[] = [];
    let ratio = 1;

    function resize() {
      // Cap the device ratio: past 2x the extra pixels cost real time and buy
      // nothing at this glyph size.
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(window.innerWidth * ratio);
      canvas!.height = Math.floor(window.innerHeight * ratio);
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);

      const next = Math.ceil(window.innerWidth / FONT_SIZE);
      // Seed new columns across the whole height rather than above the fold.
      // The plate only lives ~2.4s, so rain that starts off-screen would still
      // be arriving when the boot screen leaves.
      const rows = window.innerHeight / FONT_SIZE;
      // Preserve existing columns across a resize so the rain does not restart
      // from the top every time the window moves.
      drops = Array.from({ length: next }, (_, i) =>
        i < columns ? drops[i] : Math.random() * (rows + 12) - 12,
      );
      speeds = Array.from({ length: next }, (_, i) =>
        i < columns ? speeds[i] : 0.4 + Math.random() * 0.8,
      );
      columns = next;
    }

    function glyph() {
      return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    }

    function draw() {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Translucent wash instead of a clear: this is what leaves the fading
      // tail behind each head.
      context!.fillStyle = "rgba(4, 5, 3, 0.09)";
      context!.fillRect(0, 0, width, height);
      context!.font = `${FONT_SIZE}px "JetBrains Mono", ui-monospace, monospace`;
      context!.textBaseline = "top";

      for (let i = 0; i < columns; i += 1) {
        const x = i * FONT_SIZE;
        const y = drops[i] * FONT_SIZE;

        if (y > 0 && y < height) {
          // A fresh glyph every frame. The trail is the fading residue of
          // earlier heads, so reusing one character would stamp the same glyph
          // down the whole column instead of a varied stream.
          context!.shadowColor = accent(0.9);
          context!.shadowBlur = 8;
          context!.fillStyle = accent(1);
          context!.fillText(glyph(), x, y);

          context!.shadowBlur = 0;
          context!.fillStyle = accent(0.42);
          context!.fillText(glyph(), x, y - FONT_SIZE);
        }

        drops[i] += speeds[i];
        // Restart well above the fold at a random offset so columns never fall
        // into lockstep.
        if (y > height && Math.random() > 0.975) {
          drops[i] = Math.random() * -20;
          speeds[i] = 0.4 + Math.random() * 0.8;
        }
      }
      context!.shadowBlur = 0;
    }

    let timer = 0;
    function start() {
      if (timer) return;
      timer = window.setInterval(draw, FRAME_MS);
    }
    function stop() {
      if (!timer) return;
      window.clearInterval(timer);
      timer = 0;
    }
    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    resize();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas className="aegis-matrix-rain" ref={canvasRef} aria-hidden />;
}
