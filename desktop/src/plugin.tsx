import { useCallback, useEffect, useState } from "react";
import {
  PALETTE_AREA, ROUTES_AREA, SIDEBAR_NAV_AREA, THEMES_AREA, TITLEBAR_AREAS,
  host, type HermesPlugin, type PluginContext,
} from "@hermes/plugin-sdk";

import { BootScreen } from "../../dashboard/src/BootScreen";
import { Hud } from "../../dashboard/src/Hud";
import { MissionRoom, type Snapshot } from "../../dashboard/src/MissionRoom";
import { Orb2D } from "../../dashboard/src/Orb2D";
import banner from "../../dashboard/dist/assets/aegis-banner.jpg";
import logo from "../../dashboard/dist/assets/aegis-logo.png";
import baseCss from "../../dashboard/src/style.css";
import desktopCss from "./desktop.css";
import fontsCss from "./fonts.css";
import { DESKTOP_THEMES } from "./themes";

/**
 * AEGIS for Hermes Desktop.
 *
 *   route + sidebar   /mission — Mission Control (same view as the dashboard)
 *   themes            the seven AEGIS themes, listed in Settings ▸ Appearance
 *   title-bar mount   the boot plate (once per launch) and the Amber HUD
 *   palette           "Open Mission Control"
 *
 * Data comes from this plugin's own backend (`/api/plugins/aegis/snapshot`,
 * dashboard/plugin_api.py), the only REST door a desktop plugin has. Styles and
 * fonts are injected once and removed on disable/reload via ctx.onDispose.
 */

const POLL_MS = 5000;

function useDesktopSnapshot(ctx: PluginContext) {
  const [snap, setSnap] = useState<Snapshot>({});
  const [loaded, setLoaded] = useState(false);
  const refresh = useCallback(async () => {
    try {
      setSnap(await ctx.rest<Snapshot>("/snapshot"));
    } catch {
      // Backend not mounted yet (plugin just enabled, gateway not restarted):
      // show the offline state rather than stale numbers.
      setSnap({});
    }
    setLoaded(true);
  }, [ctx]);
  useEffect(() => {
    let alive = true;
    let timer = 0;
    const tick = async () => {
      if (!document.hidden) await refresh();
      if (alive) timer = window.setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => { alive = false; window.clearTimeout(timer); };
  }, [refresh]);
  return { snap, loaded };
}

function MissionPage({ ctx }: { ctx: PluginContext }) {
  const { snap, loaded } = useDesktopSnapshot(ctx);
  return (
    <div className="aegis-desktop-page">
      <h1 className="aegis-page-title">Mission Control</h1>
      <MissionRoom snap={snap} loaded={loaded} orb={Orb2D} />
    </div>
  );
}

function Overlay({ ctx }: { ctx: PluginContext }) {
  const probe = useCallback(async () => {
    const s = await ctx.rest<Snapshot>("/snapshot").catch(() => null);
    const version = s?.status?.version;
    return s?.status ? `hermes ${version ? `v${version} ` : ""}ready` : "desktop ready";
  }, [ctx]);
  return (
    <>
      <Hud />
      <BootScreen banner={banner} logo={logo} probe={probe} />
    </>
  );
}

function injectStyles(ctx: PluginContext) {
  const el = document.createElement("style");
  el.dataset.aegisPlugin = "desktop";
  el.textContent = `${fontsCss}\n${baseCss}\n${desktopCss}`;
  document.head.appendChild(el);
  ctx.onDispose(() => el.remove());
}

const plugin: HermesPlugin = {
  id: "aegis",
  name: "AEGIS — Mission Control",
  register(ctx) {
    injectStyles(ctx);
    ctx.registerMany([
      { id: "mission", area: ROUTES_AREA, data: { path: "/mission" }, render: () => <MissionPage ctx={ctx} /> },
      { id: "nav", area: SIDEBAR_NAV_AREA, data: { path: "/mission", label: "Mission Control", codicon: "pulse" } },
      {
        id: "open",
        area: PALETTE_AREA,
        data: { id: "aegis.mission.open", label: "Open Mission Control", keywords: ["aegis", "mission", "orb"], run: () => host.navigate("/mission") },
      },
      { id: "overlay", area: TITLEBAR_AREAS.right, order: 999, render: () => <Overlay ctx={ctx} /> },
      ...DESKTOP_THEMES.map(theme => ({ id: `theme-${theme.name}`, area: THEMES_AREA, data: theme })),
    ]);
  },
};

export default plugin;
