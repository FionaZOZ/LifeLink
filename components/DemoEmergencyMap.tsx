'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Map, NavigationControl, Marker, Source, Layer } from 'react-map-gl/mapbox';
import type { CircleLayer, FillLayer, LineLayer, FillExtrusionLayer } from 'mapbox-gl';
import type { LayerToggles } from './DemoControls';
import type { ScenarioState } from '@/lib/useEmergencyTelemetry';
import 'mapbox-gl/dist/mapbox-gl.css';
import { point, featureCollection } from '@turf/helpers';
import turfCircle from '@turf/circle';

interface DemoEmergencyMapProps {
  state: ScenarioState;
  layers: LayerToggles;
}

// UCLA campus center
const UCLA_CENTER = { latitude: 34.0700, longitude: -118.4450, zoom: 15.2, pitch: 0, bearing: 0 };

// Mapbox token — check once at module level
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// ── GeoJSON builders ───────────────────────────────────────────────────────

function buildAedGeoJSON(aeds: ScenarioState['nearbyAeds']): GeoJSON.FeatureCollection {
  return featureCollection(
    aeds.map(aed =>
      point([aed.lon, aed.lat], {
        id: aed.id,
        name: aed.name,
        padsAvailable: aed.padsAvailable,
        distanceM: aed.distanceM ?? 0,
        source: aed.source ?? 'unknown',
        attribution: aed.attribution ?? '',
      })
    )
  );
}

function buildCoverageGeoJSON(rings: ScenarioState['coverageRings']): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const ring of rings) {
    const walkCircleFeature = turfCircle(point(ring.center), ring.walkRadiusM / 1000, {
      steps: 64,
      units: 'kilometers',
    });
    walkCircleFeature.properties = { type: 'walk' };
    features.push(walkCircleFeature);

    const bikeCircleFeature = turfCircle(point(ring.center), ring.bikeRadiusM / 1000, {
      steps: 64,
      units: 'kilometers',
    });
    bikeCircleFeature.properties = { type: 'bike' };
    features.push(bikeCircleFeature);
  }
  return { type: 'FeatureCollection', features };
}

function buildPathGeoJSON(coords: [number, number][]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords },
      },
    ],
  };
}

function buildEmsPath(
  emsLon: number,
  emsLat: number,
  targetLon: number,
  targetLat: number,
): [number, number][] {
  const midLon = emsLon + (targetLon - emsLon) * 0.3;
  return [
    [emsLon, emsLat],
    [midLon, emsLat],
    [midLon, emsLat + (targetLat - emsLat) * 0.5],
    [targetLon - 0.001, targetLat - 0.001],
    [targetLon, targetLat],
  ];
}

// ── Mapbox layer styles ─────────────────────────────────────────────────────

// AED colors by source: UCLA EH&S = blue (#3b82f6), OSM = green (#22c55e), unknown = yellow (#facc15)
const aedLayerAvailable: CircleLayer = {
  id: 'aed-available',
  type: 'circle',
  source: 'aeds',
  filter: ['==', ['get', 'padsAvailable'], true],
  paint: {
    'circle-radius': 7,
    'circle-color': [
      'match', ['get', 'source'],
      'ucla-ehs', '#3b82f6',
      'osm', '#22c55e',
      '#facc15',
    ] as any,
    'circle-stroke-color': '#000',
    'circle-stroke-width': 1,
    'circle-opacity': 0.85,
  },
};

const aedLayerUnavailable: CircleLayer = {
  id: 'aed-unavailable',
  type: 'circle',
  source: 'aeds',
  filter: ['==', ['get', 'padsAvailable'], false],
  paint: {
    'circle-radius': 6,
    'circle-color': '#71717a',
    'circle-stroke-color': '#000',
    'circle-stroke-width': 1,
    'circle-opacity': 0.7,
  },
};

const coverageWalkFill: FillLayer = {
  id: 'coverage-walk-fill',
  type: 'fill',
  source: 'coverage',
  filter: ['==', ['get', 'type'], 'walk'],
  paint: {
    'fill-color': '#facc15',
    'fill-opacity': 0.1,
  },
};

const coverageWalkLine: LineLayer = {
  id: 'coverage-walk-line',
  type: 'line',
  source: 'coverage',
  filter: ['==', ['get', 'type'], 'walk'],
  paint: {
    'line-color': '#facc15',
    'line-width': 1.5,
    'line-opacity': 0.5,
  },
};

const coverageBikeFill: FillLayer = {
  id: 'coverage-bike-fill',
  type: 'fill',
  source: 'coverage',
  filter: ['==', ['get', 'type'], 'bike'],
  paint: {
    'fill-color': '#3b82f6',
    'fill-opacity': 0.06,
  },
};

