'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ensureBeatAudioUnlocked, playCompressionTick } from '@/lib/compressionBeatSound';

const IMG_HANDS_POSITION = '/cpr/hands-position.png';
const IMG_HANDS_POSING = '/cpr/hands-posing.png';
const IMG_AED_USE = '/cpr/aed-use-guide.png';

const TARGET_BPM = 110;
const MS_PER_BEAT = 60000 / TARGET_BPM;

const green = '#2ECC71';
const greenDark = '#0d3d2c';
const coral = '#F35B53';
const maroon = '#3D1A1D';
const maroonBorder = '#5c2a2e';
const cardBg = '#121f2d';
const textMuted = 'rgba(255,255,255,0.88)';
const headerRed = '#C8102E';

const feedbackRotating = [
  'Keep going.',
  'Stay with the beat.',
  'Good rhythm.',
  "You've got this—keep the pace.",
];

const BREATH_PAUSE_MS = 2000;

type CprStep = 'consent' | 'responsive' | 'breathing' | 'handPlacement' | 'handPosing' | 'compressions';

function formatMmSs(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function pillButton(base: React.CSSProperties): React.CSSProperties {
  return {
    ...base,
    border: 'none',
    borderRadius: '9999px',
    padding: '0.85rem 1.1rem',
    fontWeight: 700,
    fontSize: '0.92rem',
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'inherit',
  };
}

function CardiacLinkMark({ compact }: { compact?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.35rem',
        marginBottom: compact ? '0.5rem' : '0.75rem',
      }}
    >
      <span
        style={{
          fontWeight: 800,
          fontSize: compact ? '0.78rem' : '0.85rem',
          color: '#111',
          letterSpacing: '0.02em',
        }}
      >
        CARDIAC
      </span>
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '32px',
          background: '#C8102E',
          borderRadius: '6px',
          color: '#fff',
          fontWeight: 800,
          fontSize: '0.7rem',
        }}
      >
        CL
      </span>
      <span
        style={{
          fontWeight: 800,
          fontSize: compact ? '0.78rem' : '0.85rem',
          color: '#111',
          letterSpacing: '0.02em',
        }}
      >
        LINK
      </span>
    </div>
  );
}

function CprIllustrationImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      style={{
        display: 'block',
        width: '100%',
        height: 'auto',
        borderRadius: '8px',
        objectFit: 'contain',
        maxHeight: 'min(52vh, 320px)',
      }}
    />
  );
}

