'use client';
import * as React from 'react';
import { Icon } from './Icon';
import { X, FONT } from './tokens';
import {
  useCallState, minimizeCall, expandCall, endCall, setCallPos, setCallTucked,
  fmtCallElapsed, derivePhase, type CallPhase, type TuckedSide,
} from './callState';

type Participant = { letter: string; name: string; role: string; color: string };

const ELEANOR: Participant = { letter: 'E', name: 'Eleanor T.', role: '67 · pacemaker',  color: X.RED };
const YOU:     Participant = { letter: 'M', name: 'You',         role: 'Marcus',          color: X.INK };
const ALEX:    Participant = { letter: 'A', name: 'Alex',        role: 'direct route',    color: X.GREEN };
const SARAH:   Participant = { letter: 'S', name: 'Sarah',       role: 'with AED',        color: X.AMBER };

const STAGE_MAX = 440;
const WIDGET_SIZE = 64; // square widget
const TUCK_VISIBLE = 14; // px of widget left visible when tucked at edge

// ─────────────────────────────────────────────────────────────────────────
export function CallScreen() {
  const { mode } = useCallState();
  if (mode === 'closed') return null;
  if (mode === 'fullscreen' || mode === 'minimizing') {
    return <FullscreenCall shrinking={mode === 'minimizing'}/>;
  }
  return <MinimizedCallWidget/>;
}

// ─────────────────────────────────────────────────────────────────────────
// Fullscreen call view (also handles shrink-to-widget animation)
// ─────────────────────────────────────────────────────────────────────────
function FullscreenCall({ shrinking }: { shrinking: boolean }) {
  const { startedAt, pos } = useCallState();
  const elapsed = useElapsed(startedAt);
  const phase = derivePhase(elapsed);

  const statusLabel =
    phase === 'ringing' ? 'CALLING…'
    : phase === 'solo'  ? `CONNECTED · ${fmtCallElapsed(elapsed)}`
    :                     `GROUP CALL · ${fmtCallElapsed(elapsed)}`;

  // Aim the shrink at the widget's stored center so the page collapses
  // *into* where the floating box will appear.
  const widgetCx = pos.x + WIDGET_SIZE / 2;
  const widgetCy = pos.y + WIDGET_SIZE / 2;

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 60,
        background: 'linear-gradient(180deg, #1A2536 0%, #0E0F12 100%)',
        color: '#fff', overflow: 'hidden',
        transformOrigin: `${widgetCx}px ${widgetCy}px`,
        transform: shrinking ? 'scale(0.06)' : 'none',
        opacity: shrinking ? 0 : 1,
        transition: 'transform 280ms cubic-bezier(0.5, 0, 0.6, 1), opacity 280ms ease-in',
      }}
    >
      {/* top bar */}
      <div style={{ position: 'absolute', top: 18, left: 16, right: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={minimizeCall}
          aria-label="Minimize call to floating window"
          style={{
            all: 'unset', cursor: 'pointer',
            width: 36, height: 36, borderRadius: 12,
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="pip" size={18} color="#fff" stroke={2}/>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.6, opacity: 0.75, fontWeight: 700 }}>
          {statusLabel}
        </div>
        <div style={{ width: 36 }}/>
      </div>

      {/* hero — Eleanor stays primary across all phases */}
      <PrimaryHero phase={phase}/>

      {/* secondary participants — appear as call grows */}
      <SecondaryRow phase={phase}/>

      {/* hint while solo */}
      {phase === 'solo' && (
        <div style={{
          position: 'absolute', bottom: 156, left: 0, right: 0,
          textAlign: 'center', fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1, opacity: 0.55,
        }}>
          Group is open · Alex and Sarah can join
        </div>
      )}

      {/* bottom controls — all three the same size */}
      <div style={{
        position: 'absolute', bottom: 38, left: 0, right: 0,
        display: 'flex', gap: 22, justifyContent: 'center', alignItems: 'center',
      }}>
        <CtrlButton aria-label="Mute">
          <Icon name="mic" size={22} color="#fff" stroke={2}/>
        </CtrlButton>
        <CtrlButton onClick={endCall} aria-label="End call" red>
          <Icon name="phone" size={24} color="#fff" stroke={2.4} style={{ transform: 'rotate(135deg)' }}/>
        </CtrlButton>
        <CtrlButton aria-label="Speaker">
          <Icon name="volume" size={22} color="#fff" stroke={2}/>
        </CtrlButton>
      </div>
    </div>
  );
}

