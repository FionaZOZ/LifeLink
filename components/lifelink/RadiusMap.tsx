import * as React from 'react';
import { X } from './tokens';

type Mode = 'live' | 'overview' | 'helper' | 'locate';

function ResponderPin({ x, y, initial, label, eta, muted, badge, color }: {
  x: number; y: number; initial: string; label?: string; eta?: string;
  muted?: boolean; badge?: string; color?: string;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r="18" fill="#fff" stroke={muted ? X.LINE : (color || X.GREEN)} strokeWidth={muted ? 1 : 2}/>
      <circle cx={x} cy={y} r="14" fill={muted ? '#EFEDE6' : (color || X.GREEN)} fillOpacity={muted ? 1 : 0.18}/>
      <text x={x} y={y+4} fontFamily="Inter, sans-serif" fontSize="12" fontWeight="700" fill={muted ? X.INK2 : (color || X.GREEN)} textAnchor="middle">{initial}</text>
      {!muted && eta && (
        <g>
          <rect x={x-22} y={y+22} width="44" height="16" rx="8" fill="#fff" stroke={X.LINE}/>
          <text x={x} y={y+33} fontFamily="JetBrains Mono, monospace" fontSize="9" fontWeight="700" fill={X.INK} textAnchor="middle">{eta}</text>
        </g>
      )}
      {badge && (
        <g>
          <rect x={x-2} y={y-26} width="28" height="14" rx="7" fill={X.AMBER}/>
          <text x={x+12} y={y-16} fontFamily="Inter, sans-serif" fontSize="9" fontWeight="800" fill="#fff" textAnchor="middle">{badge}</text>
        </g>
      )}
    </g>
  );
}

export function RadiusMap({ mode = 'live', h = 514 }: { mode?: Mode; h?: number }) {
  const w = 390;
  const cx = 195, cy = h * 0.46;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" style={{ background: '#E8EAE6', display: 'block' }}>
      <rect x="0" y="0" width={w} height={h} fill="#E8EAE6"/>
      <g fill="#DCDFD8">
        <rect x="10" y="20" width="80" height="120" rx="2"/>
        <rect x="100" y="20" width="100" height="80" rx="2"/>
        <rect x="210" y="20" width="100" height="120" rx="2"/>
        <rect x="320" y="20" width="60" height="80" rx="2"/>
        <rect x="0" y="160" width="80" height="100" rx="2"/>
        <rect x="100" y="120" width="100" height="80" rx="2"/>
        <rect x="320" y="120" width="60" height="100" rx="2"/>
        <rect x="0" y="280" width="60" height="120" rx="2"/>
        <rect x="80" y="220" width="80" height="80" rx="2"/>
        <rect x="240" y="240" width="100" height="80" rx="2"/>
        <rect x="0" y="420" width="120" height="100" rx="2"/>
        <rect x="140" y="320" width="80" height="100" rx="2"/>
        <rect x="240" y="340" width="120" height="180" rx="2"/>
      </g>
      <g stroke="#fff" strokeWidth="14" fill="none">
        <line x1="0" y1={cy - 70} x2={w} y2={cy - 70}/>
        <line x1="0" y1={cy + 50} x2={w} y2={cy + 50}/>
        <line x1="80" y1="0" x2="80" y2={h}/>
        <line x1="220" y1="0" x2="220" y2={h}/>
      </g>
      <g stroke="#cfd2cd" strokeWidth="1" strokeDasharray="4 6">
        <line x1="0" y1={cy - 70} x2={w} y2={cy - 70}/>
        <line x1="0" y1={cy + 50} x2={w} y2={cy + 50}/>
        <line x1="80" y1="0" x2="80" y2={h}/>
        <line x1="220" y1="0" x2="220" y2={h}/>
      </g>

      {(mode === 'live' || mode === 'overview' || mode === 'helper') && (
        <g>
          <circle cx={cx} cy={cy} r="200" fill="#E11D2E" fillOpacity="0.05" stroke="#E11D2E" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="4 6"/>
          <circle cx={cx} cy={cy} r="130" fill="#E11D2E" fillOpacity="0.06" stroke="#E11D2E" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="4 6"/>
          <circle cx={cx} cy={cy} r="65" fill="#E11D2E" fillOpacity="0.08" stroke="#E11D2E" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="4 6"/>
          <text x={cx + 4} y={cy - 195} fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#E11D2E" fontWeight="700">2 MI</text>
          <text x={cx + 4} y={cy - 125} fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#E11D2E" fontWeight="700">1 MI</text>
        </g>
      )}

      {(mode === 'live' || mode === 'helper') && (
        <g fill="none" strokeLinecap="round" strokeDasharray="2 5">
          <path d="M 60 380 Q 130 320 195 220" stroke="#1F8A4D" strokeWidth="2.5"/>
          <path d="M 320 80 Q 260 130 195 220" stroke="#9095A0" strokeWidth="2"/>
          <path d="M 340 350 Q 270 280 195 220" stroke="#E8852C" strokeWidth="2.5"/>
        </g>
      )}

      {mode !== 'locate' && [[340, 350], [110, 90], [60, 480], [360, 200]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x-13} y={y-13} width="26" height="26" rx="6" fill="#fff" stroke="#E8852C" strokeWidth="1.5"/>
          <path d={`M ${x-7} ${y} L ${x-3} ${y} L ${x-1} ${y-4} L ${x+2} ${y+4} L ${x+4} ${y} L ${x+7} ${y}`} stroke="#E8852C" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
      ))}

      {(mode === 'live' || mode === 'helper' || mode === 'overview') && (
        <g>
          <ResponderPin x={60} y={380} initial="A" label="Alex" eta="1:50" color={X.GREEN}/>
          <ResponderPin x={340} y={350} initial="S" label="Sarah" eta="3:10" color={X.AMBER} badge="AED"/>
          <ResponderPin x={320} y={80} initial="J" label="Jordan" eta="4:00" muted/>
        </g>
      )}

      {(mode === 'locate' || mode === 'live') && (
        <g>
          <rect x="80" y="100" width="120" height="40" rx="10" fill="#fff" stroke={X.LINE} strokeWidth="1"/>
          <circle cx="98" cy="120" r="6" fill={X.BLUE}/>
          <circle cx="98" cy="120" r="11" fill={X.BLUE} fillOpacity="0.2"/>
          <text x="115" y="116" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="700" fill={X.INK}>You are here</text>
          <text x="115" y="130" fontFamily="Inter, sans-serif" fontSize="9" fill={X.INK2}>123 Main St</text>
        </g>
      )}

      <g>
        <circle cx={cx} cy={cy} r="22" fill="#E11D2E" fillOpacity="0.18">
          <animate attributeName="r" values="22;36;22" dur="1.6s" repeatCount="indefinite"/>
          <animate attributeName="fill-opacity" values="0.35;0;0.35" dur="1.6s" repeatCount="indefinite"/>
        </circle>
        <circle cx={cx} cy={cy} r="13" fill="#E11D2E" stroke="#fff" strokeWidth="2.5"/>
        <path d={`M ${cx-5} ${cy} l 3 3 l 7 -7`} stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  );
}
