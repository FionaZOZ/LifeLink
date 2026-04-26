'use client';
import * as React from 'react';
import { Screen, TopBar } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';
import { useLang, LANG_OPTIONS, useT, type Lang } from '@/components/lifelink/i18n';

export default function LanguagePage() {
  const [lang, setLang] = useLang();
  const { t } = useT();

  const pick = (id: Lang) => {
    setLang(id);
    // Stay on this page so the user can see the immediate translation effect.
  };

  return (
    <Screen>
      <TopBar title={t('lang.title')} leading="back" backHref="/profile"/>
      <div className="ll-scroll-hide" style={{ padding: '8px 22px 24px', overflow: 'auto', height: '100%', boxSizing: 'border-box' }}>
        <div style={{ marginTop: 6, fontSize: 13, color: X.INK2, lineHeight: 1.5 }}>
          {t('lang.intro')}
        </div>

        <div style={{ marginTop: 18, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
          {LANG_OPTIONS.map((opt, i, a) => {
            const selected = opt.id === lang;
            return (
              <button
                key={opt.id}
                onClick={() => pick(opt.id)}
                style={{
                  all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box',
                  padding: 16, borderBottom: i < a.length - 1 ? `1px solid ${X.LINE}` : 'none',
                  background: selected ? X.RED_BG : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: selected ? X.RED : X.INK }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: X.INK2, marginTop: 2, fontFamily: FONT.mono, letterSpacing: 0.4 }}>{opt.sub}</div>
                  </div>
                  {selected && <Icon name="check" size={20} color={X.RED} stroke={2.6}/>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Screen>
  );
}
