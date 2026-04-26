'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Screen, TabBar } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';
import { useDemoRole, isVolunteer, isPatient } from '@/components/lifelink/demoRole';
import { useHoldToFire } from '@/components/lifelink/useHoldToFire';
import { clearSosTimer } from '@/components/lifelink/sosTimer';
import { AppleWatchCard } from '@/components/lifelink/AppleWatchCard';
import { useT, useLang, type Lang } from '@/components/lifelink/i18n';

const HOLD_MS = 1500;
// Inner button is 240px, outer ring sits at 280px → scale factor to fill is 280/240 ≈ 1.167
const HOLD_SCALE = 280 / 240;

export default function HomePage() {
  const [role] = useDemoRole();
  // Reaching home is implicit confirmation that any in-progress emergency is over.
  React.useEffect(() => { clearSosTimer(); }, []);
  if (isPatient(role) && !isVolunteer(role)) return <HomePatient/>;
  if (isVolunteer(role)) return <HomeVolunteer patientToo={isPatient(role)}/>;
  return <HomeGuest/>;
}

function HomeGuestLangToggle() {
  const [lang, setLang] = useLang();
  const pill = (id: Lang, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setLang(id)}
      aria-pressed={lang === id}
      aria-label={id === 'en' ? 'English' : '简体中文'}
      style={{
        margin: 0,
        padding: '5px 10px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: FONT.mono,
        letterSpacing: 0.5,
        cursor: 'pointer',
        border: `1px solid ${lang === id ? X.RED : X.LINE}`,
        background: lang === id ? X.RED : '#fff',
        color: lang === id ? '#fff' : X.INK2,
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }} role="group" aria-label="Language">
      {pill('en', 'EN')}
      {pill('zh', '中文')}
    </div>
  );
}

function HomeGuest() {
  const router = useRouter();
  const { t } = useT();
  const { isHolding, handlers } = useHoldToFire(HOLD_MS, () => router.push('/sos'));
  return (
    <Screen>
      <div style={{ padding: '6px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.INK2, letterSpacing: 1.4, fontWeight: 700, paddingTop: 2 }}>{t('home.guest.brand')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <HomeGuestLangToggle />
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.INK3, letterSpacing: 0.6 }}>{t('home.guest.role')}</div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, top: 90, bottom: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div
          {...handlers}
          role="button"
          aria-label={t('home.aria.startEmergency')}
          style={{ touchAction: 'none', userSelect: 'none', cursor: 'pointer', position: 'relative', width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {/* ambient pulse rings — keep running even while holding */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1.5px solid ${X.RED}33`, animation: 'll-pulse-ring 2.4s ease-out infinite' }}/>
          <div style={{ position: 'absolute', inset: 14, borderRadius: '50%', border: `1.5px solid ${X.RED}55`, animation: 'll-pulse-ring 2.4s ease-out infinite 0.8s' }}/>

          {/* main button — scales up to fill the outer ring while held */}
          <div style={{
            width: 240, height: 240, borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, ${X.RED}, ${X.RED_DEEP})`,
            color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            boxShadow: isHolding
              ? '0 30px 100px rgba(225,29,46,0.6), inset 0 -10px 30px rgba(0,0,0,0.22)'
              : '0 24px 70px rgba(225,29,46,0.42), inset 0 -10px 30px rgba(0,0,0,0.18)',
            transform: `scale(${isHolding ? HOLD_SCALE : 1})`,
            transition: isHolding
              ? `transform ${HOLD_MS}ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms ease-out`
              : 'transform 220ms cubic-bezier(0.4, 0, 1, 1), box-shadow 220ms ease-out',
            willChange: 'transform',
          }}>
            <Icon name="siren" size={42} color="#fff" stroke={2.2}/>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1.2, fontFamily: FONT.display, marginTop: 10 }}>{t('home.guest.start')}</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1.2, fontFamily: FONT.display }}>{t('home.guest.emergency')}</div>
            <div style={{ fontSize: 11, fontFamily: FONT.mono, opacity: 0.95, marginTop: 10, letterSpacing: 1.4 }}>
              {isHolding ? t('home.guest.keepHold') : t('home.guest.holdHint')}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 22, fontSize: 14, color: X.INK, fontWeight: 600, textAlign: 'center', maxWidth: 280, lineHeight: 1.4 }}>
          {t('home.guest.subtitle')}
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: X.INK2, textAlign: 'center' }}>
          {t('home.guest.noAccount')}
        </div>
      </div>

      <Link href="/profile" style={{ textDecoration: 'none', position: 'absolute', left: 22, right: 22, bottom: 110, padding: 12, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: X.GREEN_BG, color: X.GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="heart" size={16} color={X.GREEN} stroke={2}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: X.INK }}>{t('home.guest.becomeVolunteer')}</div>
          <div style={{ fontSize: 11, color: X.INK2 }}>{t('home.guest.becomeVolunteerSub')}</div>
        </div>
        <Icon name="chevron-right" size={16} color={X.INK3} stroke={2}/>
      </Link>

      <TabBar active="home"/>
    </Screen>
  );
}

