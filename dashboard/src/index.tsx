import { ASSET_BASE, api } from "./sdk";
import { BootScreen } from "./BootScreen";
import { Hud } from "./Hud";
import { MissionControl } from "./MissionControl";

/**
 * AEGIS dashboard plugin entry.
 *
 *   tab      /mission   Mission Control (orb, agents, tasks, activity, telemetry)
 *   overlay  boot       one-shot boot plate on dashboard load
 *   overlay  hud        instrument chrome, revealed only by the AEGIS Amber theme
 */
/** Status line for the boot plate once the dashboard backend answers. */
async function probe(): Promise<string> {
  const s: { version?: string; gateway_running?: boolean } = await api.getStatus();
  return s.gateway_running ? "gateway online" : `engine ${s.version ? `v${s.version} ` : ""}ready`;
}

const registry = (window as unknown as {
  __HERMES_PLUGINS__?: {
    register: (name: string, component: () => unknown) => void;
    registerSlot: (plugin: string, slot: string, component: () => unknown) => void;
  };
}).__HERMES_PLUGINS__;

if (registry) {
  registry.register("aegis", MissionControl);
  // One component per (plugin, slot) — the registry replaces on re-register —
  // so the two overlay pieces share a wrapper.
  registry.registerSlot("aegis", "overlay", function AegisOverlay() {
    return (
      <>
        <Hud />
        <BootScreen banner={`${ASSET_BASE}aegis-banner.jpg`} logo={`${ASSET_BASE}aegis-logo.png`} probe={probe} />
      </>
    );
  });
}
