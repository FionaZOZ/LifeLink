// PHASE 1: GPS capture hook with graceful degradation.
// Phase 2 will feed this location to the Fetch.ai bus for real AED / EMS queries.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SESSION_KEY = 'cardiaclink:lastLocation';
const FALLBACK_LAT = 34.0689;
const FALLBACK_LON = -118.4452;

export type EmergencyLocation =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'granted'; lat: number; lon: number; accuracyMeters: number }
  | { status: 'denied'; fallbackLat: number; fallbackLon: number }
  | { status: 'unavailable'; fallbackLat: number; fallbackLon: number };

function loadCached(): EmergencyLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EmergencyLocation;
    if (parsed.status === 'granted') return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function persistLocation(loc: EmergencyLocation) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(loc));
  } catch {
    /* ignore */
  }
}

export function useEmergencyLocation(): {
  location: EmergencyLocation;
  request: () => void;
  retry: () => void;
} {
  const [location, setLocation] = useState<EmergencyLocation>(() => {
    const cached = loadCached();
    return cached ?? { status: 'idle' as const };
  });
  const requestedRef = useRef(false);

  const doRequest = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      const loc: EmergencyLocation = {
        status: 'unavailable',
        fallbackLat: FALLBACK_LAT,
        fallbackLon: FALLBACK_LON,
      };
      setLocation(loc);
      persistLocation(loc);
      return;
    }

    setLocation({ status: 'requesting' });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: EmergencyLocation = {
          status: 'granted',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyMeters: Math.round(pos.coords.accuracy),
        };
        setLocation(loc);
        persistLocation(loc);
      },
      (err) => {
        const status: 'denied' | 'unavailable' =
          err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable';
        const loc: EmergencyLocation = {
          status,
          fallbackLat: FALLBACK_LAT,
          fallbackLon: FALLBACK_LON,
        };
        setLocation(loc);
        persistLocation(loc);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  const request = useCallback(() => {
    if (requestedRef.current && location.status === 'granted') return;
    requestedRef.current = true;
    doRequest();
  }, [doRequest, location.status]);

  const retry = useCallback(() => {
    doRequest();
  }, [doRequest]);

  useEffect(() => {
    if (location.status === 'granted') {
      requestedRef.current = true;
    }
  }, [location.status]);

  return { location, request, retry };
}