export default function CPRGuidance() {
  const router = useRouter();
  const [step, setStep] = useState<CprStep>('consent');
  const [countInSet, setCountInSet] = useState(0);
  const [setNumber, setSetNumber] = useState(1);
  const [totalCompressions, setTotalCompressions] = useState(0);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [compressionsPaused, setCompressionsPaused] = useState(false);
  const [showAedGuide, setShowAedGuide] = useState(false);
  const [beatFlash, setBeatFlash] = useState(0);
  const [inBreathWindow, setInBreathWindow] = useState(false);
  const prevCountInSetRef = useRef<number | null>(null);

  const handleEndEmergency = useCallback(() => {
    router.push('/emergency/complete');
  }, [router]);

  const handleAllowVoice = useCallback(async () => {
    await ensureBeatAudioUnlocked();
    setStep('responsive');
  }, []);

  useEffect(() => {
    if (step !== 'compressions') {
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step === 'compressions' && sessionStart === null) {
      setSessionStart(Date.now());
    }
  }, [step, sessionStart]);

  const sessionSeconds =
    step === 'compressions' && sessionStart !== null
      ? Math.floor((now - sessionStart) / 1000)
      : 0;
  const mm = String(Math.floor(sessionSeconds / 60)).padStart(2, '0');
  const ss = String(sessionSeconds % 60).padStart(2, '0');

  // Auto-navigate to assessment after 2 minutes
  useEffect(() => {
    if (sessionSeconds >= 120) {
      router.push('/emergency/assessment');
    }
  }, [sessionSeconds, router]);

  useEffect(() => {
    if (step !== 'compressions' || compressionsPaused || showAedGuide || inBreathWindow) {
      return;
    }
    const id = window.setInterval(() => {
      void playCompressionTick();
      setBeatFlash((f) => f + 1);
      setTotalCompressions((t) => t + 1);
      setCountInSet((c) => {
        const next = c + 1;
        if (next >= 30) {
          setSetNumber((s) => s + 1);
          return 0;
        }
        return next;
      });
    }, MS_PER_BEAT);
    return () => clearInterval(id);
  }, [step, compressionsPaused, showAedGuide, inBreathWindow]);

  // 30:2 cycle - pause for breaths
  useEffect(() => {
    if (step !== 'compressions') {
      prevCountInSetRef.current = null;
      return;
    }
    const prev = prevCountInSetRef.current;
    if (prev === 29 && countInSet === 0 && !inBreathWindow) {
      setInBreathWindow(true);
    }
    prevCountInSetRef.current = countInSet;
  }, [step, countInSet, inBreathWindow]);

  useEffect(() => {
    if (!inBreathWindow) {
      return;
    }
    const id = window.setTimeout(() => setInBreathWindow(false), BREATH_PAUSE_MS);
    return () => clearTimeout(id);
  }, [inBreathWindow]);

  const feedbackText = inBreathWindow
    ? 'Short pause. If you can, give two breaths; if not, the beat and count return in a moment.'
    : feedbackRotating[totalCompressions % feedbackRotating.length];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #0a111a 0%, #050a14 45%)',
        color: '#fff',
      }}
    >
      {/* Emergency Header */}
      <header
        style={{
          flexShrink: 0,
          background: headerRed,
          padding: '0.65rem 1rem 0.7rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.65rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
        }}
      >
        <span
          aria-hidden
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#fff',
            marginTop: '0.35rem',
            flexShrink: 0,
            boxShadow: '0 0 0 2px rgba(255,255,255,0.4)',
          }}
        />
        <div>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: '#fff',
              lineHeight: 1.2,
              textTransform: 'uppercase',
            }}
          >
            CPR live guidance — emergency mode
          </div>
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.95)',
              marginTop: '0.2rem',
            }}
          >
            Stay calm — follow each step
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '1rem 1rem 1.5rem',
          maxWidth: '28rem',
          width: '100%',
          margin: '0 auto',
          overflow: 'auto',
        }}
      >
        {/* Step 1: Consent / Voice Permission */}
        {step === 'consent' && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5rem 0',
            }}
          >
            <div
              style={{
                width: '100%',
                background: '#16222E',
                borderRadius: '20px',
                padding: '1.5rem 1.35rem 1.35rem',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
              }}
            >
              <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.15rem', fontWeight: 700 }}>
                Start CPR Guidance
              </h2>
              <p
                style={{
                  margin: '0 0 1.25rem',
                  color: textMuted,
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                }}
              >
                This will guide you through checking responsiveness, breathing, and performing chest
                compressions with audio feedback.
              </p>
              <button
                type="button"
                onClick={handleAllowVoice}
                style={pillButton({
                  background: green,
                  color: '#0a1620',
                })}
              >
                Begin Guidance
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Responsive Check */}
        {step === 'responsive' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                margin: '0.5rem 0 1rem',
                lineHeight: 1.25,
              }}
            >
              Check if the person responds.
            </h2>
            <ul
              style={{
                margin: '0 0 1.5rem',
                paddingLeft: '1.1rem',
                color: textMuted,
                fontSize: '0.95rem',
                lineHeight: 1.55,
              }}
            >
              <li>Tap their shoulders and shout: Are you okay?</li>
              <li>Is the person responsive?</li>
            </ul>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={handleEndEmergency}
                style={pillButton({
                  background: green,
                  color: greenDark,
                  margin: 0,
                })}
              >
                Yes — responsive
              </button>
              <button
                type="button"
                onClick={() => setStep('breathing')}
                style={pillButton({
                  background: coral,
                  color: '#fff',
                  margin: 0,
                })}
              >
                No response
              </button>
            </div>
            <button
              type="button"
              onClick={handleEndEmergency}
              style={pillButton({
                background: maroon,
                color: '#f5c2c4',
                border: `1px solid ${maroonBorder}`,
                marginTop: '0.75rem',
              })}
            >
              End Emergency
            </button>
          </div>
        )}

        {/* Step 3: Breathing Check */}
        {step === 'breathing' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                margin: '0.5rem 0 1rem',
                lineHeight: 1.25,
              }}
            >
              Check if they are breathing normally.
            </h2>
            <ul
              style={{
                margin: '0 0 1.5rem',
                paddingLeft: '1.1rem',
                color: textMuted,
                fontSize: '0.95rem',
                lineHeight: 1.55,
              }}
            >
              <li>Look at the chest. Listen for breathing.</li>
              <li>What do you see?</li>
            </ul>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={handleEndEmergency}
                style={pillButton({
                  background: green,
                  color: greenDark,
                  margin: 0,
                })}
              >
                Breathing normally
              </button>
              <button
                type="button"
                onClick={() => setStep('handPlacement')}
                style={pillButton({
                  background: coral,
                  color: '#fff',
                  margin: 0,
                })}
              >
                Not breathing / only gasping
              </button>
            </div>
            <button
              type="button"
              onClick={handleEndEmergency}
              style={pillButton({
                background: maroon,
                color: '#f5c2c4',
                border: `1px solid ${maroonBorder}`,
                marginTop: '0.75rem',
              })}
            >
              End Emergency
            </button>
          </div>
        )}

        {/* Step 4: Hand Placement */}
        {step === 'handPlacement' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0.5rem 0 0.75rem' }}>
              Hand placement
            </h2>
            <ul
              style={{
                margin: '0 0 1rem',
                paddingLeft: '1.1rem',
                color: textMuted,
                fontSize: '0.9rem',
                lineHeight: 1.5,
              }}
            >
              <li>Place the heel of your hand in the center of the chest</li>
              <li>Put your other hand on top, interlacing your fingers</li>
              <li>Keep your arms straight and your shoulders over your hands</li>
            </ul>
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                borderLeft: '5px solid #C8102E',
                borderRight: '5px solid #C8102E',
                padding: '1rem',
                color: '#111',
                backgroundImage: `
                  linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)`,
                backgroundSize: '20px 20px',
              }}
            >
              <CardiacLinkMark />
              <div
                style={{
                  display: 'inline-block',
                  background: green,
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.65rem',
                  letterSpacing: '0.06em',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '8px',
                  marginBottom: '0.75rem',
                  boxShadow: '3px 3px 0 rgba(0,0,0,0.2)',
                }}
              >
                HANDS POSITION
              </div>
              <CprIllustrationImage
                src={IMG_HANDS_POSITION}
                alt="Where to place hands for CPR: center of the chest"
              />
            </div>
            <button
              type="button"
              onClick={() => setStep('handPosing')}
              style={pillButton({
                background: green,
                color: greenDark,
                marginTop: '1rem',
              })}
            >
              Next
            </button>
            <button
              type="button"
              onClick={handleEndEmergency}
              style={pillButton({
                background: maroon,
                color: '#f5c2c4',
                border: `1px solid ${maroonBorder}`,
                marginTop: '0.75rem',
              })}
            >
              End Emergency
            </button>
          </div>
        )}

        {/* Step 5: Hand Posing */}
        {step === 'handPosing' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.5rem 0 0.75rem' }}>
              Hand positioning
            </h2>
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                borderLeft: '5px solid #C8102E',
                borderRight: '5px solid #C8102E',
                padding: '0.9rem 0.85rem 1rem',
                color: '#111',
                backgroundImage: `
                  linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)`,
                backgroundSize: '20px 20px',
              }}
            >
              <CardiacLinkMark compact />
              <div
                style={{
                  display: 'inline-block',
                  background: green,
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.65rem',
                  letterSpacing: '0.06em',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  boxShadow: '3px 3px 0 rgba(0,0,0,0.2)',
                }}
              >
                HANDS POSING
              </div>
              <CprIllustrationImage
                src={IMG_HANDS_POSING}
                alt="How to stack and interlace hands for compressions"
              />
            </div>
            <p
              style={{
                textAlign: 'center',
                color: green,
                fontSize: '0.82rem',
                fontWeight: 600,
                margin: '0.75rem 0 0.5rem',
              }}
            >
              Stack hands — shoulders over your hands
            </p>
            <button
              type="button"
              onClick={async () => {
                await ensureBeatAudioUnlocked();
                setStep('compressions');
              }}
              style={pillButton({
                background: green,
                color: greenDark,
              })}
            >
              Begin compressions
            </button>
            <button
              type="button"
              onClick={handleEndEmergency}
              style={pillButton({
                background: maroon,
                color: '#f5c2c4',
                border: `1px solid ${maroonBorder}`,
                marginTop: '0.75rem',
              })}
            >
              End Emergency
            </button>
          </div>
        )}

        {/* Step 6: Compressions */}
        {step === 'compressions' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                margin: '0.35rem 0 0.75rem',
                lineHeight: 1.2,
              }}
            >
              {inBreathWindow ? '30:2 — short breath pause' : 'Compressions — follow the beat'}
            </h2>
            <ul
              style={{
                margin: '0 0 1rem',
                paddingLeft: '1.1rem',
                color: textMuted,
                fontSize: '0.88rem',
                lineHeight: 1.5,
              }}
            >
              {inBreathWindow ? (
                <li>
                  The beat is off for a couple of seconds. Give two breaths if you can, or get ready to
                  compress again—compressions resume automatically.
                </li>
              ) : (
                <>
                  <li>
                    30 compressions, then a 2-second pause in the 30:2 cycle. You can give breaths during the
                    pause or go straight back to compressions with the beat.
                  </li>
                  <li>Push at a rate of 100 to 120 compressions per minute.</li>
                  <li>Push about 2 to 2.4 inches deep.</li>
                  <li>Let the chest rise completely between compressions.</li>
                </>
              )}
            </ul>

            <p
              style={{
                margin: '0 0 0.75rem',
                textAlign: 'center',
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              {inBreathWindow
                ? 'Resuming with the metronome in a moment.'
                : compressionsPaused
                  ? 'Paused — press Resume to continue the beat, sound, and count.'
                  : `Follow the pulse and the tick. Count advances each beat at ${TARGET_BPM} / min — push on each flash.`}
            </p>

            {/* Pulse Circle */}
            <div
              aria-hidden
              style={{
                width: 'min(40vw, 140px)',
                height: 'min(40vw, 140px)',
                margin: '0 auto 1rem',
                borderRadius: '50%',
                border: `4px solid ${green}`,
                boxShadow:
                  !inBreathWindow && !compressionsPaused && beatFlash % 2 === 0
                    ? '0 0 0 6px rgba(46, 204, 113, 0.3), 0 0 28px rgba(46, 204, 113, 0.2)'
                    : '0 0 0 0 rgba(46, 204, 113, 0)',
                transform:
                  !inBreathWindow && !compressionsPaused && beatFlash % 2 === 0
                    ? 'scale(1.06)'
                    : 'scale(1)',
                transition: 'transform 0.1s ease-out, box-shadow 0.1s ease-out',
                opacity: inBreathWindow ? 0.35 : compressionsPaused ? 0.4 : 1,
              }}
            />

            {/* Stats Card */}
            <div
              style={{
                borderRadius: '16px',
                padding: '1.25rem 1rem 1.5rem',
                background: cardBg,
                textAlign: 'left',
                marginBottom: '0.75rem',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
              }}
            >
              {!inBreathWindow && (
                <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                  <div
                    style={{
                      fontSize: '0.65rem',
                      color: 'rgba(255,255,255,0.45)',
                      letterSpacing: '0.1em',
                    }}
                  >
                    COUNT
                  </div>
                  <div>
                    <span style={{ fontSize: '2.75rem', fontWeight: 800, lineHeight: 1.1 }}>
                      {countInSet}
                    </span>
                    <span
                      style={{
                        fontSize: '1.1rem',
                        color: 'rgba(255,255,255,0.45)',
                        marginLeft: '0.15rem',
                      }}
                    >
                      / 30
                    </span>
                  </div>
                </div>
              )}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '0.5rem',
                  marginTop: 0,
                  fontSize: '0.72rem',
                }}
              >
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.4)' }}>Session</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {mm}:{ss}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.4)' }}>Set</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{setNumber}</div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.4)' }}>Total</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{totalCompressions}</div>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  marginTop: '0.6rem',
                  fontSize: '0.72rem',
                }}
              >
                <div
                  style={{
                    background: '#134e4a',
                    borderRadius: '8px',
                    padding: '0.45rem 0.5rem',
                    textAlign: 'center',
                    border: '1px solid rgba(46, 204, 113, 0.25)',
                  }}
                >
                  <div style={{ color: 'rgba(255,255,255,0.45)' }}>Target BPM</div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{TARGET_BPM}</div>
                </div>
                <div style={{ padding: '0.45rem 0.5rem', textAlign: 'center' }}>
                  <div style={{ color: 'rgba(255,255,255,0.45)' }}>Depth</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>2–2.4 in</div>
                </div>
              </div>
            </div>

            {/* Feedback */}
            <div
              style={{
                background: maroon,
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '0.95rem',
                marginBottom: '0.85rem',
                border: `1px solid ${maroonBorder}`,
              }}
            >
              {feedbackText}
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.6rem',
              }}
            >
              <button
                type="button"
                style={pillButton({
                  background: coral,
                  color: '#fff',
                  margin: 0,
                  fontSize: '0.82rem',
                })}
                onClick={() => {
                  setInBreathWindow(false);
                  setShowAedGuide(true);
                }}
              >
                AED Arrived
              </button>
              <button
                type="button"
                style={pillButton({
                  background: coral,
                  color: '#fff',
                  margin: 0,
                  fontSize: '0.82rem',
                })}
                onClick={() => router.push('/emergency/complete')}
              >
                Ambulance Arrived
              </button>
              <button
                type="button"
                style={pillButton({
                  background: '#1e2d3d',
                  color: '#e8f1ff',
                  margin: 0,
                })}
                disabled={inBreathWindow}
                onClick={async () => {
                  if (compressionsPaused) {
                    await ensureBeatAudioUnlocked();
                  }
                  setCompressionsPaused((p) => !p);
                }}
              >
                {compressionsPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                type="button"
                onClick={handleEndEmergency}
                style={pillButton({ background: maroon, color: '#f5c2c4', margin: 0 })}
              >
                End Emergency
              </button>
            </div>

            <p
              style={{
                marginTop: '1rem',
                textAlign: 'center',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              Assessment check in {formatMmSs(120 - sessionSeconds)}
            </p>
          </div>
        )}
      </div>

      {/* AED Guide Modal */}
      {showAedGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="AED use guide"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(5, 8, 14, 0.97)',
            overflow: 'auto',
            padding: '1rem 1rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ maxWidth: '28rem', width: '100%' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.5rem 0 0.75rem' }}>
              Using the AED
            </h2>
            <CprIllustrationImage
              src={IMG_AED_USE}
              alt="Step-by-step AED use: turn on, attach pads, stand clear, deliver shock if advised"
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                marginTop: '1rem',
              }}
            >
              <button
                type="button"
                onClick={() => setShowAedGuide(false)}
                style={pillButton({
                  background: green,
                  color: greenDark,
                  margin: 0,
                })}
              >
                Back to compressions
              </button>
              <button
                type="button"
                onClick={handleEndEmergency}
                style={pillButton({
                  background: maroon,
                  color: '#f5c2c4',
                  border: `1px solid ${maroonBorder}`,
                  margin: 0,
                })}
              >
                End Emergency
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
