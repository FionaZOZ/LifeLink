'use client';
import * as React from 'react';
import { X } from './tokens';
import { useDispatchElapsed } from './sosTimer';

// ───────────────────────────────────────────────────────────────
// Single source of truth for the volunteer/EMS dispatch flow.
// Every helper event (notification fan-out, accept, en-route, on-scene)
// is keyed off seconds-since-911-confirmed so the state lines up across
// the dispatch card, the CPR mini-strip and the global toast.
// ───────────────────────────────────────────────────────────────

export type HelperState = 'queued' | 'notified' | 'accepted' | 'arriving' | 'on_scene';

export type Helper = {
  id: 'marcus' | 'sarah' | 'jordan' | 'ems';
  name: string;
  role: string;
  color: string;
  /** seconds after dispatch when their phone gets the alert */
  notifyAt: number;
  /** seconds after dispatch when they tap Accept (omit for EMS — auto-dispatched) */
  acceptAt?: number;
  /** ETA in seconds at the moment they accept (or are dispatched, for EMS) */
  etaInitialSec: number;
  /** how the row reads while en route (after accept) */
  enRouteCopy: string;
  /** how the row reads after they arrive (eta = 0) */
  arrivedCopy: string;
  /** how the row reads while still pending acceptance */
  pendingCopy: string;
  /** label used in the global toast when they accept */
  toastLabel?: string;
  /** sub-label used in the toast */
  toastSub?: string;
  /** EMS skips the toast — it's a system, not a person */
  emitsToast: boolean;
};

const HELPERS: Helper[] = [
  {
    id: 'marcus', name: 'Marcus · CPR', role: '0.3 mi · CPR Tier 2', color: X.GREEN,
    notifyAt: 2, acceptAt: 5,
    etaInitialSec: 100,
    enRouteCopy: 'on the way',
    arrivedCopy: 'on scene · CPR',
    pendingCopy: 'notified · awaiting accept',
    toastLabel: 'Marcus accepted', toastSub: 'CPR Tier 2 · ETA 1:40',
    emitsToast: true,
  },
  {
    id: 'sarah', name: 'Sarah · AED', role: '0.5 mi · bringing AED', color: X.AMBER,
    notifyAt: 2, acceptAt: 12,
    etaInitialSec: 165,
    enRouteCopy: 'AED on the way',
    arrivedCopy: '+AED here',
    pendingCopy: 'notified · awaiting accept',
    toastLabel: 'Sarah accepted', toastSub: 'Bringing AED · ETA 2:45',
    emitsToast: true,
  },
  {
    id: 'jordan', name: 'Jordan · CPR', role: '0.8 mi · CPR Tier 1', color: X.INK2,
    notifyAt: 3, // alerted but never accepts in the demo window — illustrates the 3-helper notification
    etaInitialSec: 0,
    enRouteCopy: 'declined',
    arrivedCopy: '—',
    pendingCopy: 'notified',
    emitsToast: false,
  },
  {
    id: 'ems', name: 'EMS · ambulance', role: 'ALS unit', color: X.BLUE,
    notifyAt: 0, acceptAt: 0,
    etaInitialSec: 285,
    enRouteCopy: 'dispatched',
    arrivedCopy: 'on scene · ALS',
    pendingCopy: 'queueing',
    emitsToast: false,
  },
];

export type HelperRowState = {
  helper: Helper;
  state: HelperState;
  etaSec: number | null;       // remaining ETA in seconds, null if not en route
  rowEtaText: string;           // human-readable ETA text ("1:23", "ON SCENE", "PENDING")
  rowStatusText: string;        // human-readable status copy
  acceptedAtSec: number | null; // seconds since dispatch when this helper accepted (for toast detection)
};

