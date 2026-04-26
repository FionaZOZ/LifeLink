// PHASE 1: Compact Leaflet map showing emergency location + 3 nearest AEDs.
// Phase 2 will replace mock data with bus-sourced AED positions.

'use client';

import { useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { UCLA_AEDS_MOCK, type UclaAed } from '@/lib/uclaAedsMock';

// ─── Haversine ────────────────────────────────────────────────
const R_EARTH = 6371000; // metres

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R_EARTH * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function walkingTime(distanceM: number): string {
  const secs = Math.round(distanceM / 1.4);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Types ────────────────────────────────────────────────────
export type NearbyAedMapProps = {
  emergencyLat: number;
  emergencyLon: number;
  variant: 'expanded' | 'collapsed';
  onToggleVariant?: () => void;
};

type RankedAed = UclaAed & { distanceM: number };

// ─── Inner Map (dynamically imported to avoid SSR issues with Leaflet) ───
function AedMapInner({
  emergencyLat,
  emergencyLon,
  nearest3,
}: {
  emergencyLat: number;
  emergencyLon: number;
  nearest3: RankedAed[];
}) {
  const mapRef = useRef<any>(null);
  const fittedRef = useRef(false);

  // We need to import leaflet dynamically inside component
  const [leafletReady, setLeafletReady] = useState(false);
  const [L, setL] = useState<any>(null);
  const [ReactLeaflet, setReactLeaflet] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      import('leaflet'),
      import('react-leaflet'),
    ]).then(([leaflet, rl]) => {
      setL(leaflet.default);
      setReactLeaflet(rl);
      setLeafletReady(true);
      // Dynamically import CSS
      import('leaflet/dist/leaflet.css' as any);
    });
  }, []);

  if (!leafletReady || !L || !ReactLeaflet) {
    return (
      <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c8fa8', fontSize: '0.8rem' }}>
        Loading map...
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = ReactLeaflet;

  const emergencyIcon = L.divIcon({
    className: 'cl-aedmap-emergency',
    html: '<div class="cl-emergency-pulse" style="width:16px;height:16px;background:#C8102E;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(200,16,46,0.7);"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  const makeAedIcon = (distanceLabel: string) =>
    L.divIcon({
      className: 'cl-aedmap-aed',
      html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <span style="font-size:10px;font-weight:700;color:#6BCB77;font-variant-numeric:tabular-nums;text-shadow:0 1px 3px rgba(0,0,0,0.9);white-space:nowrap;margin-bottom:2px;">${distanceLabel}</span>
        <div style="width:12px;height:12px;background:#6BCB77;border-radius:50%;border:2px solid white;"></div>
      </div>`,
      iconSize: [40, 28],
      iconAnchor: [20, 28],
    });

  // FitBounds helper
  function FitBounds() {
    const map = ReactLeaflet.useMap();
    useEffect(() => {
      if (fittedRef.current) return;
      const points: [number, number][] = [
        [emergencyLat, emergencyLon],
        ...nearest3.map((a): [number, number] => [a.lat, a.lon]),
      ];
      if (points.length > 0) {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 });
        fittedRef.current = true;
      }
    }, [map]);
    return null;
  }

  function DisableInteractions() {
    const map = ReactLeaflet.useMap();
    useEffect(() => {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      if (map.zoomControl) map.zoomControl.remove();
    }, [map]);
    return null;
  }

  return (
    <MapContainer
      center={[emergencyLat, emergencyLon]}
      zoom={16}
      style={{ height: '220px', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM contributors</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds />
      <DisableInteractions />
      <Marker position={[emergencyLat, emergencyLon]} icon={emergencyIcon}>
        <Popup>
          <div style={{ fontSize: '11px' }}>
            <strong>Emergency location</strong>
          </div>
        </Popup>
      </Marker>
      {nearest3.map((aed) => (
        <Marker
          key={aed.id}
          position={[aed.lat, aed.lon]}
          icon={makeAedIcon(`${aed.distanceM}m`)}
        >
          <Popup>
            <div style={{ fontSize: '11px', minWidth: '120px' }}>
              <strong>{aed.name}</strong>
              <br />
              Walking: ~{walkingTime(aed.distanceM)}
              <br />
              Distance: {aed.distanceM}m
              {!aed.padsAvailable && (
                <>
                  <br />
                  <span style={{ color: '#C8102E' }}>Pads may be expired</span>
                </>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

// Need useState for the dynamic import approach
import { useState } from 'react';

// ─── Component ────────────────────────────────────────────────
export function NearbyAedMap({
  emergencyLat,
  emergencyLon,
  variant,
  onToggleVariant,
}: NearbyAedMapProps) {
  const nearest3: RankedAed[] = useMemo(() => {
    return UCLA_AEDS_MOCK.map((aed) => ({
      ...aed,
      distanceM: Math.round(haversineM(emergencyLat, emergencyLon, aed.lat, aed.lon)),
    }))
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, 3);
  }, [emergencyLat, emergencyLon]);

  const closestDist = nearest3.length > 0 ? nearest3[0].distanceM : 0;

  return (
    <>
      <style>{`
        @keyframes cl-map-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.18); }
        }
        .cl-emergency-pulse {
          animation: cl-map-pulse 1.6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .cl-emergency-pulse { animation: none !important; }
        }
        .cl-aedmap-container .leaflet-control-attribution {
          font-size: 8px !important;
          background: rgba(0,0,0,0.5) !important;
          color: #999 !important;
          padding: 1px 4px !important;
        }
        .cl-aedmap-container .leaflet-control-attribution a {
          color: #aaa !important;
        }
      `}</style>
      <div
        style={{
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          margin: '12px 0',
          overflow: 'hidden',
          background: '#0a1424',
        }}
      >
        {/* Header strip — always visible */}
        <button
          type="button"
          aria-label={variant === 'collapsed' ? 'Show AED map' : 'Hide AED map'}
          onClick={onToggleVariant}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            height: '44px',
            padding: '0 14px',
            background: 'transparent',
            border: 'none',
            color: '#e8f1ff',
            fontFamily: 'inherit',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: onToggleVariant ? 'pointer' : 'default',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span>
            Nearest AEDs{' '}
            <span style={{ color: '#7c8fa8', fontWeight: 600 }}>({nearest3.length})</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                color: '#6BCB77',
              }}
            >
              {closestDist}m
            </span>
            {onToggleVariant && (
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#7c8fa8',
                  transition: 'transform 200ms ease',
                  display: 'inline-block',
                  transform: variant === 'expanded' ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
                aria-hidden="true"
              >
                &#x25BC;
              </span>
            )}
          </span>
        </button>

        {/* Map — only in expanded mode */}
        {variant === 'expanded' && (
          <div className="cl-aedmap-container" style={{ height: '220px', position: 'relative' }}>
            <AedMapInner
              emergencyLat={emergencyLat}
              emergencyLon={emergencyLon}
              nearest3={nearest3}
            />
          </div>
        )}

        {/* Footer caption — only in expanded */}
        {variant === 'expanded' && (
          <div
            style={{
              padding: '6px 14px 8px',
              fontSize: '0.62rem',
              color: '#7c8fa8',
              lineHeight: 1.3,
            }}
          >
            Coverage cutoffs from Buter et al. 2024 &middot; 3 nearest of {UCLA_AEDS_MOCK.length} on UCLA
            campus
          </div>
        )}
      </div>
    </>
  );
}
