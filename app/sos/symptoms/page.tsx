'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';
import { useT } from '@/components/lifelink/i18n';

const SYMPTOMS_LOGGED_KEY = 'lifelink:symptomsLoggedCount';

const CHIPS: { id: string; key: string }[] = [
  { id: 'chest',  key: 'sos.symp.chip.chest'  },
  { id: 'arm',    key: 'sos.symp.chip.arm'    },
  { id: 'numb',   key: 'sos.symp.chip.numb'   },
  { id: 'speech', key: 'sos.symp.chip.speech' },
  { id: 'breath', key: 'sos.symp.chip.breath' },
  { id: 'dizzy',  key: 'sos.symp.chip.dizzy'  },
  { id: 'sweat',  key: 'sos.symp.chip.sweat'  },
  { id: 'nausea', key: 'sos.symp.chip.nausea' },
];

export default function SymptomsPage() {
  const router = useRouter();
  const { t } = useT();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [notes, setNotes] = React.useState('');
  const [phase, setPhase] = React.useState<'editing' | 'sending' | 'sent'>('editing');

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalLogged = selected.size + (notes.trim().length > 0 ? 1 : 0);
  const canSend = totalLogged > 0;

  const send = () => {
    if (!canSend) return;
    setPhase('sending');
    setTimeout(() => {
      try {
        window.sessionStorage.setItem(SYMPTOMS_LOGGED_KEY, String(selected.size));
      } catch { /* ignore */ }
      setPhase('sent');
    }, 700);
  };

  const goBack = () => router.push('/sos/dispatch/conscious');

  return (
    <Screen bg={X.PAPER} padTop={0}>
      <EmergencyBanner/>

      {/* Header bar — back button + title */}
      <div style={{ position: 'absolute', top: 50, left: 0, right: 0, padding: '12px 18px 10px', background: '#fff', borderBottom: `1px solid ${X.LINE}`, display: 'flex', alignItems: 'center', gap: 12, zIndex: 8 }}>
        <button onClick={goBack} aria-label={t('common.back')} style={{ all: 'unset', cursor: 'pointer', width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron-right" size={20} color={X.INK} stroke={2.4} style={{ transform: 'rotate(180deg)' }}/>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>{t('sos.symp.title')}</div>
          <div style={{ fontSize: 11, color: X.INK2, marginTop: 1 }}>{t('sos.symp.intro')}</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ position: 'absolute', top: 110, left: 0, right: 0, bottom: 100, overflowY: 'auto', padding: '16px 22px 24px', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2, fontWeight: 700 }}>{t('sos.symp.section.tap')}</div>

        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CHIPS.map(c => {
            const on = selected.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                aria-pressed={on}
                style={{
                  all: 'unset', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 14px',
                  borderRadius: 999,
                  background: on ? X.RED : '#fff',
                  border: `1.5px solid ${on ? X.RED : X.LINE}`,
                  color: on ? '#fff' : X.INK,
                  fontSize: 13, fontWeight: 700,
                  transition: 'background 160ms ease-out, color 160ms ease-out, border-color 160ms ease-out',
                  boxShadow: on ? '0 4px 12px rgba(225,29,46,0.25)' : 'none',
                }}
              >
                {on && <Icon name="check" size={13} color="#fff" stroke={3}/>}
                {t(c.key)}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 22, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2, fontWeight: 700 }}>{t('sos.symp.section.notes')}</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('sos.symp.notes.placeholder')}
          rows={4}
          style={{
            width: '100%', boxSizing: 'border-box',
            marginTop: 8, padding: 14,
            background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14,
            fontSize: 13, fontFamily: FONT.body, color: X.INK,
            resize: 'none', outline: 'none',
            lineHeight: 1.45,
          }}
        />
      </div>

      {/* Sticky send button */}
      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 28 }}>
        <button
          onClick={send}
          disabled={!canSend || phase !== 'editing'}
          style={{
            all: 'unset',
            cursor: canSend && phase === 'editing' ? 'pointer' : 'not-allowed',
            display: 'block', width: '100%', boxSizing: 'border-box',
            padding: 16,
            background: canSend ? X.RED : X.LINE,
            color: canSend ? '#fff' : X.INK3,
            borderRadius: 14, textAlign: 'center',
            fontSize: 15, fontWeight: 800, letterSpacing: 0.4,
            boxShadow: canSend ? '0 8px 24px rgba(225,29,46,0.3)' : 'none',
            transition: 'background 200ms ease-out, color 200ms ease-out',
          }}
        >
          {phase === 'sending' ? t('sos.symp.sending') : t('sos.symp.send')}
        </button>
      </div>

      {/* Sent confirmation overlay */}
      {phase === 'sent' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(14,15,18,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 20, padding: 22,
        }}>
          <div style={{
            width: '100%', maxWidth: 360,
            background: '#fff', borderRadius: 22,
            padding: '26px 22px 22px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
            animation: 'll-call-pop 280ms ease-out',
            textAlign: 'center',
          }}>
            <div style={{ width: 60, height: 60, borderRadius: 30, background: X.GREEN_BG, color: X.GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <Icon name="check" size={28} color={X.GREEN} stroke={3}/>
            </div>
            <div style={{ marginTop: 14, fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.3 }}>{t('sos.symp.sent.title')}</div>
            <div style={{ marginTop: 6, fontSize: 13, color: X.INK2, lineHeight: 1.5 }}>{t('sos.symp.sent.body')}</div>
            <button
              onClick={goBack}
              style={{
                all: 'unset', cursor: 'pointer',
                display: 'block', width: '100%', boxSizing: 'border-box',
                marginTop: 18, padding: '14px 16px',
                background: X.INK, color: '#fff',
                borderRadius: 12, textAlign: 'center',
                fontSize: 14, fontWeight: 700, letterSpacing: 0.3,
              }}
            >
              {t('sos.symp.sent.done')}
            </button>
          </div>
        </div>
      )}
    </Screen>
  );
}
