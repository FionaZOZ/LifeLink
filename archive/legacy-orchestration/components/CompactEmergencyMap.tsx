// COMPACT VARIANT — keep in sync with DemoEmergencyMap.tsx
// Embedded map for dispatch screen and orchestration drawer.
// No NavigationControl, no 3D buildings, no legend, no scroll-wheel zoom.

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Map, Marker, Source, Layer } from 'react-map-gl/mapbox';
import type { CircleLayer, FillLayer, LineLayer } from 'mapbox-gl';
import type { LayerToggles } from './DemoControls';
import type { ScenarioState } from '@/lib/useEmergencyTelemetry';
import 'mapbox-gl/dist/mapbox-gl.css';
import { point, featureCollection } from '@turf/helpers';
import turfCircle from '@turf/circle';

interface CompactEmergencyMapProps {
  state: ScenarioState;
  layers?: Partial<LayerToggles>;
  height?: number;
}

const UCLA_CENTER = { latitude: 34.0700, longitude: -118.4450, zoom: 15.2, pitch: 0, bearing: 0 };
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

// ── GeoJSON builders (duplicated from DemoEmergencyMap — keep in sync) ──

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
    const wf = turfCircle(point(ring.center), ring.walkRadiusM / 1000, { steps: 64, units: 'kilometers' });
    wf.properties = { type: 'walk' };
    features.push(wf);
    const bf = turfCircle(point(ring.center), ring.bikeRadiusM / 1000, { steps: 64, units: 'kilometers' });
    bf.properties = { type: 'bike' };
    features.push(bf);
  }
  return { type: 'FeatureCollection', features };
}

function buildPathGeoJSON(coords: [number, number][]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }],
  };
}

function buildEmsPath(emsLon: number, emsLat: number, targetLon: number, targetLat: number): [number, number][] {
  const midLon = emsLon + (targetLon - emsLon) * 0.3;
  return [
    [emsLon, emsLat],
    [midLon, emsLat],
    [midLon, emsLat + (targetLat - emsLat) * 0.5],
    [targetLon - 0.001, targetLat - 0.001],
    [targetLon, targetLat],
  ];
}

// ── Layer styles ──────────────────────────────────────────────────────────

const aedAvailable: CircleLayer = {
  id: 'c-aed-avail', type: 'circle', source: 'c-aeds',
  filter: ['==', ['get', 'padsAvailable'], true],
  paint: { 'circle-radius': 5, 'circle-color': '#facc15', 'circle-stroke-color': '#000', 'circle-stroke-width': 1, 'circle-opacity': 0.8 },
};
const aedUnavailable: CircleLayer = {
  id: 'c-aed-unavail', type: 'circle', source: 'c-aeds',
  filter: ['==', ['get', 'padsAvailable'], false],
  paint: { 'circle-radius': 4, 'circle-color': '#71717a', 'circle-stroke-color': '#000', 'circle-stroke-width': 1, 'circle-opacity': 0.6 },
};
const covWalkFill: FillLayer = { id: 'c-cov-walk-f', type: 'fill', source: 'c-cov', filter: ['==', ['get', 'type'], 'walk'], paint: { 'fill-color': '#facc15', 'fill-opacity': 0.08 } };
const covBikeFill: FillLayer = { id: 'c-cov-bike-f', type: 'fill', source: 'c-cov', filter: ['==', ['get', 'type'], 'bike'], paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.05 } };
const emsRoute: LineLayer = {
  id: 'c-ems-route', type: 'line', source: 'c-ems-route',
  paint: { 'line-color': '#ef4444', 'line-width': 3, 'line-opacity': 0.6, 'line-dasharray': [2, 1] },
  layout: { 'line-cap': 'round', 'line-join': 'round' },
};
const dronePath: LineLayer = {
  id: 'c-drone-path', type: 'line', source: 'c-drone-path',
  paint: { 'line-color': '#22d3ee', 'line-width': 2, 'line-opacity': 0.7, 'line-dasharray': [2, 2] },
  layout: { 'line-cap': 'round', 'line-join': 'round' },
};

// ── Component ──────────────────────────────────────────────────────────────

