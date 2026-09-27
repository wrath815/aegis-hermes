import { useEffect, useRef } from "react";

/**
 * The AEGIS instrument overlay: a coarse grid that parallaxes against the
 * cursor, CRT scanlines, one slow sweep, a vignette and corner aperture ticks.
 *
 * Mounted in the host's `overlay` slot but hidden by default (`display: none`
 * in style.css); only the AEGIS Amber theme's customCSS reveals it, so every
 * other theme stays clean. `pointer-events: none` throughout, so it can never
 * intercept a click. The parallax loop runs only while the overlay is actually
 * visible and motion is allowed, and never touches React state.
 */
export function Hud() {
  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const g = grid.current;
    if (!el || !g) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const THROW = 22;
    const EASE = 0.06;
    let tx = 0, ty = 0, cx = 0, cy = 0, frame = 0;

    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * -THROW;
      ty = (e.clientY / window.innerHeight - 0.5) * -THROW;
    };
    // Visibility is re-read about once a second, not every frame, so a hidden
    // HUD costs one style lookup per second rather than sixty.
    let visible = false, sinceCheck = 60;
    const tick = () => {
      if (++sinceCheck >= 60) { sinceCheck = 0; visible = getComputedStyle(el).display !== "none"; }
      if (visible) {
        cx += (tx - cx) * EASE;
        cy += (ty - cy) * EASE;
        g.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      }
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(frame); };
  }, []);

  return (
    <div className="aegis-hud" ref={root} aria-hidden>
      <div className="aegis-hud-grid" ref={grid} />
      <div className="aegis-hud-sweep" />
      <div className="aegis-hud-scan" />
      <div className="aegis-hud-vignette" />
      <span className="aegis-hud-tick tl" />
      <span className="aegis-hud-tick tr" />
      <span className="aegis-hud-tick bl" />
      <span className="aegis-hud-tick br" />
    </div>
  );
}
