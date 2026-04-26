'use client';

import * as React from 'react';
import { useSerialCPR } from '@/lib/cpr/useSerialCPR';

const SosSerialCprContext = React.createContext<ReturnType<typeof useSerialCPR> | null>(null);

/** Active `/sos` layout roots (React 18 Strict Mode can briefly go 0 between unmount + remount). */
let sosSerialLayoutDepth = 0;
let pendingSosSerialDisconnect: ReturnType<typeof setTimeout> | null = null;

function scheduleDebouncedSosSerialDisconnect(disconnect: () => void | Promise<void>) {
  if (pendingSosSerialDisconnect != null) {
    clearTimeout(pendingSosSerialDisconnect);
    pendingSosSerialDisconnect = null;
  }
  pendingSosSerialDisconnect = setTimeout(() => {
    pendingSosSerialDisconnect = null;
    if (sosSerialLayoutDepth === 0) void disconnect();
  }, 120);
}

/** One Web Serial session for the whole SOS flow so tutorial ↔ assist keeps the patch. */
export function SosSerialCprProvider({ children }: { children: React.ReactNode }) {
  const cpr = useSerialCPR();
  const disconnectRef = React.useRef(cpr.disconnect);
  disconnectRef.current = cpr.disconnect;

  React.useEffect(() => {
    sosSerialLayoutDepth += 1;
    // Cancel any pending teardown from a previous Strict Mode / layout unmount so we
    // do not close the port right after this mount (breaks the next open()).
    if (pendingSosSerialDisconnect != null) {
      clearTimeout(pendingSosSerialDisconnect);
      pendingSosSerialDisconnect = null;
    }
    return () => {
      sosSerialLayoutDepth -= 1;
      scheduleDebouncedSosSerialDisconnect(() => disconnectRef.current());
    };
  }, []);

  return <SosSerialCprContext.Provider value={cpr}>{children}</SosSerialCprContext.Provider>;
}

export function useSosSerialCpr() {
  const v = React.useContext(SosSerialCprContext);
  if (!v) {
    throw new Error('useSosSerialCpr must be used under <SosSerialCprProvider> (app/sos/layout).');
  }
  return v;
}
