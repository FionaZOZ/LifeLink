'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen, TabBar, TopBar } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';
import { useDemoRole, isVolunteer, isPatient, type DemoRole } from '@/components/lifelink/demoRole';

export default function ProfilePage() {
  const [role, setRole] = useDemoRole();
  if (isVolunteer(role)) return <ProfileVolunteer setRole={setRole}/>;
  if (isPatient(role)) return <ProfilePatient setRole={setRole}/>;
  return <ProfileGuest setRole={setRole}/>;
}

// ───────────────────────────────────────────────────────────
// GUEST — dual-path signup (Patient or Volunteer, both possible)
// ───────────────────────────────────────────────────────────
function ProfileGuest({ setRole }: { setRole: (r: DemoRole) => void }) {
  const router = useRouter();
  const startAs = (r: DemoRole, path: string) => { setRole(r); router.push(path); };
  return (
    <Screen>
      <TopBar title="Profile" leading="none"/>
      <div style={{ position: 'absolute', top: 60, left: 0, right: 0, bottom: 80, overflowY: 'auto', padding: '12px 22px 24px' }}>
        {/* Hero */}
        <div style={{ padding: 22, background: X.INK, color: '#fff', borderRadius: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, opacity: 0.65 }}>THE NETWORK</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6, fontFamily: FONT.display, letterSpacing: -0.5, lineHeight: 1.05 }}>
            Two ways to be<br/>part of LifeLink.
          </div>
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
            Set yourself up as a patient, train to respond as a volunteer — or both. Either way, you&apos;re in the network.
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            {[['7 min', 'avg EMS'], ['90s', 'matters most'], ['10×', 'survival ↑']].map(([k, l], i) => (
              <div key={i}>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.5 }}>{k}</div>
                <div style={{ fontSize: 9, opacity: 0.6, fontFamily: FONT.mono, letterSpacing: 1.2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>WHY I&apos;M HERE</div>

        {/* Patient path */}
        <div style={{ marginTop: 8, padding: 16, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: X.RED_BG, color: X.RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="heart" size={20} color={X.RED} stroke={2.2}/>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: X.INK }}>I have a heart condition</div>
              <div style={{ fontSize: 11, color: X.INK2 }}>Set up so others can help you</div>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: X.INK2, lineHeight: 1.55 }}>
            Add emergency contacts, medical info, and pair your LifeLink Patch. Your patch streams ECG when something looks wrong.
          </div>
          <button onClick={() => startAs('patient', '/patient/contacts')} style={{ all: 'unset', cursor: 'pointer', display: 'block', marginTop: 12, padding: '12px 14px', background: '#fff', border: `1.5px solid ${X.INK}`, color: X.INK, borderRadius: 12, textAlign: 'center', fontSize: 13, fontWeight: 700, boxSizing: 'border-box', width: '100%' }}>
            Get started →
          </button>
        </div>

        {/* Volunteer path */}
        <div style={{ marginTop: 12, padding: 16, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: X.RED_BG, color: X.RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="zap" size={20} color={X.RED} stroke={2.2}/>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: X.INK }}>I want to help someone nearby</div>
              <div style={{ fontSize: 11, color: X.INK2 }}>Get certified to respond</div>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: X.INK2, lineHeight: 1.55 }}>
            Get alerted when a cardiac arrest happens within 2 miles. ~15 min training + a short exam — once certified, your phone becomes a Code Red receiver.
          </div>
          <button onClick={() => startAs('volunteer', '/')} style={{ all: 'unset', cursor: 'pointer', display: 'block', marginTop: 12, padding: '12px 14px', background: X.RED, color: '#fff', borderRadius: 12, textAlign: 'center', fontSize: 13, fontWeight: 800, letterSpacing: 0.3, boxShadow: '0 8px 24px rgba(225,29,46,0.3)', boxSizing: 'border-box', width: '100%' }}>
            Become a volunteer →
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 11, color: X.INK2, textAlign: 'center', fontStyle: 'italic' }}>
          Both? You can turn on the other later in your profile.
        </div>

        {/* Sign in */}
        <div style={{ marginTop: 18, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>HAVE AN ACCOUNT?</div>
        <button onClick={() => startAs('both', '/')} style={{ all: 'unset', cursor: 'pointer', display: 'flex', marginTop: 8, padding: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14, alignItems: 'center', gap: 10, width: '100%', boxSizing: 'border-box' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: X.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="user" size={16} color={X.INK} stroke={2}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: X.INK }}>Sign in</div>
            <div style={{ fontSize: 11, color: X.INK2 }}>Pick up where you left off</div>
          </div>
          <Icon name="chevron-right" size={16} color={X.INK3} stroke={2}/>
        </button>

        {/* Without an account */}
        <div style={{ marginTop: 18, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>WITHOUT AN ACCOUNT</div>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
          {[
            ['heart', 'Learn CPR · 2 min refresher'],
            ['shield', 'Privacy & data'],
            ['message', 'About LifeLink'],
          ].map(([icon, label], i, a) => (
            <div key={i} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < a.length-1 ? `1px solid ${X.LINE}` : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: X.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon as any} size={16} color={X.INK} stroke={2}/>
              </div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: X.INK }}>{label}</div>
              <Icon name="chevron-right" size={16} color={X.INK3} stroke={2}/>
            </div>
          ))}
        </div>
      </div>
      <TabBar active="me"/>
    </Screen>
  );
}

