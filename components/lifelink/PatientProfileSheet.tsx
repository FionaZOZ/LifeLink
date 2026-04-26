'use client';
import * as React from 'react';
import { Icon } from './Icon';
import { X, FONT } from './tokens';
import type { SerialPatientProfile } from '@/lib/cpr/useSerialCPR';
import { useT } from './i18n';

function ageFromDob(dob?: string): string | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return years > 0 ? String(years) : null;
}

type Props = {
  profile: SerialPatientProfile | null;
  open: boolean;
  onDismiss: () => void;
  syncedAt?: string | null;
  syncError?: string | null;
};

export function PatientProfileSheet({ profile, open, onDismiss, syncedAt, syncError }: Props) {
  const { t } = useT();
  // Animate in/out only after the consumer has mounted us with a profile.
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    if (open && profile) {
      const r = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(r);
    }
    setShown(false);
  }, [open, profile]);

  if (!profile && !open) return null;

  const age = ageFromDob(profile?.dob);
  const ec = profile?.emergencyContact;
  const phys = profile?.physician;

  return (
    <>
      {/* dim overlay */}
      <div
        onClick={onDismiss}
        style={{
          position: 'absolute', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.55)',
          opacity: shown ? 1 : 0,
          transition: 'opacity 220ms ease-out',
          pointerEvents: shown ? 'auto' : 'none',
        }}
      />
      {/* sheet */}
      <div
        role="dialog"
        aria-label={t('cpr.profile.aria')}
        className="ll-scroll-hide"
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 310,
          background: '#fff', color: X.INK,
          borderTopLeftRadius: 22, borderTopRightRadius: 22,
          padding: '12px 22px 28px',
          boxShadow: '0 -18px 48px rgba(0,0,0,0.32)',
          transform: shown ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 320ms cubic-bezier(0.4, 0, 0.2, 1)',
          maxHeight: '88%', overflowY: 'auto',
        }}
      >
        {/* drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: X.LINE, margin: '0 auto 14px' }}/>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: X.GREEN_BG, color: X.GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={16} color={X.GREEN} stroke={3}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.GREEN, fontWeight: 700 }}>{t('cpr.profile.loaded')}</div>
            <div style={{ fontSize: 11, color: X.INK2 }}>
              {syncError ? <span style={{ color: X.AMBER }}>{t('cpr.profile.syncErr')}</span>
                : syncedAt ? t('cpr.profile.syncedAt', { time: new Date(syncedAt).toLocaleTimeString() })
                : t('cpr.profile.reading')}
            </div>
          </div>
        </div>

        {/* name + age */}
        <div style={{ marginTop: 14, fontSize: 28, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.6 }}>
          {profile?.name ?? t('cpr.profile.unknown')}{age && <span style={{ color: X.INK2 }}>, {age}</span>}
        </div>
        {profile?.dob && (
          <div style={{ fontSize: 12, color: X.INK2, fontFamily: FONT.mono, marginTop: 2 }}>{t('cpr.profile.dob', { dob: profile.dob })}</div>
        )}

        {/* vital info grid */}
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {profile?.bloodType && (
            <Field label={t('cpr.profile.field.bloodType')} value={profile.bloodType} accent={X.RED}/>
          )}
          {profile?.allergies && (
            <Field label={t('cpr.profile.field.allergies')} value={profile.allergies} accent={X.AMBER}/>
          )}
        </div>

        {/* conditions + meds — full width because they tend to be longer */}
        {profile?.conditions && (
          <FullRow label={t('cpr.profile.field.conditions')} value={profile.conditions} accent={X.RED}/>
        )}
        {profile?.medications && (
          <FullRow label={t('cpr.profile.field.medications')} value={profile.medications} accent={X.INK}/>
        )}

        {/* emergency contact */}
        {ec && (ec.name || ec.phone) && (
          <div style={{ marginTop: 14, padding: 12, background: X.RED_BG, border: `1px solid ${X.RED}33`, borderRadius: 12 }}>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.RED, fontWeight: 700 }}>{t('cpr.profile.field.emergency')}</div>
            <div style={{ marginTop: 4, fontSize: 14, fontWeight: 700 }}>{ec.name ?? t('cpr.profile.dash')}{ec.relation && <span style={{ color: X.INK2, fontWeight: 500 }}> · {ec.relation}</span>}</div>
            {ec.phone && <div style={{ fontSize: 12, color: X.INK2, fontFamily: FONT.mono, marginTop: 2 }}>{ec.phone}</div>}
          </div>
        )}

        {/* physician */}
        {phys && (phys.name || phys.phone) && (
          <div style={{ marginTop: 8, padding: 12, background: X.BLUE_BG, border: `1px solid ${X.BLUE}33`, borderRadius: 12 }}>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.BLUE, fontWeight: 700 }}>{t('cpr.profile.field.physician')}</div>
            <div style={{ marginTop: 4, fontSize: 14, fontWeight: 700 }}>{phys.name ?? t('cpr.profile.dash')}</div>
            {phys.phone && <div style={{ fontSize: 12, color: X.INK2, fontFamily: FONT.mono, marginTop: 2 }}>{phys.phone}</div>}
          </div>
        )}

        {profile?.notes && (
          <div style={{ marginTop: 12, padding: 12, background: X.BG, borderRadius: 12, fontSize: 12, color: X.INK2, lineHeight: 1.5 }}>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2, fontWeight: 700, marginBottom: 4 }}>{t('cpr.profile.field.notes')}</div>
            {profile.notes}
          </div>
        )}

        <button
          onClick={onDismiss}
          style={{
            all: 'unset', cursor: 'pointer', display: 'block', boxSizing: 'border-box',
            width: '100%', marginTop: 16, padding: 16,
            background: X.RED, color: '#fff', borderRadius: 14,
            textAlign: 'center', fontSize: 15, fontWeight: 800, letterSpacing: 0.4,
            boxShadow: '0 8px 24px rgba(225,29,46,0.3)',
          }}
        >
          {t('cpr.profile.gotIt')}
        </button>
      </div>
    </>
  );
}

function Field({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: X.BG, border: `1px solid ${X.LINE}`, borderRadius: 12, padding: 10 }}>
      <div style={{ fontSize: 9, fontFamily: FONT.mono, letterSpacing: 1.4, color: accent, fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: 2, fontSize: 16, fontWeight: 700, fontFamily: FONT.display }}>{value}</div>
    </div>
  );
}

function FullRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ marginTop: 8, padding: 12, background: X.BG, border: `1px solid ${X.LINE}`, borderRadius: 12 }}>
      <div style={{ fontSize: 9, fontFamily: FONT.mono, letterSpacing: 1.4, color: accent, fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}