const coverageBikeLine: LineLayer = {
  id: 'coverage-bike-line',
  type: 'line',
  source: 'coverage',
  filter: ['==', ['get', 'type'], 'bike'],
  paint: {
    'line-color': '#3b82f6',
    'line-width': 1,
    'line-opacity': 0.4,
  },
};

const emsRouteLayer: LineLayer = {
  id: 'ems-route',
  type: 'line',
  source: 'ems-route',
  paint: {
    'line-color': '#ef4444',
    'line-width': 4,
    'line-opacity': 0.7,
    'line-dasharray': [2, 1],
  },
  layout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
};

const dronePathLayer: LineLayer = {
  id: 'drone-path',
  type: 'line',
  source: 'drone-path',
  paint: {
    'line-color': '#22d3ee',
    'line-width': 3,
    'line-opacity': 0.8,
    'line-dasharray': [2, 2],
  },
  layout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
};

const buildings3dLayer: FillExtrusionLayer = {
  id: '3d-buildings',
  source: 'composite',
  'source-layer': 'building',
  type: 'fill-extrusion',
  minzoom: 14,
  filter: ['==', 'extrude', 'true'],
  paint: {
    'fill-extrusion-color': '#1a1a2e',
    'fill-extrusion-height': ['get', 'height'],
    'fill-extrusion-base': ['get', 'min_height'],
    'fill-extrusion-opacity': 0.6,
  },
};

// ── Empty GeoJSON constant ──────────────────────────────────────────────────
const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

// ── Dropped AED Icon Component ──────────────────────────────────────────────

