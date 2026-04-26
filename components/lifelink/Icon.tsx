import * as React from 'react';

type IconName =
  | 'heart' | 'pulse' | 'phone' | 'navigation' | 'map-pin' | 'check' | 'x'
  | 'arrow-right' | 'arrow-up' | 'chevron-right' | 'chevron-down'
  | 'home' | 'message' | 'user' | 'bell' | 'shield' | 'zap' | 'mic'
  | 'volume' | 'clock' | 'compass' | 'plus' | 'minus' | 'cross'
  | 'aed' | 'walk' | 'shuffle' | 'siren' | 'plug' | 'qr' | 'activity'
  | 'pip' | 'globe';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
  fill?: string;
  style?: React.CSSProperties;
};

export function Icon({ name, size = 24, color = 'currentColor', stroke = 1.8, fill = 'none', style }: Props) {
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill,
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
  };
  switch (name) {
    case 'heart':
      return <svg {...svgProps}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
    case 'pulse':
      return <svg {...svgProps}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
    case 'phone':
      return <svg {...svgProps}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
    case 'navigation':
      return <svg {...svgProps}><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>;
    case 'map-pin':
      return <svg {...svgProps}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
    case 'check':
      return <svg {...svgProps}><polyline points="20 6 9 17 4 12"/></svg>;
    case 'x':
      return <svg {...svgProps}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
    case 'arrow-right':
      return <svg {...svgProps}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
    case 'arrow-up':
      return <svg {...svgProps}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
    case 'chevron-right':
      return <svg {...svgProps}><polyline points="9 18 15 12 9 6"/></svg>;
    case 'chevron-down':
      return <svg {...svgProps}><polyline points="6 9 12 15 18 9"/></svg>;
    case 'home':
      return <svg {...svgProps}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
    case 'message':
      return <svg {...svgProps}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case 'user':
      return <svg {...svgProps}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case 'bell':
      return <svg {...svgProps}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
    case 'shield':
      return <svg {...svgProps}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case 'zap':
      return <svg {...svgProps}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
    case 'mic':
      return <svg {...svgProps}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
    case 'volume':
      return <svg {...svgProps}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>;
    case 'clock':
      return <svg {...svgProps}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case 'compass':
      return <svg {...svgProps}><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>;
    case 'plus':
      return <svg {...svgProps}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case 'minus':
      return <svg {...svgProps}><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case 'cross':
      return <svg {...svgProps}><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z"/></svg>;
    case 'aed':
      // Filled red AED tile with a white heart + red bolt cut-through.
      // Stroke/fill props of the wrapper are ignored — this glyph is intentionally
      // self-contained so it reads as the universal AED symbol at any size.
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
          <rect x="2" y="2" width="20" height="20" rx="4" fill="#E11D2E"/>
          <path d="M12 18 C 9 16, 5 13.5, 5 10.5 C 5 7.5, 7.5 6.5, 9 7.5 C 10.5 8.5, 11.4 9.5, 12 10.5 C 12.6 9.5, 13.5 8.5, 15 7.5 C 16.5 6.5, 19 7.5, 19 10.5 C 19 13.5, 15 16, 12 18 Z" fill="#fff"/>
          <path d="M12.4 8.4 L 9.8 12.2 L 11.4 12.2 L 10.8 15.2 L 14.2 11.4 L 12.4 11.4 Z" fill="#E11D2E"/>
        </svg>
      );
    case 'walk':
      return <svg {...svgProps}><circle cx="13" cy="4" r="2"/><path d="M9 20l2-6-3-2 1-5 4 2 3 3 3 1"/><path d="M11 14l-2 6"/></svg>;
    case 'shuffle':
      return <svg {...svgProps}><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>;
    case 'siren':
      return <svg {...svgProps}><path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M5 21h14"/><path d="M12 3v2"/><path d="M18.36 5.64l-1.41 1.42"/><path d="M5.64 5.64l1.41 1.42"/></svg>;
    case 'plug':
      return <svg {...svgProps}><path d="M12 22v-5"/><path d="M9 7V2"/><path d="M15 7V2"/><path d="M6 13V8h12v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4z"/></svg>;
    case 'qr':
      return <svg {...svgProps}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z M20 14h1 M14 20h1 M17 17h4v4"/></svg>;
    case 'activity':
      return <svg {...svgProps}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
    case 'pip':
      return <svg {...svgProps}><rect x="3" y="3" width="13" height="13" rx="2"/><rect x="10" y="10" width="11" height="11" rx="2"/></svg>;
    case 'globe':
      return <svg {...svgProps}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/></svg>;
    default:
      return <svg {...svgProps}><circle cx="12" cy="12" r="10"/></svg>;
  }
}

export function ECGLine({ width = 360, height = 60, color = 'currentColor', stroke = 2 }: { width?: number; height?: number; color?: string; stroke?: number }) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <path
        d={`M0 ${height/2} L${width*0.2} ${height/2} L${width*0.25} ${height*0.45} L${width*0.28} ${height*0.55} L${width*0.32} ${height*0.15} L${width*0.36} ${height*0.85} L${width*0.4} ${height/2} L${width*0.55} ${height/2} L${width*0.6} ${height*0.4} L${width*0.65} ${height/2} L${width*0.7} ${height*0.45} L${width*0.74} ${height*0.5} L${width*0.78} ${height*0.18} L${width*0.82} ${height*0.82} L${width*0.86} ${height/2} L${width} ${height/2}`}
        stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}
