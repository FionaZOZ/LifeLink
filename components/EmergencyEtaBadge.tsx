// PHASE 1: Horizontal EMS / Drone / Hospital / Volunteers status strip.
// Static mock values — Phase 2 will replace with real bus subscriptions.

'use client';

import type { CSSProperties } from 'react';

export type EmergencyEtaBadgeProps = {
  emsEtaSeconds: number;
  droneEtaSeconds: number;
  hospital: { name: string; color?: string };
  volunteersNotified?: number;
};

function formatEta(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'On scene';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: '0px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '10px 14px',
  margin: '10px 0 4px',
  fontFamily: 'inherit',
};

const labelStyle: CSSProperties = {
  fontSize: '9px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  opacity: 0.6,
  lineHeight: 1,
};

const valueStyle: CSSProperties = {
  fontSize: '15px',
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1.2,
};

const separatorStyle: CSSProperties = {
  color: '#7c8fa8',
  fontSize: '14px',
  margin: '0 6px',
  userSelect: 'none',
  alignSelf: 'center',
};

const itemStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '3px',
  minWidth: 0,
};

type ItemProps = {
  icon: string;
  label: string;
  value: string;
  color: string;
  isOnScene?: boolean;
};

function EtaItem({ icon, label, value, color, isOnScene }: ItemProps) {
  return (
    <div style={itemStyle}>
      <div style={{ ...labelStyle, color: '#7c8fa8' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '14px', lineHeight: 1 }} aria-hidden="true">
          {icon}
        </span>
        <span
          style={{
            ...valueStyle,
            color: isOnScene ? '#6BCB77' : color,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

export function EmergencyEtaBadge({
  emsEtaSeconds,
  droneEtaSeconds,
  hospital,
  volunteersNotified,
}: EmergencyEtaBadgeProps) {
  const emsValue = formatEta(emsEtaSeconds);
  const droneValue = formatEta(droneEtaSeconds);

  return (
    <>
      <style>{`
        @media (max-width: 379px) {
          .cl-eta-badge-container {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .cl-eta-sep { display: none !important; }
        }
      `}</style>
      <div
        className="cl-eta-badge-container"
        style={containerStyle}
        role="status"
        aria-label={`EMS arriving in ${emsValue}, Drone arriving in ${droneValue}, Hospital ${hospital.name}${volunteersNotified ? `, ${volunteersNotified} volunteers notified` : ''}`}
      >
        <EtaItem
          icon={'\uD83D\uDE91'}
          label="EMS"
          value={emsValue}
          color="#4D96FF"
          isOnScene={emsEtaSeconds <= 0}
        />
        <span className="cl-eta-sep" style={separatorStyle} aria-hidden="true">
          &middot;
        </span>
        <EtaItem
          icon={'\uD83D\uDE81'}
          label="DRONE"
          value={droneValue}
          color="#FF8A5C"
          isOnScene={droneEtaSeconds <= 0}
        />
        <span className="cl-eta-sep" style={separatorStyle} aria-hidden="true">
          &middot;
        </span>
        <EtaItem
          icon={'\uD83C\uDFE5'}
          label="HOSPITAL"
          value={hospital.name}
          color={hospital.color ?? '#A78BFA'}
        />
        {volunteersNotified != null && (
          <>
            <span className="cl-eta-sep" style={separatorStyle} aria-hidden="true">
              &middot;
            </span>
            <EtaItem
              icon={'\uD83D\uDC65'}
              label="VOLUNTEERS"
              value={`${volunteersNotified} alerted`}
              color="#C780FA"
            />
          </>
        )}
      </div>
    </>
  );
}
