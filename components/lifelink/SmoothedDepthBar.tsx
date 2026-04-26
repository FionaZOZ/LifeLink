'use client';

import * as React from 'react';
import { voltageToDepth, pct, IDEAL_LO, IDEAL_HI } from '@/lib/cpr/cprAssistPhase';
import { X, FONT } from '@/components/lifelink/tokens';

/**
 * Patch depth readout smoothed in rAF so rapid serial updates do not fight CSS transitions.
 */
export function SmoothedDepthBar({ voltage }: { voltage: number | null }) {
  const vRef = React.useRef(voltage);
  vRef.current = voltage;
  const [smoothedCm, setSmoothedCm] = React.useState(() =>
    voltage != null ? voltageToDepth(voltage) : 0,
  );

  React.useEffect(() => {
    let id = 0;
    const SMOOTH = 0.38;
    const tick = () => {
      const v = vRef.current;
      const target = v != null ? voltageToDepth(v) : 0;
      setSmoothedCm((prev) => {
        const next = prev + (target - prev) * SMOOTH;
        return Math.abs(target - next) < 0.02 ? target : next;
      });
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  const inBand = smoothedCm >= IDEAL_LO && smoothedCm <= IDEAL_HI;
  const depthColor = inBand ? X.GREEN : smoothedCm < IDEAL_LO ? X.AMBER : X.RED;
  const leftPct = pct(smoothedCm);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 10, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>
          COMPRESSION DEPTH
        </div>
        <div style={{ fontSize: 10, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)', letterSpacing: 1 }}>
          TARGET 5.0–6.0 cm
        </div>
      </div>
      <div
        style={{
          marginTop: 6,
          position: 'relative',
          height: 48,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${pct(IDEAL_LO)}%`,
            width: `${pct(IDEAL_HI) - pct(IDEAL_LO)}%`,
            background: `linear-gradient(180deg, ${X.GREEN}55, ${X.GREEN}22)`,
            borderLeft: `2px solid ${X.GREEN}`,
            borderRight: `2px solid ${X.GREEN}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 6,
            top: 4,
            fontSize: 9,
            fontFamily: FONT.mono,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: 1,
          }}
        >
          SOFT
        </div>
        <div
          style={{
            position: 'absolute',
            left: `${(pct(IDEAL_LO) + pct(IDEAL_HI)) / 2}%`,
            top: 4,
            transform: 'translateX(-50%)',
            fontSize: 9,
            fontFamily: FONT.mono,
            color: X.GREEN,
            letterSpacing: 1,
            fontWeight: 700,
          }}
        >
          IDEAL
        </div>
        <div
          style={{
            position: 'absolute',
            right: 6,
            top: 4,
            fontSize: 9,
            fontFamily: FONT.mono,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: 1,
          }}
        >
          HARD
        </div>
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${leftPct}%`,
            width: 3,
            marginLeft: -1.5,
            background: '#fff',
            boxShadow: '0 0 12px rgba(255,255,255,0.6)',
            willChange: 'left',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            left: `${leftPct}%`,
            transform: 'translateX(-50%)',
            padding: '2px 8px',
            background: depthColor,
            color: '#fff',
            fontSize: 11,
            fontWeight: 800,
            borderRadius: 999,
            fontFamily: FONT.mono,
            willChange: 'left',
          }}
        >
          {smoothedCm.toFixed(1)} cm
        </div>
      </div>
      <div
        style={{
          marginTop: 4,
          position: 'relative',
          height: 12,
          fontFamily: FONT.mono,
          fontSize: 9,
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        {[0, 2, 4, 5, 6, 7].map((v) => (
          <span key={v} style={{ position: 'absolute', left: `${pct(v)}%`, transform: 'translateX(-50%)' }}>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}
