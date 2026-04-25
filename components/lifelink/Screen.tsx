'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, FONT } from './tokens';
import { Icon } from './Icon';

export function Stage({ children }: { children: React.ReactNode }) {
  return <div className="ll-stage">{children}</div>;
}

type ScreenProps = {
  children: React.ReactNode;
  bg?: string;
  padTop?: number;
};
export function Screen({ children, bg = X.BG, padTop = 60 }: ScreenProps) {
  return (
    <div style={{
      width: '100%', height: '100%', background: bg, color: X.INK,
      fontFamily: FONT.body, paddingTop: padTop, position: 'relative', overflow: 'hidden',
    }}>{children}</div>
  );
}

type LeadingKind = 'back' | 'menu' | 'none';
type TopBarProps = {
  title: string;
  leading?: LeadingKind;
  trailing?: React.ReactNode;
  dark?: boolean;
  backHref?: string;
};
export function TopBar({ title, leading = 'back', trailing = null, dark = false, backHref }: TopBarProps) {
  const router = useRouter();
  const fg = dark ? '#fff' : X.INK;
  const handleBack = () => {
    if (backHref) router.push(backHref);
    else router.back();
  };
  return (
    <div style={{
      position: 'absolute', top: 16, left: 0, right: 0, padding: '4px 16px',
      display: 'flex', alignItems: 'center', gap: 12, zIndex: 6, color: fg,
    }}>
      {leading === 'back' ? (
        <button onClick={handleBack} aria-label="Back" style={{
          all: 'unset', cursor: 'pointer',
          width: 32, height: 32, borderRadius: 16,
          background: dark ? 'rgba(255,255,255,0.08)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="chevron-right" size={20} color={fg} stroke={2.4} style={{ transform: 'rotate(180deg)' }}/>
        </button>
      ) : leading === 'menu' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 6 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 18, height: 2, background: fg, opacity: 0.85 }}/>)}
        </div>
      ) : null}
      <div style={{ flex: 1, fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>{title}</div>
      {trailing}
    </div>
  );
}

export function EmergencyBanner({ time = '00:00:23', endHref = '/sos/complete' }: { time?: string; endHref?: string | null }) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      background: X.RED, color: '#fff',
      padding: '14px 14px 8px', display: 'flex', alignItems: 'center',
      gap: 10, zIndex: 10,
    }}>
      <span style={{ width: 32 }}/>{/* spacer to balance the right-side button */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <span className="ll-blink" style={{ width: 6, height: 6, borderRadius: 3, background: '#fff' }}/>
        <span style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.6, fontWeight: 700 }}>
          EMERGENCY ACTIVE · {time}
        </span>
      </div>
      {endHref ? (
        <Link href={endHref} aria-label="Help arrived — end emergency" style={{
          textDecoration: 'none',
          padding: '4px 10px', borderRadius: 999,
          background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.35)',
          color: '#fff', fontSize: 10, fontWeight: 800, fontFamily: FONT.mono, letterSpacing: 1,
          display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
        }}>
          EMS HERE ✓
        </Link>
      ) : <span style={{ width: 32 }}/>}
    </div>
  );
}

type TabId = 'home' | 'me';
export function TabBar({ active = 'home' }: { active?: TabId }) {
  const tabs: { id: TabId; label: string; icon: 'home' | 'user'; href: string }[] = [
    { id: 'home', label: 'Home', icon: 'home', href: '/' },
    { id: 'me', label: 'Profile', icon: 'user', href: '/profile' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: '#fff', borderTop: `1px solid ${X.LINE}`,
      padding: '10px 8px 28px', display: 'flex', justifyContent: 'space-around', zIndex: 5,
    }}>
      {tabs.map(t => (
        <Link key={t.id} href={t.href} style={{
          textDecoration: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          color: active === t.id ? X.RED : X.INK2, fontSize: 11, fontWeight: 600,
          padding: '4px 24px',
        }}>
          <Icon name={t.icon} size={22} stroke={2}/>
          <span style={{ letterSpacing: 0.2 }}>{t.label}</span>
        </Link>
      ))}
    </div>
  );
}
