'use client';

import * as React from 'react';
import type { SerialPatientProfile } from '@/lib/cpr/useSerialCPR';

/**
 * Auto-opens the profile sheet on first profile in a connection session; manual
 * open via `openManually`. Disconnect clears ack so the next session can pop again,
 * unless `treatProfileAsInitiallyAcked` (e.g. user already confirmed on tutorial).
 */
export function usePatchProfileSheet(
  profile: SerialPatientProfile | null,
  connected: boolean,
  opts?: { treatProfileAsInitiallyAcked?: boolean },
): { open: boolean; dismiss: () => void; openManually: () => void } {
  const [open, setOpen] = React.useState(false);
  const treatAck = !!opts?.treatProfileAsInitiallyAcked;
  const ackedRef = React.useRef(treatAck);

  React.useEffect(() => {
    if (!connected) {
      if (!treatAck) ackedRef.current = false;
    } else if (treatAck) {
      ackedRef.current = true;
      setOpen(false);
    }
  }, [connected, treatAck]);

  React.useEffect(() => {
    if (profile && !ackedRef.current) setOpen(true);
  }, [profile]);

  const dismiss = React.useCallback(() => {
    ackedRef.current = true;
    setOpen(false);
  }, []);

  const openManually = React.useCallback(() => {
    if (profile) setOpen(true);
  }, [profile]);

  return { open, dismiss, openManually };
}
