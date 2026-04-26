import * as React from 'react';
import { X, FONT } from './tokens';
import { Icon } from './Icon';

export function ListRow({ icon, iconBg, iconColor, title, sub, last }: {
  icon: any; iconBg: string; iconColor: string; title: string; sub?: string; last?: boolean;
}) {
  return (
    <div style={{ padding: '10px 0', borderBottom: last ? 'none' : `1px solid ${X.LINE2}`, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={iconColor} stroke={2}/>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: X.INK2 }}>{sub}</div>}
      </div>
      <Icon name="chevron-right" size={16} color={X.INK3} stroke={2}/>
    </div>
  );
}

export function ResponderRow({ name, role, tagText, tagColor, muted }: {
  name: string; role: string; tagText: string; tagColor: string; muted?: boolean;
}) {
  // Build the avatar initials from the part of the name BEFORE the first
  // mid-dot separator — otherwise "Marcus · CPR" becomes "M·" because the
  // "·" gets treated as its own word.
  const labelPart = name.split(/\s*·\s*/)[0];
  const initials = labelPart
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${X.LINE2}` }}>
      <div style={{ width: 34, height: 34, borderRadius: 17, background: muted ? X.LINE : X.GREEN, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
        {initials}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{name}</div>
        <div style={{ fontSize: 11, color: X.INK2 }}>{role}</div>
      </div>
      <div style={{ padding: '4px 10px', borderRadius: 10, background: tagColor + '18', color: tagColor, fontSize: 11, fontWeight: 700, fontFamily: FONT.mono }}>{tagText}</div>
    </div>
  );
}

export function DiagramCard({ label, sub, type }: { label: string; sub: string; type: 'placement' | 'stack' }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ background: X.BG, height: 130, position: 'relative' }}>
        {type === 'placement' ? (
          <svg viewBox="0 0 160 130" width="100%" height="100%">
            <path d="M 40 10 Q 40 0 60 0 L 100 0 Q 120 0 120 10 L 125 80 Q 125 120 100 130 L 60 130 Q 35 120 35 80 Z" fill="#EFEDE6" stroke={X.LINE} strokeWidth="1"/>
            <circle cx="80" cy="68" r="32" fill={X.GREEN_BG} stroke={X.GREEN} strokeWidth="1.5" strokeDasharray="3 3"/>
            <circle cx="80" cy="68" r="22" fill={X.GREEN} fillOpacity="0.18"/>
            <circle cx="80" cy="68" r="4" fill={X.GREEN}/>
            <line x1="80" y1="34" x2="80" y2="44" stroke={X.GREEN} strokeWidth="1.5"/>
            <line x1="80" y1="92" x2="80" y2="102" stroke={X.GREEN} strokeWidth="1.5"/>
          </svg>
        ) : (
          <svg viewBox="0 0 160 130" width="100%" height="100%">
            <ellipse cx="80" cy="80" rx="44" ry="22" fill="#fff" stroke={X.INK} strokeWidth="1.5"/>
            <path d="M 50 78 q 2 -8 8 -10 M 70 70 q 2 -8 8 -10 M 90 70 q 2 -8 8 -10 M 105 78 q 4 -6 8 -8" stroke={X.INK} strokeWidth="1.2" fill="none"/>
            <ellipse cx="80" cy="60" rx="40" ry="18" fill={X.RED_BG} stroke={X.RED} strokeWidth="1.5"/>
            <path d="M 55 55 q 2 -7 7 -9 M 72 50 q 2 -7 7 -9 M 90 50 q 2 -7 7 -9 M 102 55 q 3 -5 6 -7" stroke={X.RED} strokeWidth="1.2" fill="none"/>
            <line x1="138" y1="40" x2="138" y2="100" stroke={X.INK} strokeWidth="1.5"/>
            <polyline points="134,92 138,100 142,92" fill="none" stroke={X.INK} strokeWidth="1.5"/>
          </svg>
        )}
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 9, fontFamily: FONT.mono, letterSpacing: 1.2, color: X.RED, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}
