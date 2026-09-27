/**
 * The handful of line icons Mission Control uses, inlined (lucide geometry,
 * ISC) so the plugin bundle carries no icon library.
 */

const PATHS = {
  radar: ["M19.07 4.93A10 10 0 0 0 6.99 3.34", "M4 6h.01", "M2.29 9.62A10 10 0 1 0 21.31 8.35", "M16.24 7.76A6 6 0 1 0 8.23 16.67", "M12 18h.01", "M17.99 11.66A6 6 0 0 1 15.77 16.67", "M13.41 10.59l5.66-5.66", "M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  kanban: ["M3 3h18v18H3z", "M8 7v7", "M12 7v4", "M16 7v9"],
  activity: ["M22 12h-4l-3 9L9 3l-3 9H2"],
  cpu: ["M4 4h16v16H4z", "M9 9h6v6H9z", "M15 2v2", "M15 20v2", "M2 15h2", "M2 9h2", "M20 15h2", "M20 9h2", "M9 2v2", "M9 20v2"],
  sliders: ["M21 4h-7", "M10 4H3", "M21 12h-9", "M8 12H3", "M21 20h-5", "M12 20H3", "M14 2v4", "M8 10v4", "M16 18v4"],
  x: ["M18 6 6 18", "M6 6l12 12"],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="aegis-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      {PATHS[name].map(d => <path key={d} d={d} />)}
    </svg>
  );
}
