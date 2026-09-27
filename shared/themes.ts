/** The subset of the Hermes dashboard theme model these definitions use. */
export interface ThemeLayer { hex: string; alpha: number }
export interface ThemeTypography {
  fontSans: string; fontMono: string; fontDisplay?: string; fontUrl?: string;
  baseSize: string; lineHeight: string; letterSpacing: string;
}
export interface ThemeLayout { radius: string; density: "compact" | "comfortable" | "spacious" }
export interface DashboardTheme {
  name: string; label: string; description: string;
  palette: { background: ThemeLayer; midground: ThemeLayer; foreground: ThemeLayer; warmGlow: string; noiseOpacity: number };
  typography: ThemeTypography;
  layout: ThemeLayout;
  customCSS?: string;
  colorOverrides?: Record<string, string>;
  seriesColors?: { inputTokenAccent?: string; outputTokenAccent?: string };
  swatchColors?: [string, string, string];
  terminalBackground?: string;
  terminalForeground?: string;
}

/**
 * AEGIS theme pack — the single source for both surfaces.
 *
 * `desktop/src/themes.ts` turns these into Hermes Desktop themes; the dashboard
 * theme files in `themes/*.yaml` are generated from the same values.
 * Names are prefixed `aegis-` so they never collide with a Hermes preset.
 *
 * Each theme maps the AEGIS tokens onto the dashboard's slots:
 *   --bg      → palette.background      --ink   → palette.midground (text)
 *   --gold    → primary / ring (accent) --panel → card / popover
 *   --line    → border / input          --muted → mutedForeground
 */

const SANS = '"Segoe UI Variable", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif';
const MONO = 'ui-monospace, "Cascadia Mono", "SF Mono", Menlo, Consolas, monospace';
const SERIF = '"Iowan Old Style", "Palatino Linotype", Georgia, serif';

/** Fraunces for Sandstone comes from Google Fonts and falls back to the local
 *  serif stack offline. Regalia's faces ship with the plugin (assets/fonts). */
const SANDSTONE_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&display=swap";

const TYPE: ThemeTypography = {
  fontSans: SANS,
  fontMono: MONO,
  baseSize: "15px",
  lineHeight: "1.6",
  letterSpacing: "0",
};

const ROUNDED: ThemeLayout = { radius: "0.75rem", density: "comfortable" };

interface AegisTokens {
  bg: string;
  panel: string;
  panelSoft: string;
  ink: string;
  muted: string;
  gold: string;
  onAccent: string;
  green: string;
  red: string;
  line: string;
}

function build(
  name: string,
  label: string,
  description: string,
  t: AegisTokens,
  extra: Partial<DashboardTheme> = {},
): DashboardTheme {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(t.gold.slice(i, i + 2), 16));
  return {
    name,
    label,
    description,
    palette: {
      background: { hex: t.bg, alpha: 1 },
      midground: { hex: t.ink, alpha: 1 },
      foreground: { hex: "#ffffff", alpha: 0 },
      warmGlow: `rgba(${r}, ${g}, ${b}, 0.3)`,
      noiseOpacity: 0,
    },
    typography: TYPE,
    layout: ROUNDED,
    colorOverrides: {
      card: t.panel,
      cardForeground: t.ink,
      popover: t.panel,
      popoverForeground: t.ink,
      primary: t.gold,
      primaryForeground: t.onAccent,
      secondary: t.panelSoft,
      secondaryForeground: t.ink,
      muted: t.panelSoft,
      mutedForeground: t.muted,
      accent: t.panelSoft,
      accentForeground: t.ink,
      destructive: t.red,
      success: t.green,
      border: t.line,
      input: t.line,
      ring: t.gold,
    },
    seriesColors: { inputTokenAccent: t.muted, outputTokenAccent: t.gold },
    swatchColors: [t.bg, t.gold, t.ink],
    terminalBackground: t.bg,
    terminalForeground: t.ink,
    ...extra,
  };
}

export const aegisObsidian = build(
  "aegis-obsidian", "AEGIS Obsidian", "Quiet charcoal, sage accents, room to think.",
  { bg: "#131716", panel: "#181e1c", panelSoft: "#222b27", ink: "#e8efeb", muted: "#a0aea6",
    gold: "#91baa5", onAccent: "#131716", green: "#99cdb2", red: "#f19e98", line: "#35443c" },
);

