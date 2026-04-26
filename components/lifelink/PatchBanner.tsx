'use client';

import * as React from 'react';
import { X, FONT } from '@/components/lifelink/tokens';
import type { SerialCpr } from '@/lib/cpr/patchSerialSession';
import type { SerialPatientProfile } from '@/lib/cpr/useSerialCPR';

export function PatchBanner({
  cpr,
  connected,
  effectiveProfile,
  isFallbackProfile = false,
  onOpenProfile,
}: {
  cpr: SerialCpr;
  connected: boolean;
  effectiveProfile?: SerialPatientProfile | null;
  isFallbackProfile?: boolean;
  onOpenProfile?: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const hasProfile = mounted && !!effectiveProfile;
  const profileName = effectiveProfile?.name;

  const label = !mounted
    ? 'PATCH OFFLINE · PLUG IN TO CONNECT'
    : !cpr.isSupported
      ? 'WEB SERIAL UNSUPPORTED'
      : cpr.isConnecting
        ? 'PATCH CONNECTING…'
        : connected
          ? hasProfile
            ? `PATCH READY · TAP TO VIEW ${profileName ? profileName.toUpperCase() : 'PROFILE'}${isFallbackProfile ? ' · DEMO' : ''}`
            : `PATCH STREAMING · LOADING PROFILE… (${cpr.sampleCount})`
          : cpr.isConnected
            ? 'PATCH WAITING FOR DATA'
            : 'PATCH OFFLINE · PLUG IN TO CONNECT';

  const disabled = mounted ? cpr.isConnecting || !cpr.isSupported : false;
  const cursor = !mounted ? 'pointer' : cpr.isSupported ? 'pointer' : 'default';

  const handleClick = () => {
    if (connected && hasProfile && onOpenProfile) {
      onOpenProfile();
      return;
    }
    // `connected` can be false while the port is already open (e.g. waiting for the
    // first sample). A second `connect()` throws from Web Serial — use port state.
    if (cpr.isConnecting) return;
    void (cpr.isConnected ? cpr.disconnect() : cpr.connect());
  };

  const tone =
    !mounted || !connected
      ? { bg: 'rgba(232,133,44,0.15)', border: 'rgba(232,133,44,0.4)', dot: X.AMBER, fg: X.AMBER }
      : !hasProfile
        ? { bg: 'rgba(44,102,232,0.15)', border: 'rgba(44,102,232,0.4)', dot: X.BLUE, fg: X.BLUE }
        : isFallbackProfile
          ? { bg: 'rgba(232,133,44,0.18)', border: 'rgba(232,133,44,0.45)', dot: X.AMBER, fg: X.AMBER }
          : { bg: 'rgba(31,138,77,0.15)', border: 'rgba(31,138,77,0.4)', dot: X.GREEN, fg: X.GREEN };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      style={{
        all: 'unset',
        cursor,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        width: '100%',
        boxSizing: 'border-box',
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        borderRadius: 10,
        marginBottom: 8,
      }}
    >
      <span
        className="ll-blink"
        style={{ width: 6, height: 6, borderRadius: 3, background: tone.dot, flexShrink: 0 }}
      />
      <span
        style={{
          fontSize: 10,
          fontFamily: FONT.mono,
          letterSpacing: 1.2,
          fontWeight: 700,
          color: tone.fg,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>
    </button>
  );
}
