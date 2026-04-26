'use client';

import * as React from 'react';
import { useSerialCPR } from '@/lib/cpr/useSerialCPR';

const SosSerialCprContext = React.createContext<ReturnType<typeof useSerialCPR> | null>(null);

/** One Web Serial session for the whole SOS flow so tutorial ↔ assist keeps the patch. */
export function SosSerialCprProvider({ children }: { children: React.ReactNode }) {
  const cpr = useSerialCPR();
  return <SosSerialCprContext.Provider value={cpr}>{children}</SosSerialCprContext.Provider>;
}

export function useSosSerialCpr() {
  const v = React.useContext(SosSerialCprContext);
  if (!v) {
    throw new Error('useSosSerialCpr must be used under <SosSerialCprProvider> (app/sos/layout).');
  }
  return v;
}