function CtrlButton({
  children, onClick, red = false, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { red?: boolean }) {
  return (
    <button
      onClick={onClick}
      {...rest}
      style={{
        all: 'unset', cursor: 'pointer',
        width: 60, height: 60, borderRadius: 30,
        background: red ? X.RED : 'rgba(255,255,255,0.14)',
        border: red ? 'none' : '1px solid rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: red ? '0 8px 24px rgba(225,29,46,0.5)' : 'none',
      }}
    >
      {children}
    </button>
  );
}

function PrimaryHero({ phase }: { phase: CallPhase }) {
  const ringing = phase === 'ringing';
  const size = ringing ? 132 : 100;
  const top = ringing ? 130 : 110;

  return (
    <div style={{ position: 'absolute', top, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'top 280ms ease-out' }}>
      <div style={{ position: 'relative', width: size, height: size, transition: 'width 280ms ease-out, height 280ms ease-out' }}>
        {ringing && (
          <>
            <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: '2px solid rgba(225,29,46,0.35)', animation: 'll-pulse-ring 2s ease-out infinite' }}/>
            <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: '2px solid rgba(225,29,46,0.5)', animation: 'll-pulse-ring 2s ease-out infinite 0.6s' }}/>
          </>
        )}
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: ELEANOR.color, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: ringing ? 46 : 36, fontFamily: FONT.display,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 0 3px rgba(255,255,255,0.1)',
        }}>{ELEANOR.letter}</div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.3, marginTop: 14 }}>{ELEANOR.name}</div>
      <div style={{ fontSize: 12, opacity: 0.65, fontFamily: FONT.mono, letterSpacing: 0.6, marginTop: 2 }}>{ELEANOR.role}</div>
    </div>
  );
}

function SecondaryRow({ phase }: { phase: CallPhase }) {
  if (phase === 'ringing') return null;
  const others: { p: Participant; joined: boolean }[] = [
    { p: YOU,   joined: true }, // Marcus joined as soon as solo phase starts
    { p: ALEX,  joined: phase === 'group' },
    { p: SARAH, joined: phase === 'group' },
  ];

  return (
    <div style={{ position: 'absolute', top: 350, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 22 }}>
      {others.map(({ p, joined }, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: joined ? 1 : 0.45, transition: 'opacity 280ms ease-out' }}>
          <div style={{ position: 'relative', width: 52, height: 52 }}>
            {!joined && (
              <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,0.4)', animation: 'll-pulse-ring 2s ease-out infinite' }}/>
            )}
            <div style={{
              width: '100%', height: '100%', borderRadius: 26,
              background: p.color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 18, fontFamily: FONT.display,
              boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
            }}>{p.letter}</div>
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 14, height: 14, borderRadius: 7,
              background: joined ? X.GREEN : X.AMBER,
              border: '2px solid #0E0F12',
            }}/>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>{p.name === 'You' ? 'You' : p.name}</div>
          <div style={{ fontSize: 9, opacity: 0.6, fontFamily: FONT.mono }}>{joined ? 'in call' : 'joining…'}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Minimized floating widget — square box, draggable, edge-tucks
// ─────────────────────────────────────────────────────────────────────────
const DRAG_THRESHOLD = 5;

function MinimizedCallWidget() {
  const { pos, startedAt, tucked } = useCallState();
  const elapsed = useElapsed(startedAt);
  const stageW = useStageWidth();
  const [dragging, setDragging] = React.useState(false);

  const dragRef = React.useRef({
    startX: 0, startY: 0, origX: 0, origY: 0, moved: false, pointerId: -1,
  });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      origX: pos.x, origY: pos.y,
      moved: false, pointerId: e.pointerId,
    };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!dragRef.current.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      dragRef.current.moved = true;
    }
    if (dragRef.current.moved) {
      setCallPos(dragRef.current.origX + dx, dragRef.current.origY + dy);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== e.pointerId) return;
    const wasTap = !dragRef.current.moved;
    dragRef.current.pointerId = -1;
    setDragging(false);

    if (wasTap) {
      // tap on tucked → un-tuck; tap on visible → expand to fullscreen
      if (tucked === 'left') {
        setCallTucked(null);
        setCallPos(8, pos.y);
      } else if (tucked === 'right') {
        setCallTucked(null);
        setCallPos(stageW - WIDGET_SIZE - 8, pos.y);
      } else {
        expandCall();
      }
      return;
    }

    // drag ended — decide tuck based on widget overlap with stage edges
    let nextSide: TuckedSide = null;
    if (pos.x <= 0) nextSide = 'left';
    else if (pos.x + WIDGET_SIZE >= stageW) nextSide = 'right';
    setCallTucked(nextSide);
    if (nextSide === 'left')  setCallPos(-WIDGET_SIZE + TUCK_VISIBLE, pos.y);
    if (nextSide === 'right') setCallPos(stageW - TUCK_VISIBLE, pos.y);
  };

  const transition = dragging ? 'none' : 'left 240ms ease-out, top 240ms ease-out';

  return (
    <div
      role="button"
      aria-label={tucked ? 'Tap to bring call window back · drag to move' : 'Tap to expand call · drag to move'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'absolute',
        left: pos.x, top: pos.y,
        width: WIDGET_SIZE, height: WIDGET_SIZE,
        zIndex: 60,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none', touchAction: 'none',
        background: '#fff',
        borderRadius: 16,
        border: `1px solid ${X.LINE}`,
        boxShadow: '0 10px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 4,
        transition,
        animation: 'll-call-pop 220ms ease-out',
      }}
    >
      <Icon name="phone" size={22} color={X.GREEN} stroke={2.4}/>
      <div style={{ fontSize: 12, fontWeight: 800, fontFamily: FONT.mono, letterSpacing: 0.4, color: X.GREEN }}>
        {fmtCallElapsed(elapsed)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────
function useElapsed(startedAt: number): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  return startedAt > 0 ? now - startedAt : 0;
}

function useStageWidth(): number {
  const [w, setW] = React.useState(STAGE_MAX);
  React.useEffect(() => {
    const measure = () => setW(Math.min(window.innerWidth, STAGE_MAX));
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return w;
}