export const aegisPorcelain = build(
  "aegis-porcelain", "AEGIS Porcelain", "Warm paper, clear type and deep forest green.",
  { bg: "#f4f3ef", panel: "#ffffff", panelSoft: "#e9eee9", ink: "#25352e", muted: "#637269",
    gold: "#286453", onAccent: "#ffffff", green: "#2e7157", red: "#b13c36", line: "#cbd5cb" },
  { terminalBackground: "#fbfaf7" },
);

export const aegisMidnight = build(
  "aegis-midnight", "AEGIS Midnight", "Deep navy with cool blue signals.",
  { bg: "#111827", panel: "#182237", panelSoft: "#202e46", ink: "#e4ecfa", muted: "#a0b0ca",
    gold: "#94b7ee", onAccent: "#121b2b", green: "#90c6b2", red: "#f0a4ac", line: "#34435e" },
);

/** The original mission-control look. Square corners, amber signal, and the
 *  HUD overlay (grid, scanlines, sweep, vignette) switched on — the overlay
 *  component ships in the `aegis` dashboard plugin and stays hidden unless
 *  this theme's CSS reveals it. */
export const aegisAmber = build(
  "aegis-amber", "AEGIS Amber", "The original mission-control look — amber on black, with the HUD.",
  { bg: "#080907", panel: "#10110c", panelSoft: "#16170f", ink: "#e9e3d4", muted: "#a39c89",
    gold: "#ffc233", onAccent: "#171b16", green: "#9fd69a", red: "#ff7a6b", line: "#3a3522" },
  {
    typography: { ...TYPE, fontSans: MONO, letterSpacing: "0.01em" },
    layout: { radius: "0.125rem", density: "comfortable" },
    customCSS: `
      .aegis-hud { display: block !important; }
      h1, h2, h3 { letter-spacing: 0.04em; text-transform: uppercase; }
    `,
  },
);

export const aegisRegalia = build(
  "aegis-regalia", "AEGIS Regalia", "Gold lettering on deep burgundy, with Great Vibes calligraphy.",
  { bg: "#3a0f1a", panel: "#4a1622", panelSoft: "#5a1e2c", ink: "#ecd9a0", muted: "#c9a86f",
    gold: "#e6c34d", onAccent: "#2a0a13", green: "#b8c07a", red: "#e8a06a", line: "#6a2434" },
  {
    typography: {
      ...TYPE,
      fontSans: `"IM Fell English", ${SERIF}`,
      fontDisplay: `"Great Vibes", "Snell Roundhand", "Segoe Script", cursive`,
      baseSize: "16px",
    },
    customCSS: `
      h1, h2 { font-family: var(--theme-font-display); font-weight: 400; letter-spacing: 0; line-height: 1.25; }
      h1 { font-size: 2.6em; }
      h2 { font-size: 1.9em; }
      /* IM Fell sets old-style figures; readings and counts read better lining. */
      .aegis-tile strong, .aegis-readout small, .aegis-mission-status, .aegis-feed-meta, .aegis-feed-row time,
      .aegis-task-meta, .aegis-agent-meta {
        font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif;
      }
    `,
  },
);

export const aegisSandstone = build(
  "aegis-sandstone", "AEGIS Sandstone", "Warm paper and terracotta, set in a refined serif.",
  { bg: "#f6f1e7", panel: "#fffdf8", panelSoft: "#efe7d6", ink: "#3a2c1d", muted: "#7c6a54",
    gold: "#a8642a", onAccent: "#ffffff", green: "#5c7a4a", red: "#b1503a", line: "#d8ccb4" },
  {
    typography: { ...TYPE, fontDisplay: `"Fraunces", ${SERIF}`, fontUrl: SANDSTONE_FONT_URL },
    terminalBackground: "#fffdf8",
    customCSS: `h1, h2, h3 { font-family: var(--theme-font-display); letter-spacing: -0.02em; }`,
  },
);

export const aegisNebula = build(
  "aegis-nebula", "AEGIS Nebula", "Deep violet with cyan signals — the mission-control lane.",
  { bg: "#0d0b1a", panel: "#171334", panelSoft: "#211b47", ink: "#e9e6fb", muted: "#a9a3d0",
    gold: "#8b7bf0", onAccent: "#14112b", green: "#7fd6c0", red: "#f0a4c4", line: "#332c5e" },
  { seriesColors: { inputTokenAccent: "#5fd0e0", outputTokenAccent: "#8b7bf0" } },
);

export const AEGIS_THEMES: Record<string, DashboardTheme> = Object.fromEntries(
  [aegisObsidian, aegisPorcelain, aegisMidnight, aegisAmber, aegisRegalia, aegisSandstone, aegisNebula]
    .map((theme) => [theme.name, theme]),
);
