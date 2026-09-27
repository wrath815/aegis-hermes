import { useCallback, useEffect, useState } from "react";

import { api, fetchJSON } from "./sdk";
import { MissionRoom, type KanbanTask, type Snapshot } from "./MissionRoom";
import { Orb } from "./Orb";

/**
 * Dashboard data door for Mission Control: the host's own API client, polled
 * every few seconds while the tab is visible. Each source settles on its own,
 * so one failure never blanks the room.
 */

interface Board { columns: { name: string; tasks: KanbanTask[] }[] }

const POLL_MS = 5000;

async function loadSnapshot(): Promise<Snapshot> {
  const pick = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
  const [status, model, system, sessions, profiles, board, analytics] = await Promise.allSettled([
    api.getStatus(),
    api.getModelInfo(),
    api.getSystemStats(),
    api.getSessions(25, 0, undefined, "recent"),
    api.getProfiles(),
    fetchJSON<Board>("/api/plugins/kanban/board"),
    api.getAnalytics(1),
  ]);
  const boardValue = pick(board);
  return {
    status: pick(status),
    model: pick(model),
    system: pick(system),
    sessions: pick(sessions)?.sessions ?? null,
    profiles: pick(profiles)?.profiles ?? null,
    tasks: boardValue ? boardValue.columns.flatMap(c => c.tasks.map(t => ({ ...t, status: c.name }))) : null,
    analytics: pick(analytics)?.totals ?? null,
  };
}

export function MissionControl() {
  const [snap, setSnap] = useState<Snapshot>({});
  const [loaded, setLoaded] = useState(false);
  const refresh = useCallback(async () => {
    setSnap(await loadSnapshot());
    setLoaded(true);
  }, []);
  useEffect(() => {
    let timer = 0;
    let alive = true;
    const tick = async () => {
      // Don't poll a hidden tab; catch up the moment it's visible again.
      if (!document.hidden) await refresh().catch(() => {});
      if (alive) timer = window.setTimeout(tick, POLL_MS);
    };
    const onVisible = () => { if (!document.hidden) void refresh().catch(() => {}); };
    void tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => { alive = false; window.clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);
  return <MissionRoom snap={snap} loaded={loaded} orb={Orb} />;
}
