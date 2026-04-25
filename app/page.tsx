'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Screen, TabBar } from '@/components/lifelink/Screen';
import { Icon, ECGLine } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';
import { useDemoRole, isVolunteer, isPatient } from '@/components/lifelink/demoRole';

export default function HomePage() {
  const [role] = useDemoRole();
  if (isPatient(role) && !isVolunteer(role)) return <HomePatient/>;
  if (isVolunteer(role)) return <HomeVolunteer patientToo={isPatient(role)}/>;
  return <HomeGuest/>;
}

function HomeGuest() {
  const router = useRouter();
  return (
    <Screen>
      <div style={{ padding: '6px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.INK2, letterSpacing: 1.4, fontWeight: 700 }}>LIFELINK</div>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.INK3, letterSpacing: 0.6 }}>guest</div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, top: 90, bottom: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={() => router.push('/sos')} aria-label="Start emergency" style={{ all: 'unset', cursor: 'pointer', position: 'relative', width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1.5px solid ${X.RED}33`, animation: 'll-pulse-ring 2.4s ease-out infinite' }}/>
          <div style={{ position: 'absolute', inset: 14, borderRadius: '50%', border: `1.5px solid ${X.RED}55`, animation: 'll-pulse-ring 2.4s ease-out infinite 0.8s' }}/>
          <div style={{
            width: 240, height: 240, borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, ${X.RED}, ${X.RED_DEEP})`,
            color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 24px 70px rgba(225,29,46,0.42), inset 0 -10px 30px rgba(0,0,0,0.18)',
          }}>
            <Icon name="siren" size={42} color="#fff" stroke={2.2}/>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1.2, fontFamily: FONT.display, marginTop: 10 }}>START</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1.2, fontFamily: FONT.display }}>EMERGENCY</div>
            <div style={{ fontSize: 11, fontFamily: FONT.mono, opacity: 0.85, marginTop: 10, letterSpacing: 1.4 }}>HOLD · 2s</div>
          </div>
        </button>
        <div style={{ marginTop: 22, fontSize: 14, color: X.INK, fontWeight: 600, textAlign: 'center', maxWidth: 280, lineHeight: 1.4 }}>
          If someone is unresponsive, hold to begin.
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: X.INK2, textAlign: 'center' }}>
          No account needed.
        </div>
      </div>

      <Link href="/profile" style={{ textDecoration: 'none', position: 'absolute', left: 22, right: 22, bottom: 110, padding: 12, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: X.GREEN_BG, color: X.GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="heart" size={16} color={X.GREEN} stroke={2}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: X.INK }}>Become a volunteer</div>
          <div style={{ fontSize: 11, color: X.INK2 }}>Get alerted when someone nearby needs help</div>
        </div>
        <Icon name="chevron-right" size={16} color={X.INK3} stroke={2}/>
      </Link>

      <TabBar active="home"/>
    </Screen>
  );
}

function HomeVolunteer({ patientToo = false }: { patientToo?: boolean }) {
  return (
    <Screen>
      <div style={{ padding: '6px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.INK2, letterSpacing: 1.2 }}>FRIDAY · 25 APR</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, letterSpacing: -0.5, fontFamily: FONT.display }}>Hi, Marcus.</div>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: 21, background: X.GREEN, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>MK</div>
        </div>
        <div style={{ fontSize: 13, color: X.INK2, marginTop: 4 }}>
          {patientToo ? 'Volunteer + Patient · Tier 2 CPR · 240 m radius' : 'Volunteer · Tier 2 CPR · 240 m radius'}
        </div>
      </div>

      <Link href="/sos" style={{ textDecoration: 'none', display: 'block', margin: '18px 22px 0', padding: 18, borderRadius: 20, background: X.INK, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, opacity: 0.65 }}>EMERGENCY CALL</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, fontFamily: FONT.display, letterSpacing: -0.5, lineHeight: 1.1 }}>
              Tap if someone is<br/>unresponsive
            </div>
          </div>
          <div className="ll-pulse-dot" style={{ width: 56, height: 56, borderRadius: 28, background: X.RED, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 6px rgba(225,29,46,0.18)' }}>
            <Icon name="siren" size={26} color="#fff" stroke={2.2}/>
          </div>
        </div>
        <div style={{ marginTop: 14, padding: '10px 0 0', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 14, fontSize: 11, fontFamily: FONT.mono, opacity: 0.75 }}>
          <span>HOLD 2s</span> · <span>VOICE: &quot;HEY SIRI, CARDIAC EMERGENCY&quot;</span>
        </div>
      </Link>

      <div style={{ margin: '14px 22px 0', background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 18, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        {[
          { k: '12', l: 'responses' },
          { k: '4', l: 'lives saved' },
          { k: '2.4', l: 'min avg ETA' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '16px 14px', borderRight: i < 2 ? `1px solid ${X.LINE}` : 'none' }}>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -1 }}>{s.k}</div>
            <div style={{ fontSize: 10, color: X.INK2, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ margin: '14px 22px 0' }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2, marginBottom: 8 }}>AROUND YOU</div>
        <Link href="/sos/map" style={{ textDecoration: 'none', display: 'block', background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: X.RED_BG, color: X.RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="heart" size={20} color={X.RED} stroke={2}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: X.INK }}>3 patients in your radius</div>
              <div style={{ fontSize: 12, color: X.INK2 }}>4 AEDs · 7 volunteers active</div>
            </div>
            <Icon name="chevron-right" size={18} color={X.INK3} stroke={2}/>
          </div>
        </Link>
      </div>

      <Link href="/helper/code-red" style={{ textDecoration: 'none', display: 'flex', margin: '10px 22px 0', padding: 14, border: `1px solid ${X.LINE}`, borderRadius: 16, gap: 12, alignItems: 'center', background: '#fff' }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: X.AMBER_BG, color: X.AMBER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="zap" size={20} color={X.AMBER} stroke={2}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: X.INK }}>30-sec readiness drill</div>
          <div style={{ fontSize: 12, color: X.INK2 }}>Last completed 6 days ago</div>
        </div>
        <Icon name="chevron-right" size={18} color={X.INK3} stroke={2}/>
      </Link>

      {patientToo && (
        <Link href="/patient/hardware" style={{ textDecoration: 'none', display: 'flex', margin: '10px 22px 0', padding: 14, border: `1px solid ${X.LINE}`, borderRadius: 16, gap: 12, alignItems: 'center', background: '#fff' }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: X.RED_BG, color: X.RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="activity" size={20} color={X.RED} stroke={2}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: X.INK }}>Your patch — 72 BPM</div>
            <div style={{ fontSize: 12, color: X.INK2 }}>Connected · battery 88%</div>
          </div>
          <Icon name="chevron-right" size={18} color={X.INK3} stroke={2}/>
        </Link>
      )}

      <TabBar active="home"/>
    </Screen>
  );
}

function HomePatient() {
  return (
    <Screen>
      <div style={{ padding: '6px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.INK2, letterSpacing: 1.2 }}>FRIDAY · 25 APR</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, letterSpacing: -0.5, fontFamily: FONT.display }}>Hi, Eleanor.</div>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: 21, background: X.RED, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>ET</div>
        </div>
        <div style={{ fontSize: 13, color: X.INK2, marginTop: 4 }}>Patient · pacemaker · cardiologist Dr. Patel</div>
      </div>

      <Link href="/patient/hardware" style={{ textDecoration: 'none', display: 'block', margin: '18px 22px 0', padding: 16, borderRadius: 20, background: X.INK, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4 }}>
          <span style={{ color: X.GREEN }}>● PATCH CONNECTED · v2.1</span>
          <span style={{ opacity: 0.6 }}>SR 200Hz</span>
        </div>
        <div style={{ marginTop: 10, fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.4 }}>72 BPM · steady</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Worn — left chest · since 06:42</div>
        <div style={{ marginTop: 12, color: X.RED }}>
          <ECGLine width={300} height={50} color={X.RED} stroke={1.6}/>
        </div>
      </Link>

      <Link href="/patient/contacts" style={{ textDecoration: 'none', display: 'flex', margin: '14px 22px 0', padding: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, gap: 12, alignItems: 'center' }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: X.RED_BG, color: X.RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="phone" size={20} color={X.RED} stroke={2}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: X.INK }}>Emergency contacts</div>
          <div style={{ fontSize: 12, color: X.INK2 }}>3 people in call order</div>
        </div>
        <Icon name="chevron-right" size={18} color={X.INK3} stroke={2}/>
      </Link>

      <Link href="/sos" style={{ textDecoration: 'none', display: 'block', margin: '14px 22px 0', padding: 16, borderRadius: 16, background: X.RED_BG, border: `1px solid ${X.RED}33` }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.RED, fontWeight: 700 }}>SOMEONE ELSE NEEDS HELP?</div>
        <div style={{ marginTop: 4, fontSize: 16, fontWeight: 700, color: X.INK }}>Start an emergency for them →</div>
      </Link>

      <TabBar active="home"/>
    </Screen>
  );
}
