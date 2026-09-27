/**
 * The boot loader: a constellation that ignites around the portrait.
 *
 * Stars pop in one at a time, hairlines draw between consecutive stars, and two
 * faded arcs sweep the outer edge -- the same motif the portrait itself is
 * built from, so the loader reads as part of the image rather than a widget
 * parked on top of it.
 *
 * Geometry is computed rather than hand-authored so the ring stays regular, and
 * every node sits outside the portrait's corner radius (the square's
 * half-diagonal is ~207 in these units, so nothing lands under the image).
 *
 * All motion is CSS. Under reduced motion the constellation renders complete
 * and still, which is why the drawn state is the CSS default and the dash
 * offset is what animates.
 */

const CX = 240;
const CY = 240;

/** Angles are degrees clockwise from 3 o'clock; radii vary slightly so the
 *  ring reads as a star field rather than a dial. */
const NODES: ReadonlyArray<{ a: number; r: number; s: number }> = [
  { a: -94, r: 226, s: 9 },
  { a: -52, r: 214, s: 6 },
  { a: -14, r: 230, s: 11 },
  { a: 26, r: 218, s: 7 },
  { a: 64, r: 228, s: 9 },
  { a: 104, r: 216, s: 6 },
  { a: 142, r: 229, s: 10 },
  { a: 182, r: 219, s: 7 },
  { a: 218, r: 227, s: 8 },
  { a: 256, r: 215, s: 6 },
  { a: 298, r: 231, s: 11 },
];

function polar(a: number, r: number): [number, number] {
  const rad = (a * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

/** A four-point sparkle, concave sides, centred on the origin. */
function sparkle(size: number): string {
  const r = size;
  const w = size * 0.17;
  return [
    `M 0 ${-r}`,
    `Q ${w} ${-w} ${r} 0`,
    `Q ${w} ${w} 0 ${r}`,
    `Q ${-w} ${w} ${-r} 0`,
    `Q ${-w} ${-w} 0 ${-r}`,
    "Z",
  ].join(" ");
}

function arcPath(from: number, to: number, r: number): string {
  const [x1, y1] = polar(from, r);
  const [x2, y2] = polar(to, r);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

export function BootConstellation() {
  const points = NODES.map((node) => ({ ...node, xy: polar(node.a, node.r) }));

  return (
    <svg
      className="aegis-boot-constellation"
      viewBox="0 0 480 480"
      aria-hidden
      focusable="false"
    >
      <defs>
        {/* Both ends fade out, so an arc never terminates in a hard stub. */}
        <linearGradient id="bc-arc-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--ui-accent, var(--color-primary, #ffc233))" }} stopOpacity="0" />
          <stop offset="35%" style={{ stopColor: "var(--ui-accent, var(--color-primary, #ffc233))" }} stopOpacity="0.55" />
          <stop offset="70%" style={{ stopColor: "var(--ui-accent, var(--color-primary, #ffdf8a))" }} stopOpacity="0.35" />
          <stop offset="100%" style={{ stopColor: "var(--ui-accent, var(--color-primary, #ffc233))" }} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="bc-arc-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--ui-accent, var(--color-primary, #ffc233))" }} stopOpacity="0" />
          <stop offset="45%" style={{ stopColor: "var(--ui-accent, var(--color-primary, #ffc233))" }} stopOpacity="0.4" />
          <stop offset="100%" style={{ stopColor: "var(--ui-accent, var(--color-primary, #ffc233))" }} stopOpacity="0" />
        </linearGradient>
        <radialGradient id="bc-glow">
          <stop offset="0%" style={{ stopColor: "var(--ui-accent, var(--color-primary, #ffdf8a))" }} stopOpacity="0.5" />
          <stop offset="100%" style={{ stopColor: "var(--ui-accent, var(--color-primary, #ffc233))" }} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="bc-spin">
        <path className="bc-arc" d={arcPath(-120, -10, 238)} stroke="url(#bc-arc-a)" pathLength={1} />
        <path className="bc-arc bc-arc-2" d={arcPath(50, 175, 238)} stroke="url(#bc-arc-b)" pathLength={1} />
        <path className="bc-arc bc-arc-3" d={arcPath(200, 290, 244)} stroke="url(#bc-arc-a)" pathLength={1} />

        {/* Hairlines first, so the stars sit above their own connections. */}
        {points.map((node, index) => {
          const next = points[(index + 1) % points.length];
          const [x1, y1] = node.xy;
          const [x2, y2] = next.xy;
          const length = Math.hypot(x2 - x1, y2 - y1);
          return (
            <line
              key={`link-${node.a}`}
              className="bc-link"
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              style={{
                // Consumed by the draw keyframes in styles.css.
                ["--len" as string]: length.toFixed(2),
                animationDelay: `${(0.42 + index * 0.13).toFixed(2)}s`,
              }}
            />
          );
        })}

        {points.map((node, index) => {
          const [x, y] = node.xy;
          const delay = (0.3 + index * 0.13).toFixed(2);
          return (
            <g key={`star-${node.a}`} transform={`translate(${x} ${y})`}>
              <circle
                className="bc-halo"
                r={node.s * 2.6}
                fill="url(#bc-glow)"
                style={{ animationDelay: `${delay}s` }}
              />
              <path
                className="bc-star"
                d={sparkle(node.s)}
                style={{ animationDelay: `${delay}s` }}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
