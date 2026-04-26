'use client';

import * as React from 'react';
import { useSerialCPR, type SerialPatientProfile } from '@/lib/cpr/useSerialCPR';

/** Demo profile when the patch streams but has not sent PROFILE yet. */
export const DEMO_FALLBACK_PROFILE: SerialPatientProfile = {
  name: 'John Doe',
  dob: '1999-01-01',
  bloodType: 'O+',
  phone: '123-456-7890',
  address: '123 Example St, Irvine, CA',
  allergies: 'Penicillin',
  conditions: 'Diabetes',
  medications: 'Insulin',
  emergencyContact: { name: 'Jane Doe', relation: 'Mother', phone: '123-555-7890' },
  physician: { name: 'Dr. Smith', phone: '123-555-1111' },
  notes: 'CPR responder: check allergies and current medication first.',
};

export type SerialCpr = ReturnType<typeof useSerialCPR>;

export function useEffectiveProfile(cpr: SerialCpr): {
  profile: SerialPatientProfile | null;
  isFallback: boolean;
} {
  const realProfile = cpr.patientProfile;
  const connected = cpr.isConnected && cpr.isReceiving;

  if (realProfile) return { profile: realProfile, isFallback: false };
  if (connected) return { profile: DEMO_FALLBACK_PROFILE, isFallback: true };
  return { profile: null, isFallback: false };
}

const RETRY_AFTER_MS = 1800;
const MAX_RETRIES = 3;

export function useProfileRetry(cpr: SerialCpr) {
  const connected = cpr.isConnected && cpr.isReceiving;
  const hasProfile = !!cpr.patientProfile;
  React.useEffect(() => {
    if (!connected || hasProfile) return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      await cpr.requestProfile();
    };
    const id = setInterval(() => {
      if (attempts >= MAX_RETRIES) {
        clearInterval(id);
        return;
      }
      void tick();
    }, RETRY_AFTER_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [connected, hasProfile, cpr]);
}
