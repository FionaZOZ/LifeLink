'use client';

import * as React from 'react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { SCENARIOS, ScenarioId } from '@/lib/scenarios';
import circle from '@turf/circle';
import { Icon } from '@/components/lifelink/Icon';

// Agent event from MongoDB telemetry stream
export interface AgentEvent {
  ts: string;
  emergency_id: string;
  agent: string;
  capability: string;
  phase: string;
  summary: string;
  data?: Record<string, unknown>;
}

interface ScenarioMapProps {
  scenarioId: ScenarioId;
  events: AgentEvent[];
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Convert miles to meters for turf/circle
const milesToMeters = (miles: number) => miles * 1609.34;

export function ScenarioMap({ scenarioId, events }: ScenarioMapProps) {
  const scenario = SCENARIOS[scenarioId];

  const completedAgents = React.useMemo(() => {
    const completed = new Set<string>();
    events.forEach(e => {
      if (e.phase === 'result') {
        completed.add(e.agent);
      }
    });
    return completed;
  }, [events]);

  // Generate coverage rings around patient location
  const coverageRings = React.useMemo(() => {
    const center = [scenario.patient.lon, scenario.patient.lat];
    return [
      { radius: 0.5, color: '#E11D2E', opacity: 0.1 },
      { radius: 1.0, color: '#E11D2E', opacity: 0.08 },
      { radius: 2.0, color: '#E11D2E', opacity: 0.05 },
    ].map(({ radius, color, opacity }) => {
      const circleGeo = circle(center, milesToMeters(radius), {
        steps: 64,
        units: 'meters',
      });
      return {
        id: `ring-${radius}`,
        data: circleGeo,
        color,
        opacity,
      };
    });
  }, [scenario.patient]);

  // Generate helper paths to patient
  const helperPaths = React.useMemo(() => {
    return scenario.helpers.map(helper => ({
      id: helper.id,
      geojson: {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [helper.lon, helper.lat],
            [scenario.patient.lon, scenario.patient.lat],
          ],
        },
        properties: {},
      },
      color: helper.color,
    }));
  }, [scenario.helpers, scenario.patient]);

  if (!MAPBOX_TOKEN) {
    return (
      <div style={{
        padding: '20px',
        background: '#FBE9EC',
        color: '#A50F1E',
        borderRadius: '8px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 600,
      }}>
        ⚠️ NEXT_PUBLIC_MAPBOX_TOKEN not configured — Set it in .env.local to enable real map
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Map
        initialViewState={{
          latitude: scenario.patient.lat,
          longitude: scenario.patient.lon,
          zoom: 15.5,
          pitch: 0,
        }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        <NavigationControl position="top-right" />

        {/* Coverage rings */}
        {coverageRings.map(ring => (
          <Source key={ring.id} id={ring.id} type="geojson" data={ring.data}>
            <Layer
              id={`${ring.id}-fill`}
              type="fill"
              paint={{
                'fill-color': ring.color,
                'fill-opacity': ring.opacity,
              }}
            />
            <Layer
              id={`${ring.id}-line`}
              type="line"
              paint={{
                'line-color': ring.color,
                'line-width': 1,
                'line-opacity': 0.3,
                'line-dasharray': [2, 2],
              }}
            />
          </Source>
        ))}

        {/* Helper paths */}
        {helperPaths.map(path => (
          <Source key={`path-${path.id}`} id={`path-${path.id}`} type="geojson" data={path.geojson}>
            <Layer
              id={`path-line-${path.id}`}
              type="line"
              paint={{
                'line-color': path.color,
                'line-width': 2,
                'line-opacity': 0.6,
                'line-dasharray': [3, 3],
              }}
            />
          </Source>
        ))}

        {/* Patient marker */}
        <Marker
          latitude={scenario.patient.lat}
          longitude={scenario.patient.lon}
          anchor="center"
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#E11D2E',
            border: '4px solid white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '10px',
            fontWeight: 800,
            animation: 'pulse 2s infinite',
          }}>
            YOU
          </div>
        </Marker>

        {/* Helper markers */}
        {scenario.helpers.map(helper => {
          const hasArrived = completedAgents.has(helper.id);

          return (
            <Marker
              key={helper.id}
              latitude={helper.lat}
              longitude={helper.lon}
              anchor="center"
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: hasArrived ? '#10b981' : helper.color,
                border: '3px solid white',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 700,
              }}>
                {helper.name[0]}
                {hasArrived && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: '#10b981',
                    color: 'white',
                    fontSize: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid white',
                  }}>
                    ✓
                  </div>
                )}
              </div>
            </Marker>
          );
        })}

        {/* AED markers */}
        {scenario.aeds.map(aed => {
          const isActivated = completedAgents.has('aed');
          return (
            <Marker
              key={aed.id}
              latitude={aed.lat}
              longitude={aed.lon}
              anchor="center"
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '2px solid white',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                position: 'relative',
                overflow: 'visible',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fff',
              }}>
                <Icon name="aed" size={24}/>
                {isActivated && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#10b981',
                    color: 'white',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}>
                    ✓
                  </div>
                )}
              </div>
            </Marker>
          );
        })}

        {/* EMS marker */}
        {(() => {
          const hasArrived = completedAgents.has('ems');

          return (
            <Marker
              latitude={scenario.ems.lat}
              longitude={scenario.ems.lon}
              anchor="center"
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                background: hasArrived ? '#10b981' : '#2563eb',
                border: '2px solid white',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px',
                position: 'relative',
              }}>
                🚑
                {hasArrived && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#10b981',
                    color: 'white',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    ✓
                  </div>
                )}
              </div>
            </Marker>
          );
        })()}
      </Map>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
