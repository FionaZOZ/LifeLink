'use client';
import * as React from 'react';
import { X } from './tokens';
import { useDispatchElapsed } from './sosTimer';
import { useT } from './i18n';

// ───────────────────────────────────────────────────────────────
// Single source of truth for the volunteer/EMS dispatch flow.
// Every helper event (notification fan-out, accept, en-route, on-scene)
// is keyed off seconds-since-911-confirmed so the state lines up across
// the dispatch card, the CPR mini-strip and the global toast.
// ───────────────────────────────────────────────────────────────

export type HelperState = 'queued' | 'notified' | 'accepted' | 'arriving' | 'on_scene';

// Internal helper definition stores i18n keys instead of raw strings so
// useHelperFlow() can translate everything at the hook boundary.
type HelperDef = {
  id: 'marcus' | 'sarah' | 'jordan' | 'ems';
  nameKey: string;
  roleKey: string;
  color: string;
  notifyAt: number;
  acceptAt?: number;
  etaInitialSec: number;
  enRouteKey: string;
  arrivedKey: string;
  pendingKey: string;
  toastLabelKey?: string;
  toastSubKey?: string;
  emitsToast: boolean;
};

// Public Helper shape — translated copies (consumers expect plain strings).
export type Helper = {
  id: HelperDef['id'];
  name: string;
  role: string;
  color: string;
  notifyAt: number;
  acceptAt?: number;
  etaInitialSec: number;
  enRouteCopy: string;
  arrivedCopy: string;
  pendingCopy: string;
  toastLabel?: string;
  toastSub?: string;
  emitsToast: boolean;
};

const HELPER_DEFS: HelperDef[] = [
  {
    id: 'marcus', nameKey: 'flow.marcus.name', roleKey: 'flow.marcus.role', color: X.GREEN,
    notifyAt: 2, acceptAt: 5, etaInitialSec: 100,
    enRouteKey: 'flow.marcus.enRoute', arrivedKey: 'flow.marcus.arrived', pendingKey: 'flow.marcus.pending',
    toastLabelKey: 'flow.marcus.toast', toastSubKey: 'flow.marcus.toastSub',
    emitsToast: true,
  },
  {
    id: 'sarah', nameKey: 'flow.sarah.name', roleKey: 'flow.sarah.role', color: X.AMBER,
    notifyAt: 2, acceptAt: 12, etaInitialSec: 165,
    enRouteKey: 'flow.sarah.enRoute', arrivedKey: 'flow.sarah.arrived', pendingKey: 'flow.sarah.pending',
    toastLabelKey: 'flow.sarah.toast', toastSubKey: 'flow.sarah.toastSub',
    emitsToast: true,
  },
  {
    id: 'jordan', nameKey: 'flow.jordan.name', roleKey: 'flow.jordan.role', color: X.INK2,
    notifyAt: 3, etaInitialSec: 0,
    enRouteKey: 'flow.jordan.enRoute', arrivedKey: 'flow.jordan.arrived', pendingKey: 'flow.jordan.pending',
    emitsToast: false,
  },
  {
    id: 'ems', nameKey: 'flow.ems.name', roleKey: 'flow.ems.role', color: X.BLUE,
    notifyAt: 0, acceptAt: 0, etaInitialSec: 285,
    enRouteKey: 'flow.ems.enRoute', arrivedKey: 'flow.ems.arrived', pendingKey: 'flow.ems.pending',
    emitsToast: false,
  },
];

export type HelperRowState = {
  helper: Helper;
  state: HelperState;
  etaSec: number | null;
  rowEtaText: string;
  rowStatusText: string;
  acceptedAtSec: number | null;
};

function fmtMmSs(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

type Translate = (key: string, vars?: Record<string, string | number>) => string;

function deriveRowState(helper: Helper, dispatchSec: number, confirmed: boolean, t: Translate): HelperRowState {
  if (!confirmed || dispatchSec < helper.notifyAt) {
    return {
      helper, state: 'queued',
      etaSec: null,
      rowEtaText: t('flow.row.dash'),
      rowStatusText: helper.id === 'ems' ? t('flow.row.queueing') : t('flow.row.awaitingAlert'),
      acceptedAtSec: null,
    };
  }

  // Jordan never accepts in the demo — sits at "notified".
  if (helper.id === 'jordan') {
    return {
      helper, state: 'notified',
      etaSec: null, rowEtaText: t('flow.row.pendingTag'), rowStatusText: helper.pendingCopy,
      acceptedAtSec: null,
    };
  }

  if (helper.acceptAt == null || dispatchSec < helper.acceptAt) {
    return {
      helper, state: 'notified',
      etaSec: null, rowEtaText: t('flow.row.pendingTag'), rowStatusText: helper.pendingCopy,
      acceptedAtSec: null,
    };
  }

  const remaining = Math.max(0, helper.etaInitialSec - (dispatchSec - helper.acceptAt));
  if (remaining <= 0) {
    return {
      helper, state: 'on_scene',
      etaSec: 0, rowEtaText: t('flow.row.onSceneTag'), rowStatusText: helper.arrivedCopy,
      acceptedAtSec: helper.acceptAt,
    };
  }
  if (remaining <= 25) {
    return {
      helper, state: 'arriving',
      etaSec: remaining, rowEtaText: fmtMmSs(remaining), rowStatusText: t('flow.row.arriving'),
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
  const { t, lang } = useT();

  return React.useMemo(() => {
    // Resolve i18n keys → strings using the current language.
    const helpers: Helper[] = HELPER_DEFS.map(d => ({
      id: d.id,
      name: t(d.nameKey),
      role: t(d.roleKey),
      color: d.color,
      notifyAt: d.notifyAt,
      acceptAt: d.acceptAt,
      etaInitialSec: d.etaInitialSec,
      enRouteCopy: t(d.enRouteKey),
      arrivedCopy: t(d.arrivedKey),
      pendingCopy: t(d.pendingKey),
      toastLabel: d.toastLabelKey ? t(d.toastLabelKey) : undefined,
      toastSub:   d.toastSubKey   ? t(d.toastSubKey)   : undefined,
      emitsToast: d.emitsToast,
    }));
    const rows = helpers.map(h => deriveRowState(h, seconds, confirmed, t));
    const alertedCount = rows.filter(r => r.helper.id !== 'ems' && r.state !== 'queued').length;
    const acceptedCount = rows.filter(r => r.state === 'accepted' || r.state === 'arriving' || r.state === 'on_scene').length;
    const onSceneCount = rows.filter(r => r.state === 'on_scene').length;
    return { rows, alertedCount, acceptedCount, onSceneCount, dispatchSec: seconds, confirmed };
    // include lang in deps so the memo re-runs when language changes
  }, [seconds, confirmed, lang, t]);
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
  const { t } = useT();
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
        title: row.helper.toastLabel ?? t('flow.row.acceptedSuffix', { name: row.helper.name }),
        sub: row.helper.toastSub ?? row.helper.role,
        color: row.helper.color,
        triggeredAt: Date.now(),
      });
    }
  }, [rows, confirmed, t]);

  // Auto-clear after TOAST_VISIBLE_MS
  React.useEffect(() => {
    if (!active) return;
    const tt = setTimeout(() => {
      setActive(prev => prev?.id === active.id ? null : prev);
    }, TOAST_VISIBLE_MS);
    return () => clearTimeout(tt);
  }, [active]);

  const dismiss = React.useCallback(() => setActive(null), []);

  return { event: active, dismiss };
}