function HomeVolunteer({ patientToo = false }: { patientToo?: boolean }) {
  const router = useRouter();
  const { t } = useT();
  const { isHolding, progress, handlers } = useHoldToFire(HOLD_MS, () => router.push('/sos'));
  return (
    <Screen>
      <div style={{ padding: '6px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.INK2, letterSpacing: 1.2 }}>{t('home.pat.dateLabel')}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, letterSpacing: -0.5, fontFamily: FONT.display }}>{t('home.vol.greeting')}</div>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: 21, background: X.GREEN, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>MK</div>
        </div>
        <div style={{ fontSize: 13, color: X.INK2, marginTop: 4 }}>
          {patientToo ? t('home.vol.role.both') : t('home.vol.role')}
        </div>
      </div>

      <div
        {...handlers}
        role="button"
        aria-label={t('home.aria.startEmergency')}
        style={{ touchAction: 'none', userSelect: 'none', cursor: 'pointer', display: 'block', margin: '18px 22px 0', padding: 18, borderRadius: 20, background: X.INK, color: '#fff', position: 'relative', overflow: 'hidden', transform: isHolding ? 'scale(0.99)' : 'scale(1)', transition: 'transform 120ms ease-out' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, opacity: 0.65 }}>{t('home.vol.emergencyCall')}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, fontFamily: FONT.display, letterSpacing: -0.5, lineHeight: 1.1, whiteSpace: 'pre-line' }}>
              {t('home.vol.holdIfHelp')}
            </div>
          </div>
          <div className="ll-pulse-dot" style={{ width: 56, height: 56, borderRadius: 28, background: X.RED, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 6px rgba(225,29,46,0.18)', animationPlayState: isHolding ? 'paused' : 'running' }}>
            <Icon name="siren" size={26} color="#fff" stroke={2.2}/>
          </div>
        </div>
        <div style={{ marginTop: 14, padding: '10px 0 0', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 14, fontSize: 11, fontFamily: FONT.mono, opacity: 0.75 }}>
          <span>{isHolding ? t('home.vol.keepHolding') : t('home.vol.hold15')}</span> · <span>{t('home.vol.voice')}</span>
        </div>
        {/* progress bar */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: X.RED, opacity: isHolding ? 1 : 0, transition: 'opacity 120ms linear' }}/>
        </div>
      </div>

      <div style={{ margin: '14px 22px 0', background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 18, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        {[
          { k: '12',  l: t('home.vol.stat.responses') },
          { k: '4',   l: t('home.vol.stat.savedLives') },
          { k: '2.4', l: t('home.vol.stat.avgEta') },
        ].map((s, i) => (
          <div key={i} style={{ padding: '16px 14px', borderRight: i < 2 ? `1px solid ${X.LINE}` : 'none' }}>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -1 }}>{s.k}</div>
            <div style={{ fontSize: 10, color: X.INK2, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ margin: '14px 22px 0', padding: 16, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: X.GREEN_BG }}/>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1.5px solid ${X.GREEN}`, opacity: 0.45, animation: 'll-pulse-ring 2.4s ease-out infinite' }}/>
          <div className="ll-pulse-dot" style={{ position: 'relative', width: 10, height: 10, borderRadius: 5, background: X.GREEN }}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.GREEN, fontWeight: 700 }}>{t('home.vol.onCall')}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: X.INK, marginTop: 2 }}>{t('home.vol.listening')}</div>
          <div style={{ fontSize: 12, color: X.INK2, marginTop: 1 }}>{t('home.vol.listeningSub')}</div>
        </div>
      </div>

      {patientToo && (
        <Link href="/patient/hardware" style={{ textDecoration: 'none', display: 'flex', margin: '10px 22px 0', padding: 14, border: `1px solid ${X.LINE}`, borderRadius: 16, gap: 12, alignItems: 'center', background: '#fff' }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: X.RED_BG, color: X.RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="activity" size={20} color={X.RED} stroke={2}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: X.INK }}>{t('home.vol.patchTitle', { bpm: 72 })}</div>
            <div style={{ fontSize: 12, color: X.INK2 }}>{t('home.vol.patchSub', { pct: 88 })}</div>
          </div>
          <Icon name="chevron-right" size={18} color={X.INK3} stroke={2}/>
        </Link>
      )}

      <TabBar active="home"/>
    </Screen>
  );
}

function HomePatient() {
  const router = useRouter();
  const { t } = useT();
  return (
    <Screen>
      <div style={{ padding: '6px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.INK2, letterSpacing: 1.2 }}>{t('home.pat.dateLabel')}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, letterSpacing: -0.5, fontFamily: FONT.display }}>{t('home.pat.greeting')}</div>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: 21, background: X.RED, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>ET</div>
        </div>
        <div style={{ fontSize: 13, color: X.INK2, marginTop: 4 }}>{t('home.pat.role')}</div>
      </div>

      <div style={{ margin: '18px 22px 0' }}>
        <AppleWatchCard variant="home" onCardClick={() => router.push('/patient/hardware')}/>
      </div>

      <Link href="/patient/contacts" style={{ textDecoration: 'none', display: 'flex', margin: '14px 22px 0', padding: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, gap: 12, alignItems: 'center' }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: X.RED_BG, color: X.RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="phone" size={20} color={X.RED} stroke={2}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: X.INK }}>{t('home.pat.contactsTitle.short')}</div>
          <div style={{ fontSize: 12, color: X.INK2 }}>{t('home.pat.contactsSub.short')}</div>
        </div>
        <Icon name="chevron-right" size={18} color={X.INK3} stroke={2}/>
      </Link>

      <Link href="/sos" style={{ textDecoration: 'none', display: 'block', margin: '14px 22px 0', padding: 16, borderRadius: 16, background: X.RED_BG, border: `1px solid ${X.RED}33` }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.RED, fontWeight: 700 }}>{t('home.pat.someoneNeeds')}</div>
        <div style={{ marginTop: 4, fontSize: 16, fontWeight: 700, color: X.INK }}>{t('home.pat.startForThem')}</div>
      </Link>

      <TabBar active="home"/>
    </Screen>
  );
}
