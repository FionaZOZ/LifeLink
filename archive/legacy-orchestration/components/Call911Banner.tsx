// PHASE 1: Persistent red emergency-dial bar.
// Mounts below EmergencyHeader on every step except consent.

'use client';

import type { CSSProperties, MouseEvent } from 'react';

const BANNER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.65rem',
  width: '100%',
  height: '64px',
  background: '#C8102E',
  color: '#fff',
  textDecoration: 'none',
  fontFamily: 'inherit',
  fontWeight: 700,
  fontSize: '1.05rem',
  cursor: 'pointer',
  flexShrink: 0,
  position: 'relative',
  WebkitTapHighlightColor: 'transparent',
  transition: 'transform 120ms ease, filter 120ms ease',
  borderBottom: '1px solid rgba(0,0,0,0.15)',
};

export function Call911Banner() {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (process.env.NODE_ENV === 'development') {
      e.preventDefault();
      // eslint-disable-next-line no-console
      console.log('[CardiacLink DEV] tel:911 intercepted — not calling in dev mode.');
      return;
    }
    const proceed = window.confirm('This will call 911. Continue?');
    if (!proceed) {
      e.preventDefault();
    }
  };

  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .cl-call911-banner { height: 56px !important; }
        }
        .cl-call911-banner:active {
          transform: scale(0.98) !important;
          filter: brightness(0.92) !important;
        }
        @keyframes cl-phone-wobble {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(1deg); }
          75% { transform: rotate(-1deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cl-phone-icon { animation: none !important; }
        }
      `}</style>
      <a
        href="tel:911"
        role="link"
        aria-label="Call 911 emergency services"
        className="cl-call911-banner"
        onClick={handleClick}
        style={BANNER_STYLE}
      >
        <span
          className="cl-phone-icon"
          aria-hidden="true"
          style={{
            fontSize: '1.3rem',
            animation: 'cl-phone-wobble 1.6s ease-in-out infinite',
            lineHeight: 1,
          }}
        >
          &#x1F4DE;
        </span>
        <span>Call 911 Now</span>
        <span
          style={{
            position: 'absolute',
            right: '1rem',
            fontSize: '0.65rem',
            fontWeight: 600,
            opacity: 0.85,
            letterSpacing: '0.02em',
          }}
        >
          Emergency Services
        </span>
      </a>
    </>
  );
}
