'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen, TabBar, TopBar } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';
import { useDemoRole, isVolunteer, isPatient, type DemoRole } from '@/components/lifelink/demoRole';
import { useT, useLang, LANG_OPTIONS } from '@/components/lifelink/i18n';

export default function ProfilePage() {
  const [role, setRole] = useDemoRole();
  if (isVolunteer(role)) return <ProfileVolunteer setRole={setRole} patientToo={isPatient(role)}/>;
  if (isPatient(role)) return <ProfilePatient setRole={setRole}/>;
  return <ProfileGuest setRole={setRole}/>;
}

// Helper: pull current language label for the SETTINGS row.
function useLangLabel(): string {
  const [lang] = useLang();
  return LANG_OPTIONS.find(o => o.id === lang)?.label ?? 'English';
}

// ───────────────────────────────────────────────────────────
// GUEST — dual-path signup (Patient or Volunteer, both possible)
// ───────────────────────────────────────────────────────────
function ProfileGuest({ setRole }: { setRole: (r: DemoRole) => void }) {
  const router = useRouter();
  const { t } = useT();
  const langLabel = useLangLabel();
  const startAs = (r: DemoRole, path: string) => { setRole(r); router.push(path); };
  return (
    <Screen>
      <TopBar title={t('profile.title')} leading="none"/>
      <div style={{ position: 'absolute', top: 60, left: 0, right: 0, bottom: 80, overflowY: 'auto', padding: '12px 22px 24px' }}>
        {/* Hero */}
        <div style={{ padding: 22, background: X.INK, color: '#fff', borderRadius: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, opacity: 0.65 }}>{t('profile.network')}</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6, fontFamily: FONT.display, letterSpacing: -0.5, lineHeight: 1.05, whiteSpace: 'pre-line' }}>
            {t('profile.network.title')}
          </div>
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
            {t('profile.network.sub')}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            {[['7 min', t('profile.network.stat.ems')], ['90s', t('profile.network.stat.matters')], ['10×', t('profile.network.stat.survival')]].map(([k, l], i) => (
              <div key={i}>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.5 }}>{k}</div>
                <div style={{ fontSize: 9, opacity: 0.6, fontFamily: FONT.mono, letterSpacing: 1.2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>{t('profile.whyImHere')}</div>

        {/* Patient path */}
        <div style={{ marginTop: 8, padding: 16, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: X.RED_BG, color: X.RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="heart" size={20} color={X.RED} stroke={2.2}/>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: X.INK }}>{t('profile.patientPath.title')}</div>
              <div style={{ fontSize: 11, color: X.INK2 }}>{t('profile.patientPath.sub')}</div>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: X.INK2, lineHeight: 1.55 }}>
            {t('profile.patientPath.body')}
          </div>
          <button onClick={() => startAs('patient', '/patient/contacts')} style={{ all: 'unset', cursor: 'pointer', display: 'block', marginTop: 12, padding: '12px 14px', background: '#fff', border: `1.5px solid ${X.INK}`, color: X.INK, borderRadius: 12, textAlign: 'center', fontSize: 13, fontWeight: 700, boxSizing: 'border-box', width: '100%' }}>
            {t('profile.patientPath.cta')}
          </button>
        </div>

        {/* Volunteer path */}
        <div style={{ marginTop: 12, padding: 16, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: X.RED_BG, color: X.RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="zap" size={20} color={X.RED} stroke={2.2}/>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: X.INK }}>{t('profile.volunteerPath.title')}</div>
              <div style={{ fontSize: 11, color: X.INK2 }}>{t('profile.volunteerPath.sub')}</div>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: X.INK2, lineHeight: 1.55 }}>
            {t('profile.volunteerPath.body')}
          </div>
          <button onClick={() => startAs('volunteer', '/')} style={{ all: 'unset', cursor: 'pointer', display: 'block', marginTop: 12, padding: '12px 14px', background: X.RED, color: '#fff', borderRadius: 12, textAlign: 'center', fontSize: 13, fontWeight: 800, letterSpacing: 0.3, boxShadow: '0 8px 24px rgba(225,29,46,0.3)', boxSizing: 'border-box', width: '100%' }}>
            {t('profile.volunteerPath.cta')}
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 11, color: X.INK2, textAlign: 'center', fontStyle: 'italic' }}>
          {t('profile.bothLater')}
        </div>

        {/* Sign in */}
        <div style={{ marginTop: 18, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>{t('profile.haveAccount')}</div>
        <button onClick={() => startAs('both', '/')} style={{ all: 'unset', cursor: 'pointer', display: 'flex', marginTop: 8, padding: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14, alignItems: 'center', gap: 10, width: '100%', boxSizing: 'border-box' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: X.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="user" size={16} color={X.INK} stroke={2}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: X.INK }}>{t('common.signIn')}</div>
            <div style={{ fontSize: 11, color: X.INK2 }}>{t('profile.signInSub')}</div>
          </div>
          <Icon name="chevron-right" size={16} color={X.INK3} stroke={2}/>
        </button>

        {/* Without an account */}
        <div style={{ marginTop: 18, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>{t('profile.withoutAccount')}</div>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
          {[
            { icon: 'heart',  label: t('profile.learnCpr'),  href: null },
            { icon: 'globe',  label: t('profile.setting.language'), sub: langLabel, href: '/settings/language' },
            { icon: 'shield', label: t('profile.privacy'),   href: null },
            { icon: 'message', label: t('profile.about'),    href: null },
          ].map((row, i, a) => {
            const inner = (
              <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < a.length-1 ? `1px solid ${X.LINE}` : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: X.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={row.icon as any} size={16} color={X.INK} stroke={2}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: X.INK }}>{row.label}</div>
                  {row.sub && <div style={{ fontSize: 11, color: X.INK2 }}>{row.sub}</div>}
                </div>
                <Icon name="chevron-right" size={16} color={X.INK3} stroke={2}/>
              </div>
            );
            return row.href ? (
              <button key={i} onClick={() => router.push(row.href!)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box' }}>{inner}</button>
            ) : <div key={i}>{inner}</div>;
          })}
        </div>
      </div>
      <TabBar active="me"/>
    </Screen>
  );
}

// ───────────────────────────────────────────────────────────
// VOLUNTEER (logged in)
// ───────────────────────────────────────────────────────────
function ProfileVolunteer({ setRole, patientToo = false }: { setRole: (r: DemoRole) => void; patientToo?: boolean }) {
  const router = useRouter();
  const { t } = useT();
  const langLabel = useLangLabel();
  return (
    <Screen>
      <TopBar title={t('profile.title')} leading="none"/>
      <div style={{ position: 'absolute', top: 60, left: 0, right: 0, bottom: 80, overflowY: 'auto', padding: '0 22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: X.GREEN, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, fontFamily: FONT.display }}>MK</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.4 }}>Marcus Kim</div>
            <div style={{ fontSize: 12, color: X.INK2 }}>{t('profile.role.volunteer')}</div>
          </div>
        </div>

        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { k: '12',  l: t('profile.stat.responses') },
            { k: '4',   l: t('profile.stat.saves') },
            { k: '92%', l: t('profile.stat.accept') },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14, padding: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.8 }}>{s.k}</div>
              <div style={{ fontSize: 9, color: X.INK2, fontFamily: FONT.mono, letterSpacing: 1.4 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>{t('profile.section.certs')}</div>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
          {[
            [t('profile.cert.cpr'),      t('profile.cert.cpr.sub'),      X.GREEN],
            [t('profile.cert.firstaid'), t('profile.cert.firstaid.sub'), X.GREEN],
            [t('profile.cert.aed'),      t('profile.cert.aed.sub'),      X.AMBER],
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

        <div style={{ marginTop: 18, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>{t('profile.section.prefs')}</div>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
          {[
            [t('profile.pref.autoAccept'), false],
            [t('profile.pref.voice'),      true],
          ].map(([n, on], i, a) => (
            <div key={i} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10, borderBottom: i < a.length-1 ? `1px solid ${X.LINE}` : 'none' }}>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{n}</div>
              <div style={{ width: 42, height: 24, borderRadius: 12, background: on ? X.GREEN : X.LINE, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 2, [on ? 'right' : 'left']: 2, width: 20, height: 20, borderRadius: 10, background: '#fff' } as React.CSSProperties}/>
              </div>
            </div>
          ))}
        </div>

        {/* Add patient-mode card — only when not already a patient */}
        {!patientToo && (
          <div style={{ marginTop: 18, padding: 14, background: X.RED_BG, border: `1px solid ${X.RED}33`, borderRadius: 16 }}>
            <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.RED, fontWeight: 700 }}>{t('profile.addPatientMode')}</div>
            <div style={{ marginTop: 6, fontSize: 13, color: X.INK }}>{t('profile.addPatientMode.body')}</div>
            <button onClick={() => { setRole('both'); router.push('/patient/contacts'); }} style={{ all: 'unset', cursor: 'pointer', display: 'inline-block', marginTop: 10, padding: '8px 14px', background: X.RED, color: '#fff', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
              {t('profile.addPatientMode.cta')}
            </button>
          </div>
        )}

        <div style={{ marginTop: 18, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>{t('profile.section.settings')}</div>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
          {[
            { icon: 'bell',    label: t('profile.setting.notifications'), sub: t('profile.setting.notifications.allOn'), href: null },
            { icon: 'shield',  label: t('profile.setting.privacy'),       sub: t('profile.setting.privacy.share'),       href: null },
            { icon: 'globe',   label: t('profile.setting.language'),      sub: langLabel,                                href: '/settings/language' },
            { icon: 'user',    label: t('profile.setting.account'),       sub: 'marcus.kim@email.com',                    href: null },
            { icon: 'heart',   label: t('profile.setting.medical'),       sub: t('profile.setting.medical.sub'),         href: null },
            { icon: 'message', label: t('profile.setting.help'),          sub: t('profile.setting.help.sub'),            href: null },
          ].map((row, i, a) => {
            const inner = (
              <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < a.length ? `1px solid ${X.LINE}` : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: X.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={row.icon as any} size={16} color={X.INK} stroke={2}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{row.label}</div>
                  {row.sub && <div style={{ fontSize: 11, color: X.INK2 }}>{row.sub}</div>}
                </div>
                <Icon name="chevron-right" size={16} color={X.INK3} stroke={2}/>
              </div>
            );
            return row.href ? (
              <button key={i} onClick={() => router.push(row.href!)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box' }}>{inner}</button>
            ) : <div key={i}>{inner}</div>;
          })}
          <button onClick={() => { setRole('guest'); router.push('/profile'); }} style={{ all: 'unset', cursor: 'pointer', padding: 14, display: 'flex', alignItems: 'center', gap: 12, width: '100%', boxSizing: 'border-box' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: X.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={16} color={X.RED} stroke={2}/>
            </div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: X.RED }}>{t('common.signOut')}</div>
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
  const { t } = useT();
  const langLabel = useLangLabel();
  return (
    <Screen>
      <TopBar title={t('profile.title')} leading="none"/>
      <div style={{ position: 'absolute', top: 60, left: 0, right: 0, bottom: 80, overflowY: 'auto', padding: '0 22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: X.RED, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, fontFamily: FONT.display }}>ET</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.4 }}>Eleanor Tanaka</div>
            <div style={{ fontSize: 12, color: X.INK2 }}>{t('profile.role.patient')}</div>
          </div>
        </div>

        <div style={{ marginTop: 18, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>{t('profile.section.setup')}</div>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
          {[
            { icon: 'phone',    label: t('profile.setup.contacts'), sub: t('profile.setup.contacts.sub'), href: '/patient/contacts' },
            { icon: 'activity', label: t('profile.setup.patch'),    sub: t('profile.setup.patch.sub'),    href: '/patient/hardware' },
            { icon: 'heart',    label: t('profile.setup.medical'),  sub: t('profile.setup.medical.sub'),  href: null },
          ].map((row, i, a) => {
            const inner = (
              <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < a.length-1 ? `1px solid ${X.LINE}` : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: X.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={row.icon as any} size={16} color={X.INK} stroke={2}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: X.INK }}>{row.label}</div>
                  <div style={{ fontSize: 11, color: X.INK2 }}>{row.sub}</div>
                </div>
                <Icon name="chevron-right" size={16} color={X.INK3} stroke={2}/>
              </div>
            );
            return row.href ? (
              <button key={i} onClick={() => router.push(row.href!)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box' }}>{inner}</button>
            ) : <div key={i}>{inner}</div>;
          })}
        </div>

        {/* Add volunteer-mode card */}
        <div style={{ marginTop: 18, padding: 14, background: X.RED_BG, border: `1px solid ${X.RED}33`, borderRadius: 16 }}>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.RED, fontWeight: 700 }}>{t('profile.addVolunteerMode')}</div>
          <div style={{ marginTop: 6, fontSize: 13, color: X.INK }}>{t('profile.addVolunteerMode.body')}</div>
          <button onClick={() => setRole('both')} style={{ all: 'unset', cursor: 'pointer', display: 'inline-block', marginTop: 10, padding: '8px 14px', background: X.RED, color: '#fff', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
            {t('profile.addVolunteerMode.cta')}
          </button>
        </div>

        <div style={{ marginTop: 18, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>{t('profile.section.settings')}</div>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
          {[
            { icon: 'bell',    label: t('profile.setting.notifications'), sub: t('profile.setting.notifications.critical'), href: null },
            { icon: 'shield',  label: t('profile.setting.privacy'),       sub: t('profile.setting.privacy.ecg'),             href: null },
            { icon: 'globe',   label: t('profile.setting.language'),      sub: langLabel,                                    href: '/settings/language' },
            { icon: 'user',    label: t('profile.setting.account'),       sub: 'eleanor.t@email.com',                         href: null },
            { icon: 'message', label: t('profile.setting.help'),          sub: t('profile.setting.help.sub'),                href: null },
          ].map((row, i) => {
            const inner = (
              <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${X.LINE}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: X.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={row.icon as any} size={16} color={X.INK} stroke={2}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{row.label}</div>
                  <div style={{ fontSize: 11, color: X.INK2 }}>{row.sub}</div>
                </div>
                <Icon name="chevron-right" size={16} color={X.INK3} stroke={2}/>
              </div>
            );
            return row.href ? (
              <button key={i} onClick={() => router.push(row.href!)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box' }}>{inner}</button>
            ) : <div key={i}>{inner}</div>;
          })}
          <button onClick={() => { setRole('guest'); router.push('/profile'); }} style={{ all: 'unset', cursor: 'pointer', padding: 14, display: 'flex', alignItems: 'center', gap: 12, width: '100%', boxSizing: 'border-box' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: X.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={16} color={X.RED} stroke={2}/>
            </div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: X.RED }}>{t('common.signOut')}</div>
          </button>
        </div>
      </div>
      <TabBar active="me"/>
    </Screen>
  );
}