// ───────────────────────────────────────────────────────────
// VOLUNTEER (logged in)
// ───────────────────────────────────────────────────────────
function ProfileVolunteer({ setRole }: { setRole: (r: DemoRole) => void }) {
  const router = useRouter();
  return (
    <Screen>
      <TopBar title="Profile" leading="none"/>
      <div style={{ position: 'absolute', top: 60, left: 0, right: 0, bottom: 80, overflowY: 'auto', padding: '0 22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: X.GREEN, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, fontFamily: FONT.display }}>MK</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.4 }}>Marcus Kim</div>
            <div style={{ fontSize: 12, color: X.INK2 }}>Volunteer · Tier 2 CPR</div>
          </div>
        </div>

        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { k: '12', l: 'RESPONSES' },
            { k: '4', l: 'SAVES' },
            { k: '92%', l: 'ACCEPT' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14, padding: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.8 }}>{s.k}</div>
              <div style={{ fontSize: 9, color: X.INK2, fontFamily: FONT.mono, letterSpacing: 1.4 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>CERTIFICATIONS</div>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
          {[
            ['CPR · BLS', 'Renewed Feb 2026', X.GREEN],
            ['First Aid', 'Renewed Jan 2026', X.GREEN],
            ['AED Operator', 'Expires Aug 2026', X.AMBER],
          ].map(([n, d, c], i, a) => (
            <div key={i} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10, borderBottom: i < a.length-1 ? `1px solid ${X.LINE}` : 'none' }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: c as string }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{n}</div>
                <div style={{ fontSize: 11, color: X.INK2 }}>{d}</div>
              </div>
              <Icon name="chevron-right" size={16} color={X.INK3} stroke={2}/>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>PREFERENCES</div>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
          {[
            ['Auto-accept calls under 1 mi', false],
            ['Voice trigger', true],
          ].map(([n, on], i, a) => (
            <div key={i} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10, borderBottom: i < a.length-1 ? `1px solid ${X.LINE}` : 'none' }}>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{n}</div>
              <div style={{ width: 42, height: 24, borderRadius: 12, background: on ? X.GREEN : X.LINE, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 2, [on ? 'right' : 'left']: 2, width: 20, height: 20, borderRadius: 10, background: '#fff' } as React.CSSProperties}/>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>SETTINGS</div>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
          {[
            ['bell', 'Notifications', 'All alerts on'],
            ['shield', 'Privacy & data', 'Share location during emergencies'],
            ['user', 'Account', 'marcus.kim@email.com'],
            ['heart', 'Medical info', 'Allergies, blood type, contacts'],
            ['message', 'Help & support', 'FAQ, contact us'],
          ].map(([icon, label, sub], i, a) => (
            <div key={i} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < a.length ? `1px solid ${X.LINE}` : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: X.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon as any} size={16} color={X.INK} stroke={2}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
                {sub && <div style={{ fontSize: 11, color: X.INK2 }}>{sub}</div>}
              </div>
              <Icon name="chevron-right" size={16} color={X.INK3} stroke={2}/>
            </div>
          ))}
          <button onClick={() => { setRole('guest'); router.push('/profile'); }} style={{ all: 'unset', cursor: 'pointer', padding: 14, display: 'flex', alignItems: 'center', gap: 12, width: '100%', boxSizing: 'border-box' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: X.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={16} color={X.RED} stroke={2}/>
            </div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: X.RED }}>Sign out</div>
          </button>
        </div>
      </div>
      <TabBar active="me"/>
    </Screen>
  );
}

// ───────────────────────────────────────────────────────────
// PATIENT (logged in)
// ───────────────────────────────────────────────────────────
function ProfilePatient({ setRole }: { setRole: (r: DemoRole) => void }) {
  const router = useRouter();
  return (
    <Screen>
      <TopBar title="Profile" leading="none"/>
      <div style={{ position: 'absolute', top: 60, left: 0, right: 0, bottom: 80, overflowY: 'auto', padding: '0 22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: X.RED, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, fontFamily: FONT.display }}>ET</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.4 }}>Eleanor Tanaka</div>
            <div style={{ fontSize: 12, color: X.INK2 }}>Patient · pacemaker (2022)</div>
          </div>
        </div>

        <div style={{ marginTop: 18, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>YOUR SETUP</div>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
          {[
            ['phone', 'Emergency contacts', '3 set up · primary: David', '/patient/contacts'],
            ['activity', 'LifeLink Patch', 'Connected · 88% battery', '/patient/hardware'],
            ['heart', 'Medical info', 'HF · arrhythmia · pacemaker', null],
          ].map(([icon, label, sub, href], i, a) => {
            const inner = (
              <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < a.length-1 ? `1px solid ${X.LINE}` : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: X.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={icon as any} size={16} color={X.INK} stroke={2}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: X.INK }}>{label}</div>
                  <div style={{ fontSize: 11, color: X.INK2 }}>{sub}</div>
                </div>
                <Icon name="chevron-right" size={16} color={X.INK3} stroke={2}/>
              </div>
            );
            return href ? (
              <button key={i} onClick={() => router.push(href as string)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box' }}>{inner}</button>
            ) : <div key={i}>{inner}</div>;
          })}
        </div>

        {/* Add volunteer-mode card */}
        <div style={{ marginTop: 18, padding: 14, background: X.RED_BG, border: `1px solid ${X.RED}33`, borderRadius: 16 }}>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.RED, fontWeight: 700 }}>+ ADD VOLUNTEER MODE</div>
          <div style={{ marginTop: 6, fontSize: 13, color: X.INK }}>Train + pass exam to also receive Code Red alerts.</div>
          <button onClick={() => setRole('both')} style={{ all: 'unset', cursor: 'pointer', display: 'inline-block', marginTop: 10, padding: '8px 14px', background: X.RED, color: '#fff', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
            Start training
          </button>
        </div>

        <div style={{ marginTop: 18, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>SETTINGS</div>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
          {[
            ['bell', 'Notifications', 'Critical only'],
            ['shield', 'Privacy & data', 'Share live ECG with cardiologist'],
            ['user', 'Account', 'eleanor.t@email.com'],
            ['message', 'Help & support', 'FAQ, contact us'],
          ].map(([icon, label, sub], i) => (
            <div key={i} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${X.LINE}` }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: X.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon as any} size={16} color={X.INK} stroke={2}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 11, color: X.INK2 }}>{sub}</div>
              </div>
              <Icon name="chevron-right" size={16} color={X.INK3} stroke={2}/>
            </div>
          ))}
          <button onClick={() => { setRole('guest'); router.push('/profile'); }} style={{ all: 'unset', cursor: 'pointer', padding: 14, display: 'flex', alignItems: 'center', gap: 12, width: '100%', boxSizing: 'border-box' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: X.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={16} color={X.RED} stroke={2}/>
            </div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: X.RED }}>Sign out</div>
          </button>
        </div>
      </div>
      <TabBar active="me"/>
    </Screen>
  );
}
