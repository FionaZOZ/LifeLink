// AED data registry — merges OpenStreetMap + UCLA EH&S sources.
// De-duplicates by proximity (30m threshold).

import osmData from './aeds-osm.json';
import uclaData from './aeds-ucla-ehs.json';
import type { AedDevice } from '../useEmergencyTelemetry';

export type AedSource = 'osm' | 'ucla-ehs';

export interface ProvenancedAed extends AedDevice {
  source: AedSource;
  attribution: string;
  notes?: string;
  osmTags?: Record<string, string>;
}

function osmToAed(o: { id: number; lat: number; lon: number; tags: Record<string, string> }): ProvenancedAed {
  const name = o.tags['name']
    || o.tags['operator']
    || o.tags['defibrillator:location']
    || o.tags['description']
    || `AED #${o.id}`;
  return {
    id: `osm-${o.id}`,
    name,
    lat: o.lat,
    lon: o.lon,
    padsAvailable: true, // OSM rarely encodes pad status; default true
    source: 'osm',
    attribution: '\u00a9 OpenStreetMap contributors (ODbL)',
    osmTags: o.tags,
  };
}

function uclaToAed(u: { id: string; name: string; lat: number; lon: number; padsAvailable?: boolean; notes?: string }): ProvenancedAed {
  return {
    id: u.id,
    name: u.name,
    lat: u.lat,
    lon: u.lon,
    padsAvailable: u.padsAvailable ?? true,
    source: 'ucla-ehs',
    attribution: 'UCLA Environmental Health & Safety',
    notes: u.notes,
  };
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getMergedAeds(): ProvenancedAed[] {
  const osm = (osmData.aeds || []).map(osmToAed);
  const ucla = (uclaData.aeds || []).map(uclaToAed);

  // De-dup: if an OSM AED is within 30m of a UCLA-EHS one, prefer the UCLA-EHS one
  const merged = [...ucla];
  for (const o of osm) {
    const collision = ucla.find(u => haversineM(o.lat, o.lon, u.lat, u.lon) < 30);
    if (!collision) merged.push(o);
  }
  return merged;
}
