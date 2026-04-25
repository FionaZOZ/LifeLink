'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
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

const aedLayerAvailable: CircleLayer = {
  id: 'aed-available',
  type: 'circle',
  source: 'aeds',
  filter: ['==', ['get', 'padsAvailable'], true],
  paint: {
    'circle-radius': 7,
    'circle-color': '#facc15',
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

            {/* 3D Buildings */}
            {layers.buildings3d && <Layer {...buildings3dLayer} />}
          </>
        )}

        {/* ── Markers (HTML overlays, always mounted regardless of mapLoaded) ── */}

        {/* Emergency location pulsing marker */}
        {state.emergencyLocation && (
          <Marker
            latitude={state.emergencyLocation.lat}
            longitude={state.emergencyLocation.lon}
            anchor="center"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 h-12 bg-red-500 rounded-full animate-ping opacity-40" />
              <div className="absolute w-8 h-8 bg-red-500 rounded-full animate-pulse opacity-60" />
              <div className="relative w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-lg shadow-red-500/50" />
            </div>
          </Marker>
        )}

        {/* EMS unit marker */}
        {state.emsUnits.map((ems) => (
          <Marker key={ems.id} latitude={ems.lat} longitude={ems.lon} anchor="center">
            <div className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg border border-red-400">
              🚑 {ems.eta_minutes}m
            </div>
          </Marker>
        ))}

        {/* Hospital label */}
        {layers.hospital && state.hospital && (
          <Marker
            latitude={state.hospital.lat}
            longitude={state.hospital.lon}
            anchor="bottom"
            offset={[0, -16]}
          >
            <div className="bg-green-900/90 text-green-300 text-[10px] font-semibold px-2 py-1 rounded shadow-lg border border-green-700 max-w-[140px] text-center">
              🏥 {state.hospital.name.split(' ').slice(0, 3).join(' ')}
              {state.hospital.ecmo_capable && (
                <span className="block text-[8px] text-green-400">ECMO Ready</span>
              )}
            </div>
          </Marker>
        )}

        {/* Drone current position */}
        {layers.dronePath && state.drone && (
          <Marker latitude={state.drone.lat} longitude={state.drone.lon} anchor="center">
            <div className="relative flex items-center justify-center">
              <div className="w-4 h-4 bg-cyan-400 rounded-full border-2 border-white shadow-lg shadow-cyan-400/50" />
            </div>
          </Marker>
        )}

        {/* Drone label */}
        {layers.dronePath && state.drone && state.drone.status !== 'delivered' && (
          <Marker
            latitude={state.drone.lat}
            longitude={state.drone.lon}
            anchor="bottom"
            offset={[0, -12]}
          >
            <div className="bg-cyan-900/90 text-cyan-300 text-[10px] font-semibold px-2 py-1 rounded shadow-lg border border-cyan-700">
              🛸 {state.drone.eta_seconds}s
            </div>
          </Marker>
        )}

        {state.drone?.status === 'delivered' && state.emergencyLocation && (
          <Marker
            latitude={state.emergencyLocation.lat}
            longitude={state.emergencyLocation.lon}
            anchor="bottom"
            offset={[20, -20]}
          >
            <div className="bg-cyan-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg animate-bounce">
              AED Delivered
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
            <div className="w-3 h-3 bg-yellow-400 rounded-full" />
            <span className="text-[10px] text-zinc-300">AED (pads OK)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-zinc-500 rounded-full" />
            <span className="text-[10px] text-zinc-300">AED (unavailable)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan-400 rounded-full" />
            <span className="text-[10px] text-zinc-300">Drone</span>
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