function DroppedAedIcon({ deliveredAt, deliveredBy }: { deliveredAt: number; deliveredBy: 'drone' | 'volunteer' | null }) {
  const [age, setAge] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setAge(Date.now() - deliveredAt), 50);
    return () => clearInterval(id);
  }, [deliveredAt]);

  const justDropped = age < 800;
  return (
    <div className="flex flex-col items-center">
      {justDropped && (
        <div className="text-[9px] font-bold text-amber-300 mb-0.5 animate-aed-fade-out">
          {deliveredBy === 'drone' ? 'DROP' : 'ARRIVED'}
        </div>
      )}
      <div
        className={`w-5 h-5 bg-amber-400 border-2 border-amber-200 rounded-md flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.7)] ${justDropped ? 'animate-aed-bounce-drop' : ''}`}
      >
        <span className="text-[8px] font-bold text-amber-900">AED</span>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function DemoEmergencyMap({ state, layers }: DemoEmergencyMapProps) {
  const mapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Fly to emergency location when it appears
  useEffect(() => {
    if (!MAPBOX_TOKEN) return;
    if (state.emergencyLocation && mapRef.current && mapLoaded) {
      try {
        const map = mapRef.current.getMap();
        map.flyTo({
          center: [state.emergencyLocation.lon, state.emergencyLocation.lat],
          zoom: 15.5,
          duration: 2000,
        });
      } catch {
        // Ignore if map not ready
      }
    }
  }, [state.emergencyLocation, mapLoaded]);

  // Toggle pitch for 3D view — deferred one frame so style is fully applied
  useEffect(() => {
    if (!MAPBOX_TOKEN) return;
    if (!mapRef.current || !mapLoaded) return;
    requestAnimationFrame(() => {
      try {
        const map = mapRef.current?.getMap();
        if (!map) return;
        map.easeTo({
          pitch: layers.buildings3d ? 45 : 0,
          bearing: layers.buildings3d ? -17 : 0,
          duration: 1000,
        });
      } catch {
        // Ignore if map not ready
      }
    });
  }, [layers.buildings3d, mapLoaded]);

  const onMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  // ── Volunteer trail GeoJSON (memoized) ──────────────────────────────────
  const volunteerTrails = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: state.volunteers
      .filter(v => v.status !== 'standby' && v.progress > 0.05)
      .map(v => ({
        type: 'Feature' as const,
        properties: {
          id: v.id,
          progress: v.progress,
          arrived: v.status === 'arrived',
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [v.startLon, v.startLat],
            [v.currentLon, v.currentLat],
          ],
        },
      })),
  }), [state.volunteers]);

  // ── Token fallback ──────────────────────────────────────────────────────
  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400">
        <div className="text-sm font-semibold mb-2">Mapbox token missing</div>
        <div className="text-xs">Set <code className="bg-zinc-800 px-1 py-0.5 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> in <code className="bg-zinc-800 px-1 py-0.5 rounded">.env.local</code></div>
        <div className="text-xs text-zinc-600 mt-3">Activity feed continues to work.</div>
      </div>
    );
  }

  // ── Build GeoJSON data ────────────────────────────────────────────────

  const aedData = state.nearbyAeds.length > 0 ? buildAedGeoJSON(state.nearbyAeds) : EMPTY_FC;
  const coverageData = state.coverageRings.length > 0 ? buildCoverageGeoJSON(state.coverageRings) : EMPTY_FC;

  const emsRouteData =
    state.emsUnits.length > 0 && state.emergencyLocation
      ? buildPathGeoJSON(
          buildEmsPath(
            state.emsUnits[0].lon,
            state.emsUnits[0].lat,
            state.emergencyLocation.lon,
            state.emergencyLocation.lat,
          ),
        )
      : EMPTY_FC;

  const dronePathData = state.drone ? buildPathGeoJSON(state.drone.path) : EMPTY_FC;

  const isHandoff = state.phase === 'handoff_ready';
  const emsArrived = state.emsPosition && state.emsPosition.progress >= 1;

  return (
    <div className="w-full h-full relative">
      <Map
        ref={mapRef}
        initialViewState={UCLA_CENTER}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        onLoad={onMapLoad}
        projection={{ name: 'mercator' }}
        interactiveLayerIds={mapLoaded ? ['aed-available', 'aed-unavailable'] : []}
        onError={(e: any) => {
          // Silence the known mapbox-gl v3 terrain raycasting bug during init
          if (e.error?.message?.includes("reading '0'")) return;
          console.error('[Mapbox]', e.error);
        }}
        antialias
      >
        <NavigationControl position="top-right" showCompass showZoom />

        {/* ── Data sources + layers — gated behind mapLoaded ── */}
        {mapLoaded && (
          <>
            {/* AED devices */}
            <Source id="aeds" type="geojson" data={aedData}>
              {layers.aeds && <Layer {...aedLayerAvailable} />}
              {layers.aeds && <Layer {...aedLayerUnavailable} />}
            </Source>

            {/* Coverage rings */}
            <Source id="coverage" type="geojson" data={coverageData}>
              {layers.coverage && <Layer {...coverageBikeFill} />}
              {layers.coverage && <Layer {...coverageBikeLine} />}
              {layers.coverage && <Layer {...coverageWalkFill} />}
              {layers.coverage && <Layer {...coverageWalkLine} />}
            </Source>

            {/* EMS route */}
            <Source id="ems-route" type="geojson" data={emsRouteData}>
              {layers.emsRoute && <Layer {...emsRouteLayer} />}
            </Source>

            {/* Drone path */}
            <Source id="drone-path" type="geojson" data={dronePathData}>
              {layers.dronePath && <Layer {...dronePathLayer} />}
            </Source>

            {/* Volunteer trails */}
            <Source id="volunteer-trails" type="geojson" data={volunteerTrails}>
              <Layer
                id="volunteer-trails-line"
                type="line"
                paint={{
                  'line-color': '#a855f7',
                  'line-width': 1.5,
                  'line-opacity': ['case', ['get', 'arrived'], 0.1, 0.35],
                }}
                layout={{ 'line-cap': 'round' }}
              />
            </Source>

            {/* 3D Buildings */}
            {layers.buildings3d && <Layer {...buildings3dLayer} />}
          </>
        )}

        {/* ── Markers (HTML overlays) ── */}

        {/* Emergency location pulsing marker */}
        {state.emergencyLocation && (
          <Marker
            latitude={state.emergencyLocation.lat}
            longitude={state.emergencyLocation.lon}
            anchor="center"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 h-12 bg-red-500 rounded-full animate-ping opacity-40" />
              {/* Gold ring when AED has arrived on scene */}
              {state.aedDelivery.deliveredAt && (
                <div className="absolute w-10 h-10 bg-amber-400 rounded-full animate-pulse opacity-50" />
              )}
              <div className="absolute w-8 h-8 bg-red-500 rounded-full animate-pulse opacity-60" />
              <div className="relative w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-lg shadow-red-500/50" />
            </div>
          </Marker>
        )}

        {/* ── Volunteer markers ── */}
        {state.volunteers.map(v => (
          <Marker key={v.id} latitude={v.currentLat} longitude={v.currentLon} anchor="center">
            {v.status === 'standby' ? (
              <div className="w-3 h-3 rounded-full border-2 border-purple-500 opacity-50" />
            ) : v.status === 'arrived' ? (
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 bg-amber-400 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                  <span className="text-[9px] font-bold text-amber-900">{'\u2713'}</span>
                </div>
                {v.hasAed && (
                  <span className="text-[7px] bg-amber-400/20 text-amber-300 px-1 rounded mt-0.5 font-semibold">AED</span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow-lg shadow-purple-500/40 animate-pulse" />
                {v.hasAed && (
                  <span className="text-[7px] bg-purple-500/20 text-purple-300 px-1 rounded mt-0.5 font-semibold">AED</span>
                )}
              </div>
            )}
          </Marker>
        ))}

        {/* ── Drone marker with AED package ── */}
        {layers.dronePath && state.drone && state.drone.status !== 'delivered' && (
          <Marker latitude={state.drone.lat} longitude={state.drone.lon} anchor="center">
            <div className="relative flex flex-col items-center">
              {/* AED package attached above the drone */}
              <div className="w-3.5 h-3.5 bg-amber-400 border border-amber-200 rounded-sm flex items-center justify-center mb-0.5 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse">
                <span className="text-[7px] font-bold text-amber-900">AED</span>
              </div>
              {/* connector */}
              <div className="w-px h-1 bg-cyan-300/60" />
              {/* drone body */}
              <div className="w-4 h-4 bg-cyan-400 rounded-full border-2 border-white shadow-lg shadow-cyan-400/50" />
            </div>
          </Marker>
        )}

        {/* Drone ETA label */}
        {layers.dronePath && state.drone && state.drone.status !== 'delivered' && (
          <Marker
            latitude={state.drone.lat}
            longitude={state.drone.lon}
            anchor="bottom"
            offset={[0, -24]}
          >
            <div className="bg-cyan-900/90 text-cyan-300 text-[10px] font-semibold px-2 py-1 rounded shadow-lg border border-cyan-700">
              {state.drone.eta_seconds}s
            </div>
          </Marker>
        )}

        {/* ── AED drop animation — when delivery happens ── */}
        {state.aedDelivery.deliveredAt && state.aedDelivery.position && (
          <Marker
            latitude={state.aedDelivery.position.lat}
            longitude={state.aedDelivery.position.lon}
            anchor="bottom"
            offset={[20, -10]}
          >
            <DroppedAedIcon
              deliveredAt={state.aedDelivery.deliveredAt}
              deliveredBy={state.aedDelivery.deliveredBy}
            />
          </Marker>
        )}

        {/* Drone delivered (at rest on scene) */}
        {layers.dronePath && state.drone?.status === 'delivered' && (
          <Marker latitude={state.drone.lat} longitude={state.drone.lon} anchor="center">
            <div className="w-3 h-3 bg-cyan-400/50 rounded-full border border-cyan-300/30" />
          </Marker>
        )}

        {/* ── EMS animated marker ── */}
        {state.emsPosition && (
          <Marker latitude={state.emsPosition.lat} longitude={state.emsPosition.lon} anchor="center">
            <div className={`text-[12px] font-bold px-1.5 py-0.5 rounded shadow-lg border ${
              emsArrived
                ? 'bg-green-700 text-white border-green-500'
                : 'bg-red-600 text-white border-red-400'
            }`}>
              {emsArrived ? 'ON SCENE' : '\uD83D\uDE91'}
            </div>
          </Marker>
        )}

        {/* ── Hospital label with handoff pulse ── */}
        {layers.hospital && state.hospital && (
          <Marker
            latitude={state.hospital.lat}
            longitude={state.hospital.lon}
            anchor="bottom"
            offset={[0, -16]}
          >
            <div className={`text-[10px] font-semibold px-2 py-1 rounded shadow-lg max-w-[140px] text-center ${
              isHandoff
                ? 'bg-purple-900/90 text-purple-300 border border-purple-500 animate-pulse'
                : 'bg-green-900/90 text-green-300 border border-green-700'
            }`}>
              {'\uD83C\uDFE5'} {state.hospital.name.split(' ').slice(0, 3).join(' ')}
              {state.hospital.ecmo_capable && (
                <span className="block text-[8px] text-green-400">ECMO Ready</span>
              )}
            </div>
          </Marker>
        )}
      </Map>

      {/* Map legend overlay */}
      <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-zinc-700/50">
        <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1.5">
          Legend
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-zinc-300">Emergency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-[10px] text-zinc-300">AED (campus)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full" />
            <span className="text-[10px] text-zinc-300">Volunteer (en route)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-400 rounded-full" />
            <span className="text-[10px] text-zinc-300">Arrived / AED on scene</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan-400 rounded-full" />
            <span className="text-[10px] text-zinc-300">Drone + AED payload</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded-sm" />
            <span className="text-[10px] text-zinc-300">EMS unit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-[10px] text-zinc-300">Hospital</span>
          </div>
        </div>
      </div>
    </div>
  );
}