function fmtMmSs(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function deriveRowState(helper: Helper, dispatchSec: number, confirmed: boolean): HelperRowState {
  if (!confirmed || dispatchSec < helper.notifyAt) {
    return {
      helper, state: 'queued',
      etaSec: null, rowEtaText: '—', rowStatusText: helper.id === 'ems' ? 'queueing' : 'awaiting alert',
      acceptedAtSec: null,
    };
  }

  // Jordan never accepts in the demo — sits at "notified".
  if (helper.id === 'jordan') {
    return {
      helper, state: 'notified',
      etaSec: null, rowEtaText: 'PENDING', rowStatusText: helper.pendingCopy,
      acceptedAtSec: null,
    };
  }

  if (helper.acceptAt == null || dispatchSec < helper.acceptAt) {
    return {
      helper, state: 'notified',
      etaSec: null, rowEtaText: 'PENDING', rowStatusText: helper.pendingCopy,
      acceptedAtSec: null,
    };
  }

  const remaining = Math.max(0, helper.etaInitialSec - (dispatchSec - helper.acceptAt));
  if (remaining <= 0) {
    return {
      helper, state: 'on_scene',
      etaSec: 0, rowEtaText: 'ON SCENE', rowStatusText: helper.arrivedCopy,
      acceptedAtSec: helper.acceptAt,
    };
  }
  if (remaining <= 25) {
    return {
      helper, state: 'arriving',
      etaSec: remaining, rowEtaText: fmtMmSs(remaining), rowStatusText: 'arriving',
      acceptedAtSec: helper.acceptAt,
    };
  }
  return {
    helper, state: 'accepted',
    etaSec: remaining, rowEtaText: fmtMmSs(remaining), rowStatusText: helper.enRouteCopy,
    acceptedAtSec: helper.acceptAt,
  };
}

export function useHelperFlow() {
  const { seconds, confirmed } = useDispatchElapsed();

  return React.useMemo(() => {
    const rows = HELPERS.map(h => deriveRowState(h, seconds, confirmed));
    const alertedCount = rows.filter(r => r.helper.id !== 'ems' && r.state !== 'queued').length;
    const acceptedCount = rows.filter(r => r.state === 'accepted' || r.state === 'arriving' || r.state === 'on_scene').length;
    const onSceneCount = rows.filter(r => r.state === 'on_scene').length;
    return { rows, alertedCount, acceptedCount, onSceneCount, dispatchSec: seconds, confirmed };
  }, [seconds, confirmed]);
}

// ───────────────────────────────────────────────────────────────
// Acceptance event detector — for the global slide-down toast.
// Returns the latest unseen acceptance, suppressed for ~5s after firing.
// ───────────────────────────────────────────────────────────────

export type AcceptanceEvent = {
  id: string;
  helperId: Helper['id'];
  title: string;
  sub: string;
  color: string;
  triggeredAt: number;
};

const TOAST_VISIBLE_MS = 4500;

export function useLatestAcceptanceEvent(): {
  event: AcceptanceEvent | null;
  dismiss: () => void;
} {
  const { rows, confirmed } = useHelperFlow();
  const seenRef = React.useRef<Set<string>>(new Set());
  const [active, setActive] = React.useState<AcceptanceEvent | null>(null);

  React.useEffect(() => {
    if (!confirmed) return;
    for (const row of rows) {
      if (!row.helper.emitsToast) continue;
      if (row.acceptedAtSec == null) continue;
      // Build a stable id so the same event doesn't re-fire each tick.
      const eventId = `${row.helper.id}-accept-${row.acceptedAtSec}`;
      if (seenRef.current.has(eventId)) continue;
      seenRef.current.add(eventId);
      setActive({
        id: eventId,
        helperId: row.helper.id,
        title: row.helper.toastLabel ?? `${row.helper.name} accepted`,
        sub: row.helper.toastSub ?? row.helper.role,
        color: row.helper.color,
        triggeredAt: Date.now(),
      });
    }
  }, [rows, confirmed]);

  // Auto-clear after TOAST_VISIBLE_MS
  React.useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      setActive(prev => prev?.id === active.id ? null : prev);
    }, TOAST_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [active]);

  const dismiss = React.useCallback(() => setActive(null), []);

  return { event: active, dismiss };
}
