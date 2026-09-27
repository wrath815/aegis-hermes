import { AEGIS_THEMES } from "../../shared/themes";

/**
 * The AEGIS theme pack as Hermes Desktop themes.
 *
 * Derived from the shared definitions (shared/themes.ts) so the two
 * surfaces can never drift: same palette, same accent, same type. The desktop
 * model wants flat colour tokens; `midground` is its brand accent (focus rings,
 * active pills, selection), so it takes the AEGIS gold.
 */

export interface DesktopTheme {
  name: string;
  label: string;
  description: string;
  colors: Record<string, string>;
  typography?: { fontSans?: string; fontMono?: string };
  customCSS?: string;
}

/** Desktop-only chrome per theme. Selectors are this plugin's own classes plus
 *  plain headings, so a Hermes UI change can't break them. */
const DESKTOP_CSS: Record<string, string> = {
  "aegis-amber": ".aegis-hud { display: block !important; }",
  "aegis-regalia": `h1, h2, .aegis-page-title { font-family: "Great Vibes", "Segoe Script", cursive; font-weight: 400; letter-spacing: 0; }
    .aegis-page-title { font-size: 2.2rem; }
    .aegis-tile strong, .aegis-readout small, .aegis-mission-status, .aegis-feed-meta, .aegis-feed-row time,
    .aegis-task-meta, .aegis-agent-meta { font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif; }`,
  "aegis-sandstone": `h1, h2, .aegis-page-title { font-family: "Iowan Old Style", "Palatino Linotype", Georgia, serif; letter-spacing: -0.02em; }`,
};

export const DESKTOP_THEMES: DesktopTheme[] = Object.values(AEGIS_THEMES).map(theme => {
  const o = theme.colorOverrides ?? {};
  const bg = theme.palette.background.hex;
  const ink = theme.palette.midground.hex;
  const gold = o.primary ?? ink;
  return {
    name: theme.name,
    label: theme.label,
    description: theme.description,
    colors: {
      background: bg,
      foreground: ink,
      card: o.card ?? bg,
      cardForeground: o.cardForeground ?? ink,
      popover: o.popover ?? o.card ?? bg,
      popoverForeground: o.popoverForeground ?? ink,
      muted: o.muted ?? bg,
      mutedForeground: o.mutedForeground ?? ink,
      primary: gold,
      primaryForeground: o.primaryForeground ?? bg,
      secondary: o.secondary ?? o.muted ?? bg,
      secondaryForeground: o.secondaryForeground ?? ink,
      accent: o.accent ?? o.muted ?? bg,
      accentForeground: o.accentForeground ?? ink,
      border: o.border ?? ink,
      input: o.input ?? o.border ?? ink,
      ring: o.ring ?? gold,
      midground: gold,
      destructive: o.destructive ?? "#e5484d",
      destructiveForeground: "#ffffff",
      sidebarBackground: bg,
      sidebarBorder: o.border ?? ink,
    },
    typography: { fontSans: theme.typography.fontSans, fontMono: theme.typography.fontMono },
    customCSS: DESKTOP_CSS[theme.name],
  };
});
