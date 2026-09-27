import { useEffect, useState } from "react";

import { BOOT_PREF_KEY } from "./prefs";
import { BootConstellation } from "./BootConstellation";
import { MatrixRain } from "./MatrixRain";

/**
 * Full-bleed boot plate, shown once per page load while the dashboard's
 * backend answers, then never again for the session.
 *
 * Host-agnostic: the dashboard mounts it in its `overlay` slot and the desktop
 * app in a permanent title-bar mount, each passing its own image URLs and a
 * readiness probe. Layer order, back to front: the banner,
 * a veil that darkens a pool at the centre, the rain, then the emblem and its
 * constellation. Two timers guard it:
 *   - a minimum hold so a fast local backend doesn't cut the ignition short;
 *   - a hard cap so an unreachable backend can never trap the operator.
 *
 * Skippable with a click or Escape, and skipped entirely when the operator has
 * turned it off (Mission Control → orb settings) or asked for reduced motion.
 */

const SEEN_KEY = "aegis.boot.seen";
const MIN_HOLD_MS = 2400;
const CAP_MS = 6000;

function shouldShow(): boolean {
  try {
    if (localStorage.getItem(BOOT_PREF_KEY) === "off") return false;
    if (sessionStorage.getItem(SEEN_KEY) === "1") return false;
  } catch { /* storage blocked: show it, it caps itself */ }
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export interface BootScreenProps {
  /** Full-bleed background artwork URL. */
  banner: string;
  /** Emblem URL shown inside the constellation. */
  logo: string;
  /** Resolves with a short status line once the backend answers. */
  probe: () => Promise<string>;
}

export function BootScreen({ banner, logo, probe }: BootScreenProps) {
  const [visible] = useState(shouldShow);
  const [minDone, setMinDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [capped, setCapped] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [gone, setGone] = useState(false);
  const [status, setStatus] = useState("initialising engine");

  useEffect(() => {
    if (!visible) return;
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* optional */ }
    let alive = true;
    probe()
      .then(line => {
        if (!alive) return;
        setStatus(line);
        setReady(true);
      })
      .catch(() => { if (alive) setStatus("engine did not answer — continuing"); });
    const hold = window.setTimeout(() => setMinDone(true), MIN_HOLD_MS);
    const cap = window.setTimeout(() => setCapped(true), CAP_MS);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSkipped(true); };
    window.addEventListener("keydown", onKey);
    return () => { alive = false; window.clearTimeout(hold); window.clearTimeout(cap); window.removeEventListener("keydown", onKey); };
  }, [visible, probe]);

  const leaving = skipped || capped || (ready && minDone);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setGone(true), 420);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (!visible || gone) return null;

  return (
    <div className={`aegis-boot ${leaving ? "leaving" : ""}`} aria-hidden={leaving} onClick={() => setSkipped(true)}>
      <img className="aegis-boot-bg" src={banner} alt="" draggable={false} />
      <div className="aegis-boot-veil" />
      <MatrixRain />
      <div className="aegis-boot-plate">
        <div className="aegis-boot-art">
          <img className="aegis-boot-mark" src={logo} alt="AEGIS" draggable={false} />
          <BootConstellation />
        </div>
        <div className="aegis-boot-bar"><span /></div>
        <p className="aegis-boot-status" role="status">{status}</p>
      </div>
    </div>
  );
}