export function CompactEmergencyMap({ state, layers: layersProp, height = 280 }: CompactEmergencyMapProps) {
  const mapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const l = {
    aeds: layersProp?.aeds ?? true,
    coverage: layersProp?.coverage ?? true,
    emsRoute: layersProp?.emsRoute ?? true,
    dronePath: layersProp?.dronePath ?? true,
    hospital: layersProp?.hospital ?? true,
    buildings3d: false, // always off in compact
  };

  // Fly to emergency on location change
  useEffect(() => {
    if (!MAPBOX_TOKEN || !state.emergencyLocation || !mapRef.current || !mapLoaded) return;
    try {
      mapRef.current.getMap().flyTo({
        center: [state.emergencyLocation.lon, state.emergencyLocation.lat],
        zoom: 15.5,
        duration: 1500,
      });
    } catch { /* ignore */ }
  }, [state.emergencyLocation, mapLoaded]);

  const onLoad = useCallback(() => setMapLoaded(true), []);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full flex items-center justify-center bg-zinc-900 text-zinc-500 text-xs rounded-lg" style={{ height }}>
        Map unavailable (token missing)
      </div>
    );
  }

  // Build GeoJSON
  const aedData = state.nearbyAeds.length > 0 ? buildAedGeoJSON(state.nearbyAeds) : EMPTY_FC;
  const coverageData = state.coverageRings.length > 0 ? buildCoverageGeoJSON(state.coverageRings) : EMPTY_FC;
  const emsRouteData =
    state.emsUnits.length > 0 && state.emergencyLocation
      ? buildPathGeoJSON(buildEmsPath(state.emsUnits[0].lon, state.emsUnits[0].lat, state.emergencyLocation.lon, state.emergencyLocation.lat))
      : EMPTY_FC;
  const dronePathData = state.drone ? buildPathGeoJSON(state.drone.path) : EMPTY_FC;

  return (
    <div className="w-full rounded-lg overflow-hidden border border-zinc-800" style={{ height }}>
      <Map
        ref={mapRef}
        initialViewState={UCLA_CENTER}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        onLoad={onLoad}
        projection={{ name: 'mercator' }}
        scrollZoom={false}
        interactiveLayerIds={mapLoaded ? ['c-aed-avail'] : []}
        onError={(e: any) => {
          if (e.error?.message?.includes("reading '0'")) return;
          console.error('[CompactMap]', e.error);
        }}
        antialias
      >
        {mapLoaded && (
          <>
            <Source id="c-aeds" type="geojson" data={aedData}>
              {l.aeds && <Layer {...aedAvailable} />}
              {l.aeds && <Layer {...aedUnavailable} />}
            </Source>
            <Source id="c-cov" type="geojson" data={coverageData}>
              {l.coverage && <Layer {...covWalkFill} />}
              {l.coverage && <Layer {...covBikeFill} />}
            </Source>
            <Source id="c-ems-route" type="geojson" data={emsRouteData}>
              {l.emsRoute && <Layer {...emsRoute} />}
            </Source>
            <Source id="c-drone-path" type="geojson" data={dronePathData}>
              {l.dronePath && <Layer {...dronePath} />}
            </Source>
          </>
        )}

        {/* Emergency location */}
        {state.emergencyLocation && (
          <Marker latitude={state.emergencyLocation.lat} longitude={state.emergencyLocation.lon} anchor="center">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-8 h-8 bg-red-500 rounded-full animate-ping opacity-30" />
              <div className="relative w-3 h-3 bg-red-600 rounded-full border-2 border-white shadow-lg" />
            </div>
          </Marker>
        )}

        {/* EMS marker */}
        {state.emsUnits.map(ems => (
          <Marker key={ems.id} latitude={ems.lat} longitude={ems.lon} anchor="center">
            <div className="bg-red-600 text-white text-[9px] font-bold px-1 py-0.5 rounded shadow">
              {'\uD83D\uDE91'} {ems.eta_minutes}m
            </div>
          </Marker>
        ))}

        {/* Drone marker */}
        {l.dronePath && state.drone && (
          <Marker latitude={state.drone.lat} longitude={state.drone.lon} anchor="center">
            <div className="w-3 h-3 bg-cyan-400 rounded-full border border-white shadow" />
          </Marker>
        )}

        {/* Hospital */}
        {l.hospital && state.hospital && (
          <Marker latitude={state.hospital.lat} longitude={state.hospital.lon} anchor="bottom" offset={[0, -8]}>
            <div className="bg-green-900/90 text-green-300 text-[9px] font-semibold px-1.5 py-0.5 rounded shadow border border-green-700">
              {'\uD83C\uDFE5'} {state.hospital.name.split(' ').slice(0, 2).join(' ')}
            </div>
          </Marker>
        )}

        {/* AED delivered badge */}
        {state.drone?.status === 'delivered' && state.emergencyLocation && (
          <Marker latitude={state.emergencyLocation.lat} longitude={state.emergencyLocation.lon} anchor="bottom" offset={[16, -14]}>
            <div className="bg-cyan-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow animate-bounce">
              AED Delivered
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
}
