'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Screen } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';
import { useT } from '@/components/lifelink/i18n';
import { markDispatchConfirmed, startSosTimer } from '@/components/lifelink/sosTimer';

type Scenario = 'cardiac' | 'choking' | 'bleeding';

type ScenarioConfig = {
  // i18n key prefix; concrete strings are at sr.scen.<id>.{label,kicker,title,rhythm,rhythmSub,beat.title,beat.sub,step1.t,...}
  bpm: number; // 0 = no metronome → switch to pressure timer
  primaryAction: 'cough' | 'thrust' | 'pressure';
  beatPalette: { ring: string; coreFrom: string; coreTo: string };
  steps: { icon: 'door' | 'pill' | 'user' | 'wind' | 'mic' | 'shield'; tKey: string; sKey: string }[];
};

const SCENARIOS: Record<Scenario, ScenarioConfig> = {
  cardiac: {
    bpm: 30,
    primaryAction: 'cough',
    beatPalette: { ring: X.RED, coreFrom: X.RED, coreTo: X.RED_DEEP },
    steps: [
      { icon: 'door', tKey: 'sr.scen.cardiac.step1.t', sKey: 'sr.scen.cardiac.step1.s' },
      { icon: 'pill', tKey: 'sr.scen.cardiac.step2.t', sKey: 'sr.scen.cardiac.step2.s' },
      { icon: 'user', tKey: 'sr.scen.cardiac.step3.t', sKey: 'sr.scen.cardiac.step3.s' },
    ],
  },
  choking: {
    bpm: 40,
    primaryAction: 'thrust',
    beatPalette: { ring: X.AMBER, coreFrom: X.AMBER, coreTo: '#B05E1A' },
    steps: [
      { icon: 'door', tKey: 'sr.scen.choking.step1.t', sKey: 'sr.scen.choking.step1.s' },
      { icon: 'wind', tKey: 'sr.scen.choking.step2.t', sKey: 'sr.scen.choking.step2.s' },
      { icon: 'mic',  tKey: 'sr.scen.choking.step3.t', sKey: 'sr.scen.choking.step3.s' },
    ],
  },
  bleeding: {
    bpm: 0, // pressure timer instead of metronome
    primaryAction: 'pressure',
    beatPalette: { ring: X.RED, coreFrom: X.RED, coreTo: X.RED_DEEP },
    steps: [
      { icon: 'door',   tKey: 'sr.scen.bleeding.step1.t', sKey: 'sr.scen.bleeding.step1.s' },
      { icon: 'shield', tKey: 'sr.scen.bleeding.step2.t', sKey: 'sr.scen.bleeding.step2.s' },
      { icon: 'user',   tKey: 'sr.scen.bleeding.step3.t', sKey: 'sr.scen.bleeding.step3.s' },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Custom red banner — different copy from the global EmergencyBanner. Uses
// the same bleed-up pattern so the red bg fills the iPhone safe-area.
function SelfRescueBanner({ elapsed }: { elapsed: number }) {
  const { t } = useT();
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return (
    <div style={{
      position: 'absolute',
      top: 'calc(0px - var(--ll-safe-top, 0px))',
      left: 0, right: 0,
      background: X.RED, color: '#fff',
      padding: 'var(--ll-safe-top, 14px) 12px 8px',
      // Match .ll-stage's border-radius (44px) so the banner stays inside the
      // rounded screen even if the stage's overflow-hidden clipping fails to
      // repaint cleanly during scroll/layout shifts (intermittent browser bug).
      borderTopLeftRadius: 44, borderTopRightRadius: 44,
      display: 'flex', alignItems: 'center', gap: 8, zIndex: 10,
    }}>
      <Link href="/" aria-label="Back" style={{
        textDecoration: 'none',
        width: 32, height: 32, borderRadius: 16,
        background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.28)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name="chevron-right" size={18} color="#fff" stroke={2.6} style={{ transform: 'rotate(180deg)' }}/>
      </Link>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <span className="ll-blink" style={{ width: 6, height: 6, borderRadius: 3, background: '#fff' }}/>
        <span style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.6, fontWeight: 700 }}>
          {t('sr.banner', { time: `${mm}:${ss}` })}
        </span>
      </div>
      <div style={{
        padding: '4px 10px', borderRadius: 999,
        background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.35)',
        fontSize: 10, fontWeight: 800, fontFamily: FONT.mono, letterSpacing: 1,
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {t('sr.banner.alone')}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function AutoDispatchCard({
  phase, alerted, closestDist, etaMin,
}: {
  phase: 'countdown' | 'dialing' | 'dispatched';
  alerted: number;
  closestDist: string;
  etaMin: number;
}) {
  const { t } = useT();
  const dispatched = phase === 'dispatched';
  return (
    <div style={{ background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14, overflow: 'hidden' }}>
      {/* 911 row */}
      <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${X.LINE2}` }}>
        <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
          {dispatched && (
            <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: `1.5px solid ${X.GREEN}55`, animation: 'll-pulse-ring 1.8s ease-out infinite' }}/>
          )}
          <div style={{ width: 32, height: 32, borderRadius: 16, background: dispatched ? X.GREEN : X.AMBER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="phone" size={15} color="#fff" stroke={2.6}/>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {dispatched ? t('sr.disp.connected') : t('sr.disp.dialing')}
          </div>
          <div style={{ fontSize: 11, color: X.INK2 }}>
            {dispatched ? t('sr.disp.connected.sub') : t('sr.disp.dialing.sub')}
          </div>
        </div>
        <div style={{ fontSize: 10, fontFamily: FONT.mono, color: dispatched ? X.GREEN : X.AMBER, fontWeight: 700, letterSpacing: 0.6 }}>
          {dispatched ? t('sr.disp.connected.tag') : t('sr.disp.dialing.tag')}
        </div>
      </div>

      {/* Volunteers row */}
      <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${X.LINE2}` }}>
        <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
          {dispatched && alerted < 5 && (
            <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: `1.5px solid ${X.BLUE}55`, animation: 'll-pulse-ring 1.8s ease-out infinite' }}/>
          )}
          <div style={{ width: 32, height: 32, borderRadius: 16, background: X.BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="user" size={14} color="#fff" stroke={2}/>
          </div>
          <div style={{
            position: 'absolute', top: -4, right: -6, minWidth: 18, height: 18,
            padding: '0 5px', borderRadius: 9,
            background: '#fff', color: X.BLUE, fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT.mono, border: `2px solid ${X.LINE2}`,
          }}>{alerted}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {alerted === 0 ? t('sr.disp.helpersAlerting') :
             alerted === 1 ? t('sr.disp.helperOne', { n: alerted }) :
                             t('sr.disp.helpersMany', { n: alerted })}
          </div>
          <div style={{ fontSize: 11, color: X.INK2 }}>
            {dispatched && alerted > 0 ? t('sr.disp.closest', { n: etaMin }) : t('sr.disp.helpersWaiting')}
          </div>
        </div>
        <div style={{ fontSize: 10, fontFamily: FONT.mono, color: X.BLUE, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{closestDist}</div>
      </div>

      {/* Address row */}
      <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 16, background: X.RED_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="map-pin" size={14} color={X.RED} stroke={2.2}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{t('sr.disp.address')}</div>
          <div style={{ fontSize: 11, color: X.INK2, fontFamily: FONT.mono }}>{t('sr.disp.gps')}</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function VitalsStrip({ hr, spo2 }: { hr: number; spo2: number }) {
  const { t } = useT();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
      <div style={{ background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 12, padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, fontFamily: FONT.mono, letterSpacing: 1.2, color: X.INK2, fontWeight: 700 }}>
          <Icon name="watch" size={11} color={X.INK2} stroke={2}/>
          {t('sr.vitals.hr')}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: FONT.display, color: X.RED, letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums' }}>{hr}</div>
          <div style={{ fontSize: 11, color: X.INK2, fontWeight: 600 }}>{t('sr.vitals.hr.unit')}</div>
          <div style={{ marginLeft: 'auto', fontSize: 9, fontFamily: FONT.mono, color: X.RED, fontWeight: 700 }}>{t('sr.vitals.hr.high')}</div>
        </div>
      </div>
      <div style={{ background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 12, padding: '10px 12px' }}>
        <div style={{ fontSize: 9, fontFamily: FONT.mono, letterSpacing: 1.2, color: X.INK2, fontWeight: 700 }}>{t('sr.vitals.spo2')}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: FONT.display, color: X.AMBER, letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums' }}>{spo2}</div>
          <div style={{ fontSize: 11, color: X.INK2, fontWeight: 600 }}>%</div>
          <div style={{ marginLeft: 'auto', fontSize: 9, fontFamily: FONT.mono, color: X.AMBER, fontWeight: 700 }}>{t('sr.vitals.spo2.low')}</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function RhythmMetronome({
  bpm, voiceOn, scenario,
}: {
  bpm: number;
  voiceOn: boolean;
  scenario: Scenario;
}) {
  const { t } = useT();
  const [tick, setTick] = React.useState(0);
  const [pulsing, setPulsing] = React.useState(false);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const intervalMs = bpm > 0 ? Math.round(60000 / bpm) : 2000;
  const palette = SCENARIOS[scenario].beatPalette;

  React.useEffect(() => {
    if (bpm <= 0) return;
    const id = setInterval(() => {
      setTick(tk => tk + 1);
      setPulsing(true);
      setTimeout(() => setPulsing(false), 320);
      try {
        const Ctx = (window as unknown as {
          AudioContext?: typeof AudioContext;
          webkitAudioContext?: typeof AudioContext;
        }).AudioContext ?? (window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') void ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(voiceOn ? 0.15 : 0, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } catch {
        /* ignore audio errors */
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, bpm, voiceOn]);

  if (bpm <= 0) return <PressureTimer scenario={scenario}/>;

  const beatTitle = t(`sr.scen.${scenario}.beat.title`);
  const beatSub   = t(`sr.scen.${scenario}.beat.sub`);
  const rhythm    = t(`sr.scen.${scenario}.rhythm`);
  const rhythmSub = t(`sr.scen.${scenario}.rhythmSub`);
  const countLabel = scenario === 'choking'
    ? t('sr.rhythm.thrustCount', { n: tick })
    : t('sr.rhythm.coughCount',  { n: tick });

  return (
    <div style={{ background: '#0B1018', borderRadius: 18, padding: '18px 16px 20px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: FONT.mono, letterSpacing: 1.4, color: '#fff', opacity: 0.55, fontWeight: 700 }}>{t('sr.rhythm.kicker')}</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: FONT.display, marginTop: 2, letterSpacing: -0.3 }}>{rhythm}</div>
        </div>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, color: '#fff', opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>
          {t('sr.rhythm.bpm', { n: bpm })}
        </div>
      </div>

      <div style={{ position: 'relative', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
        {/* radar ring on each beat */}
        <div
          key={'r' + tick}
          style={{
            position: 'absolute', width: 120, height: 120, borderRadius: 60,
            border: `2px solid ${palette.ring}`, opacity: 0.35,
            animation: pulsing ? `ll-radar ${intervalMs}ms ease-out` : 'none',
          }}
        />
        <div style={{
          width: 120, height: 120, borderRadius: 60,
          background: `radial-gradient(circle at 30% 30%, ${palette.coreFrom}, ${palette.coreTo})`,
          color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 12px 40px ${palette.ring}80, inset 0 -6px 16px rgba(0,0,0,0.22)`,
          transform: pulsing ? 'scale(1.18)' : 'scale(1)',
          transition: pulsing ? 'transform 90ms ease-out' : 'transform 280ms cubic-bezier(0.4, 0, 1, 1)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.4, fontFamily: FONT.display }}>{beatTitle}</div>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, opacity: 0.85, marginTop: 4 }}>{beatSub}</div>
        </div>
      </div>

      <div style={{ marginTop: 6, fontSize: 12, color: '#fff', opacity: 0.7, textAlign: 'center', lineHeight: 1.4 }}>
        {rhythmSub}
      </div>

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: FONT.mono, color: '#fff', opacity: 0.55, letterSpacing: 0.8 }}>
        <span>{countLabel}</span>
        <span>{voiceOn ? t('sr.rhythm.voiceOn') : t('sr.rhythm.voiceOff')}</span>
      </div>
    </div>
  );
}

function PressureTimer({ scenario }: { scenario: Scenario }) {
  const { t } = useT();
  const [secs, setSecs] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const target = 600; // 10 min
  const pct = Math.min(100, (secs / target) * 100);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return (
    <div style={{ background: '#0B1018', borderRadius: 18, padding: '18px 16px 20px', color: '#fff' }}>
      <div style={{ fontSize: 10, fontFamily: FONT.mono, letterSpacing: 1.4, color: '#fff', opacity: 0.55, fontWeight: 700 }}>{t('sr.rhythm.kicker')}</div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: FONT.display, marginTop: 2, letterSpacing: -0.3 }}>{t(`sr.scen.${scenario}.rhythm`)}</div>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 54, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -2, color: X.RED, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{mm}:{ss}</div>
        <div style={{ fontSize: 12, color: '#fff', opacity: 0.55, fontFamily: FONT.mono }}>{t('sr.rhythm.targetSuffix')}</div>
      </div>
      <div style={{ marginTop: 14, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: X.RED, transition: 'width 800ms linear' }}/>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: '#fff', opacity: 0.7, lineHeight: 1.4 }}>
        {t(`sr.scen.${scenario}.rhythmSub`)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function StepRow({
  icon, title, sub, done, onToggle, isLast,
}: {
  icon: 'door' | 'pill' | 'user' | 'wind' | 'mic' | 'shield';
  title: string;
  sub: string;
  done: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        all: 'unset', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 12px',
        width: '100%', boxSizing: 'border-box',
        borderBottom: isLast ? 'none' : `1px solid ${X.LINE2}`,
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: done ? X.GREEN_BG : X.BG,
        color: done ? X.GREEN : X.INK,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name={done ? 'check' : icon} size={18} color={done ? X.GREEN : X.INK} stroke={done ? 3 : 2}/>
      </div>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: X.INK,
          textDecoration: done ? 'line-through' : 'none',
          opacity: done ? 0.55 : 1,
        }}>{title}</div>
        <div style={{ fontSize: 11, color: X.INK2, marginTop: 1 }}>{sub}</div>
      </div>
      <div style={{
        width: 22, height: 22, borderRadius: 11,
        border: `1.5px solid ${done ? X.GREEN : X.LINE}`,
        background: done ? X.GREEN : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {done && <Icon name="check" size={12} color="#fff" stroke={3.5}/>}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Auto-trigger countdown — overlay shown on entry, bypassed via cancel/trigger.
function AutoTriggerOverlay({
  secondsLeft, scenario, onCancel, onTriggerNow,
}: {
  secondsLeft: number;
  scenario: Scenario;
  onCancel: () => void;
  onTriggerNow: () => void;
}) {
  const { t } = useT();
  const scenarioLabel = t(`sr.scen.${scenario}.label`);
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(11,16,24,0.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 30, padding: 22,
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: '#fff', borderRadius: 22,
        padding: '24px 22px 20px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
        animation: 'll-call-pop 280ms ease-out',
        textAlign: 'center',
      }}>
        <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 48, border: `2px solid ${X.RED}33`, animation: 'll-pulse-ring 1.6s ease-out infinite' }}/>
          <div style={{
            position: 'absolute', inset: 8, borderRadius: 40,
            background: `radial-gradient(circle at 30% 30%, ${X.RED}, ${X.RED_DEEP})`,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 30px rgba(225,29,46,0.45)',
          }}>
            <div style={{ fontSize: 42, fontWeight: 800, fontFamily: FONT.display, fontVariantNumeric: 'tabular-nums', letterSpacing: -1 }}>{secondsLeft}</div>
          </div>
        </div>
        <div style={{ marginTop: 18, fontSize: 11, fontFamily: FONT.mono, color: X.RED, fontWeight: 700, letterSpacing: 1.4 }}>
          {t('sr.countdown.label', { n: secondsLeft })}
        </div>
        <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.3, lineHeight: 1.2 }}>
          {t('sr.countdown.title')}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: X.INK2, lineHeight: 1.5 }}>
          {t('sr.countdown.body', { scenario: scenarioLabel })}
        </div>
        <button onClick={onTriggerNow} style={{
          all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box',
          marginTop: 16, padding: 14,
          background: X.RED, color: '#fff', borderRadius: 12,
          textAlign: 'center', fontSize: 14, fontWeight: 800, letterSpacing: 0.4,
          boxShadow: '0 8px 24px rgba(225,29,46,0.3)',
        }}>{t('sr.countdown.triggerNow')}</button>
        <button onClick={onCancel} style={{
          all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box',
          marginTop: 8, padding: '12px 14px',
          background: '#fff', border: `1.5px solid ${X.LINE}`,
          color: X.INK2, borderRadius: 12,
          textAlign: 'center', fontSize: 13, fontWeight: 700,
        }}>{t('sr.countdown.cancel')}</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PAGE
function deriveAlerted(s: number): number {
  if (s < 2) return 1;
  if (s < 5) return 2;
  if (s < 9) return 3;
  if (s < 14) return 4;
  return 5;
}
function deriveClosestDist(s: number): string {
  if (s < 5) return '0.5 mi';
  if (s < 12) return '0.4 mi';
  if (s < 20) return '0.3 mi';
  return '0.2 mi';
}
function deriveEtaMin(s: number): number {
  if (s < 10) return 4;
  if (s < 25) return 3;
  return 2;
}

const VITAL_BASES: Record<Scenario, { hr: number; spo2: number }> = {
  cardiac:  { hr: 132, spo2: 91 },
  choking:  { hr: 118, spo2: 86 },
  bleeding: { hr: 110, spo2: 94 },
};

export default function SelfRescuePage() {
  const router = useRouter();
  const { t } = useT();
  const [scenario, setScenario] = React.useState<Scenario>('cardiac');
  const cfg = SCENARIOS[scenario];

  // Elapsed clock — total time on this page.
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Activate the global SOS / dispatch state so the cross-page volunteer
  // accept toast (HelperToast) and other dispatch-driven UI fire on the
  // alone-and-conscious flow too — without this the toast was silent here
  // because the patient never went through /sos/dispatch/*.
  React.useEffect(() => {
    startSosTimer();
    markDispatchConfirmed();
  }, []);

  // 5 s auto-dispatch countdown on mount + when scenario changes, then a brief
  // 'dialing' phase (amber, "Dialing 911...") before the line goes 'dispatched'
  // (green, "Connected") — so the call status visibly progresses instead of
  // jumping straight to connected.
  const [phase, setPhase] = React.useState<'countdown' | 'dialing' | 'dispatched'>('countdown');
  const [countdownLeft, setCountdownLeft] = React.useState(5);
  React.useEffect(() => {
    setPhase('countdown');
    setCountdownLeft(5);
  }, [scenario]);
  React.useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownLeft <= 0) { setPhase('dialing'); return; }
    const id = setTimeout(() => setCountdownLeft(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdownLeft, phase]);
  React.useEffect(() => {
    if (phase !== 'dialing') return;
    const id = setTimeout(() => setPhase('dispatched'), 2500);
    return () => clearTimeout(id);
  }, [phase]);

  // Helpers fan-out / closest distance / ETA — driven by seconds since dispatch confirmed.
  const dispatchSec = phase === 'dispatched' ? Math.max(0, elapsed - 7) : 0;
  const alerted = phase === 'dispatched' ? deriveAlerted(dispatchSec) : 0;
  const closestDist = deriveClosestDist(dispatchSec);
  const etaMin = deriveEtaMin(dispatchSec);

  // Simulated vitals — drift in a small range around the scenario baseline.
  const [vitalsTick, setVitalsTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setVitalsTick(p => p + 1), 1500);
    return () => clearInterval(id);
  }, []);
  const base = VITAL_BASES[scenario];
  const hr   = base.hr   + (vitalsTick % 5) - 2;
  const spo2 = base.spo2 + (vitalsTick % 3) - 1;

  // Step checklist — reset whenever scenario changes.
  const [stepDone, setStepDone] = React.useState<boolean[]>(() => cfg.steps.map(() => false));
  React.useEffect(() => { setStepDone(SCENARIOS[scenario].steps.map(() => false)); }, [scenario]);
  const toggleStep = (i: number) =>
    setStepDone(prev => prev.map((v, idx) => idx === i ? !v : v));

  return (
    <Screen bg={X.BG} padTop={0}>
      <SelfRescueBanner elapsed={elapsed}/>

      <div className="ll-scroll-hide" style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 80,
        overflowY: 'auto',
        padding: '62px 20px 20px',
        boxSizing: 'border-box',
      }}>
        {/* status kicker */}
        <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.RED, letterSpacing: 1.4, fontWeight: 700 }}>
          {t(`sr.scen.${scenario}.kicker`)}
        </div>
        <div style={{ marginTop: 4, fontSize: 24, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.5, lineHeight: 1.05 }}>
          {t(`sr.scen.${scenario}.title`)}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: X.INK2, lineHeight: 1.45 }}>
          {t('sr.intro')}
        </div>

        {/* Scenario picker — quick chip row so the patient can correct what's happening */}
        <div style={{ marginTop: 14, fontSize: 10, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2, fontWeight: 700 }}>
          {t('sr.picker.section')}
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['cardiac', 'choking', 'bleeding'] as Scenario[]).map(s => {
            const on = scenario === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setScenario(s)}
                aria-pressed={on}
                style={{
                  all: 'unset', cursor: 'pointer',
                  padding: '8px 12px', borderRadius: 999,
                  fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${on ? X.RED : X.LINE}`,
                  background: on ? X.RED : '#fff',
                  color: on ? '#fff' : X.INK,
                  transition: 'background 160ms ease-out, color 160ms ease-out, border-color 160ms ease-out',
                }}
              >
                {t(`sr.scen.${s}.label`)}
              </button>
            );
          })}
        </div>

        {/* dispatch card */}
        <div style={{ marginTop: 14 }}>
          <AutoDispatchCard
            phase={phase}
            alerted={alerted}
            closestDist={closestDist}
            etaMin={etaMin}
          />
        </div>

        {/* vitals from Apple Watch */}
        <VitalsStrip hr={hr} spo2={spo2}/>

        {/* primary self-rescue rhythm (cough / thrust / pressure) */}
        <div style={{ marginTop: 14 }}>
          <RhythmMetronome bpm={cfg.bpm} voiceOn={true} scenario={scenario}/>
        </div>

        {/* checklist */}
        <div style={{ marginTop: 14, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2, fontWeight: 700 }}>
          {t('sr.checklist')}
        </div>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14, overflow: 'hidden' }}>
          {cfg.steps.map((s, i) => (
            <StepRow
              key={`${scenario}-${i}`}
              icon={s.icon}
              title={t(s.tKey)}
              sub={t(s.sKey)}
              done={stepDone[i] ?? false}
              onToggle={() => toggleStep(i)}
              isLast={i === cfg.steps.length - 1}
            />
          ))}
        </div>

        {/* live audio with dispatcher */}
        <div style={{ marginTop: 12, padding: 14, background: X.GREEN_BG, border: `1px solid ${X.GREEN}33`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 42, height: 42, flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `1.5px solid ${X.GREEN}55`, animation: 'll-pulse-ring 1.8s ease-out infinite' }}/>
            <div style={{ width: 42, height: 42, borderRadius: 21, background: X.GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="mic" size={18} color="#fff" stroke={2.2}/>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: X.GREEN }}>{t('sr.speaker.title')}</div>
            <div style={{ fontSize: 11, color: X.GREEN, opacity: 0.8, fontFamily: FONT.mono }}>{t('sr.speaker.sub')}</div>
          </div>
        </div>

        <div style={{ height: 12 }}/>
      </div>

      {/* Sticky bottom CTAs */}
      <div style={{ position: 'absolute', left: 20, right: 20, bottom: 18, display: 'flex', gap: 10, zIndex: 5 }}>
        <button
          type="button"
          onClick={() => router.push('/sos/map?from=conscious')}
          style={{
            all: 'unset', cursor: 'pointer', flex: 1, padding: '14px 12px',
            background: '#fff', border: `1.5px solid ${X.LINE}`, color: X.INK,
            borderRadius: 14, textAlign: 'center', fontSize: 13, fontWeight: 700,
          }}
        >
          {t('sr.cta.map')}
        </button>
        <button
          type="button"
          onClick={() => router.push('/')}
          style={{
            all: 'unset', cursor: 'pointer', flex: 2, padding: 14,
            background: X.INK, color: '#fff', borderRadius: 14,
            textAlign: 'center', fontSize: 14, fontWeight: 800, letterSpacing: 0.3,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}
        >
          {t('sr.cta.endSos')}
        </button>
      </div>

      {phase === 'countdown' && countdownLeft > 0 && (
        <AutoTriggerOverlay
          secondsLeft={countdownLeft}
          scenario={scenario}
          onCancel={() => { setPhase('dialing'); setCountdownLeft(0); }}
          onTriggerNow={() => { setPhase('dialing'); setCountdownLeft(0); }}
        />
      )}
    </Screen>
  );
}
