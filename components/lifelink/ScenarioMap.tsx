'use client';

import * as React from 'react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { SCENARIOS, ScenarioId } from '@/lib/scenarios';
import circle from '@turf/circle';

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

  // Track agent states from events
  const agentStates = React.useMemo(() => {
    const states: Record<string, { phase: string; timestamp: number }> = {};
    events.forEach((e, idx) => {
      states[e.agent] = { phase: e.phase, timestamp: idx };
    });
    return states;
  }, [events]);

  const completedAgents = React.useMemo(() => {
    const completed = new Set<string>();
    events.forEach(e => {
      if (e.phase === 'result') {
        completed.add(e.agent);
      }
    });
    return completed;
  }, [events]);

  // Animated positions for helpers and EMS
  const [animatedPositions, setAnimatedPositions] = React.useState<Record<string, { lat: number; lon: number }>>({});

  React.useEffect(() => {
    const animationFrames: number[] = [];
    const startedAnimations = new Set<string>();

    // Animate helpers moving toward patient when they have events
    scenario.helpers.forEach(helper => {
      const helperState = agentStates[helper.id];
      if (helperState && helperState.phase === 'working' && !startedAnimations.has(helper.id)) {
        startedAnimations.add(helper.id);

        const startLat = helper.lat;
        const startLon = helper.lon;
        const endLat = scenario.patient.lat;
        const endLon = scenario.patient.lon;
        const duration = 3000; // 3 seconds to reach patient
        const startTime = performance.now();

        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Ease-in-out function
          const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          const currentLat = startLat + (endLat - startLat) * eased;
          const currentLon = startLon + (endLon - startLon) * eased;

          setAnimatedPositions(prev => ({
            ...prev,
            [helper.id]: { lat: currentLat, lon: currentLon },
          }));

          if (progress < 1) {
            const frameId = requestAnimationFrame(animate);
            animationFrames.push(frameId);
          }
        };

        const frameId = requestAnimationFrame(animate);
        animationFrames.push(frameId);
      }
    });

    // Animate EMS
    const emsState = agentStates['ems'];
    if (emsState && emsState.phase === 'working' && !startedAnimations.has('ems')) {
      startedAnimations.add('ems');

      const startLat = scenario.ems.lat;
      const startLon = scenario.ems.lon;
      const endLat = scenario.patient.lat;
      const endLon = scenario.patient.lon;
      const duration = 4000; // 4 seconds for EMS
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const currentLat = startLat + (endLat - startLat) * eased;
        const currentLon = startLon + (endLon - startLon) * eased;

        setAnimatedPositions(prev => ({
          ...prev,
          ems: { lat: currentLat, lon: currentLon },
        }));

        if (progress < 1) {
          const frameId = requestAnimationFrame(animate);
          animationFrames.push(frameId);
        }
      };

      const frameId = requestAnimationFrame(animate);
      animationFrames.push(frameId);
    }

    return () => {
      animationFrames.forEach(id => cancelAnimationFrame(id));
    };
  }, [agentStates, scenario.helpers, scenario.ems, scenario.patient]);

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
          const pos = animatedPositions[helper.id] || { lat: helper.lat, lon: helper.lon };
          const isMoving = agentStates[helper.id]?.phase === 'working';
          const hasArrived = completedAgents.has(helper.id);

          return (
            <Marker
              key={helper.id}
              latitude={pos.lat}
              longitude={pos.lon}
              anchor="center"
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: hasArrived ? '#10b981' : helper.color,
                border: '3px solid white',
                boxShadow: isMoving ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 700,
                transform: isMoving ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.3s ease',
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
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                background: isActivated ? '#10b981' : '#ef4444',
                border: '2px solid white',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                position: 'relative',
              }}>
                ⚡
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
          const emsPos = animatedPositions['ems'] || { lat: scenario.ems.lat, lon: scenario.ems.lon };
          const isMoving = agentStates['ems']?.phase === 'working';
          const hasArrived = completedAgents.has('ems');

          return (
            <Marker
              latitude={emsPos.lat}
              longitude={emsPos.lon}
              anchor="center"
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                background: hasArrived ? '#10b981' : '#2563eb',
                border: '2px solid white',
                boxShadow: isMoving ? '0 4px 16px rgba(37, 99, 235, 0.6)' : '0 2px 6px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px',
                position: 'relative',
                transform: isMoving ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.3s ease',
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
                {isMoving && (
                  <div style={{
                    position: 'absolute',
                    top: '-4px',
                    left: '-4px',
                    right: '-4px',
                    bottom: '-4px',
                    border: '2px solid #2563eb',
                    borderRadius: '4px',
                    animation: 'pulse 1.5s infinite',
                  }} />
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
