'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Volume2, VolumeX, Bluetooth, Usb, AlertTriangle, Activity } from 'lucide-react';
import { ensureBeatAudioUnlocked, playCompressionTick } from '@/lib/compressionBeatSound';
import { useSerialCPR } from '@/lib/cpr/useSerialCPR';

interface HardwareFeedback {
  depth: number; // in cm
  rate: number; // BPM
  quality: number; // 0-100
}

const PEAK_VOLTAGE = 4.0;
const RELEASE_VOLTAGE = 3.7;
const SESSION_DURATION_SECONDS = 120;

const INITIAL_FEEDBACK: HardwareFeedback = {
  depth: 0,
  rate: 0,
  quality: 0,
};

export default function CPRHardware() {
  const router = useRouter();
  const [compressions, setCompressions] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [nextCheck, setNextCheck] = useState(SESSION_DURATION_SECONDS);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [feedback, setFeedback] = useState<HardwareFeedback>(INITIAL_FEEDBACK);
  const [isSessionRunning, setIsSessionRunning] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const bpmWindowRef = useRef<number[]>([]);
  const lastCompressionAtRef = useRef<number | null>(null);
  const lastProcessedCountRef = useRef(0);
  const sessionStartCountRef = useRef(0);

  const serial = useSerialCPR();
  const activeVoltage = serial.lastSample?.voltage ?? 0;
  const isPressed = isSessionRunning && (serial.lastSample?.pressed ?? false);

  useEffect(() => {
    void ensureBeatAudioUnlocked();
  }, []);

  useEffect(() => {
    if (!isSessionRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
      setNextCheck((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setIsSessionRunning(false);
          router.push('/emergency/assessment');
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isSessionRunning, router]);

  useEffect(() => {
    if (!isSessionRunning || !serial.lastSample) return;

    const depth = mapVoltageToDepth(serial.lastSample.voltage);

    if (!serial.lastSample.success || serial.lastSample.count <= lastProcessedCountRef.current) {
      setFeedback((prev) => ({
        ...prev,
        depth,
        quality: computeQuality({ depth, rate: prev.rate, voltage: serial.lastSample?.voltage ?? 0 }),
      }));
      return;
    }

    const sample = serial.lastSample;
    const now = Date.now();
    const previousCompressionAt = lastCompressionAtRef.current;

    lastProcessedCountRef.current = sample.count;
    lastCompressionAtRef.current = now;
    setCompressions(Math.max(0, sample.count - sessionStartCountRef.current));
    void playCompressionTick();

    setFeedback((prev) => {
      let rate = prev.rate;
      if (previousCompressionAt) {
        const interval = now - previousCompressionAt;
        if (interval > 0) {
          const bpm = Math.round(60000 / interval);
          bpmWindowRef.current.push(bpm);
          if (bpmWindowRef.current.length > 8) bpmWindowRef.current.shift();
          rate = Math.round(
            bpmWindowRef.current.reduce((sum, value) => sum + value, 0) / bpmWindowRef.current.length
          );
        }
      }

      const quality = computeQuality({ depth, rate, voltage: sample.voltage });
      return { depth, rate, quality };
    });
  }, [isSessionRunning, serial.lastSample]);

  const resetSession = () => {
    const currentArduinoCount = serial.lastSample?.count ?? 0;
    sessionStartCountRef.current = currentArduinoCount;
    lastProcessedCountRef.current = currentArduinoCount;
    lastCompressionAtRef.current = null;
    bpmWindowRef.current = [];
    setCompressions(0);
    setElapsedTime(0);
    setNextCheck(SESSION_DURATION_SECONDS);
    setFeedback(INITIAL_FEEDBACK);
  };

  const handleReadyClick = async () => {
    void ensureBeatAudioUnlocked();

    if (!serial.isSupported) return;

    resetSession();

    if (!serial.isConnected) {
      const connected = await serial.connect();
      if (!connected) return;
    }

    setIsSessionRunning(true);
    console.log('[CPR Hardware] Ready clicked. Pressure detection started.');
  };

  const handleDisconnect = async () => {
    setIsSessionRunning(false);
    await serial.disconnect();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDepthColor = () => {
    if (feedback.depth >= 5.0 && feedback.depth <= 6.0) return 'text-success';
    return 'text-amber-500';
  };

  const getDepthLabel = () => {
    if (!isSessionRunning) return 'Waiting';
    if (feedback.depth >= 5.0 && feedback.depth <= 6.0) return '✓';
    if (feedback.depth < 5.0) return 'Push deeper!';
    return 'Ease up';
  };

  const getRateColor = () => {
    if (!isSessionRunning || feedback.rate === 0) return 'text-zinc-300';
    if (feedback.rate >= 100 && feedback.rate <= 120) return 'text-success';
    return 'text-amber-500';
  };

  const getQualityColor = () => {
    if (!isSessionRunning) return 'text-zinc-300';
    if (feedback.quality >= 80) return 'text-success';
    if (feedback.quality >= 70) return 'text-amber-500';
    return 'text-red-500';
  };

  const getQualityLabel = () => {
    if (!isSessionRunning) return 'Not started';
    if (feedback.quality >= 80) return 'Good';
    if (feedback.quality >= 70) return 'Needs work';
    return 'Poor';
  };

  const connectionBadge = useMemo(() => {
    if (serial.isConnected && serial.isReceiving) {
      return {
        label: 'Arduino Streaming',
        className: 'bg-green-600',
        icon: <Activity className="h-4 w-4" />,
      };
    }

    if (serial.isConnected) {
      return {
        label: 'Serial Connected',
        className: 'bg-blue-600',
        icon: <Bluetooth className="h-4 w-4" />,
      };
    }

    return {
      label: 'Arduino Not Connected',
      className: 'bg-zinc-700',
      icon: <Usb className="h-4 w-4" />,
    };
  }, [serial.isConnected, serial.isReceiving]);

  const readyLabel = useMemo(() => {
    if (serial.isConnecting) return 'CONNECTING';
    if (isPressed) return 'PUSH';
    if (isSessionRunning) return 'READY';
    return 'START';
  }, [isPressed, isSessionRunning, serial.isConnecting]);

  const readyHint = useMemo(() => {
    if (!serial.isSupported) return 'Use Chrome or Edge over HTTPS/localhost.';
    if (serial.isConnecting) return 'Opening serial port...';
    if (!serial.isConnected) return 'Click START to connect Arduino and begin pressure detection.';
    if (!isSessionRunning) return 'Click START to begin checking pressure threshold.';
    if (!serial.isReceiving) return 'Connected. Waiting for Arduino JSON sensor data...';
    return `Detecting pressure. Count when voltage ≥ ${PEAK_VOLTAGE.toFixed(2)}V.`;
  }, [isSessionRunning, serial.isConnecting, serial.isConnected, serial.isReceiving, serial.isSupported]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="bg-black px-6 py-8 relative">
        <div className={`absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full text-sm ${connectionBadge.className}`}>
          {connectionBadge.icon}
          <span>{connectionBadge.label}</span>
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-xl font-semibold mb-6">Correct Hand Placement</h2>
          <svg
            viewBox="0 0 400 300"
            className="w-full max-w-md mx-auto"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <ellipse cx="200" cy="150" rx="120" ry="100" opacity="0.3" />
            <g transform="translate(200, 150)">
              <path
                d="M -30 -10 L -30 30 L 30 30 L 30 -10 L 20 -20 L -20 -20 Z"
                fill="none"
                strokeWidth="3"
              />
              <path
                d="M -25 -15 L -25 -35 L 25 -35 L 25 -15"
                fill="none"
                strokeWidth="3"
              />
              <circle cx="0" cy="5" r="3" fill="white" />
            </g>
            <text
              x="200"
              y="270"
              textAnchor="middle"
              fill="white"
              fontSize="14"
              opacity="0.7"
            >
              Place hands in center of chest
            </text>
          </svg>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="text-center mb-8 w-full max-w-3xl">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
            <button
              onClick={() => void serial.connect()}
              disabled={serial.isConnecting || serial.isConnected || !serial.isSupported}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-400 text-sm font-semibold transition-colors"
            >
              {serial.isConnecting ? 'Connecting...' : serial.isConnected ? 'Connected' : 'Connect Arduino'}
            </button>
            <button
              onClick={() => void handleDisconnect()}
              disabled={!serial.isConnected && !serial.isConnecting}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/60 disabled:text-zinc-500 text-sm font-semibold transition-colors"
            >
              Disconnect
            </button>
          </div>

          {!serial.isSupported && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left text-sm text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Web Serial 需要在 Chrome 或 Edge 里通过 HTTPS 或 localhost 打开这个页面。</span>
            </div>
          )}

          {serial.error && (
            <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {serial.error}
            </div>
          )}

          <div className="relative inline-block mb-4">
            <button
              type="button"
              onClick={() => void handleReadyClick()}
              disabled={serial.isConnecting || !serial.isSupported}
              aria-label="Start CPR pressure detection"
              className={`w-48 h-48 rounded-full flex items-center justify-center shadow-2xl transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                isPressed ? 'bg-success animate-metronome' : isSessionRunning ? 'bg-blue-700' : 'bg-zinc-700 hover:bg-zinc-600'
              }`}
            >
              <span className="text-4xl font-bold">{readyLabel}</span>
            </button>
          </div>
          <div className="text-lg text-gray-400">Target: 100–120 BPM</div>
          <div className="mt-2 text-sm text-zinc-400">{readyHint}</div>
          <div className="mt-2 text-sm text-zinc-400">
            Success threshold: ≥ {PEAK_VOLTAGE.toFixed(2)}V • Rearm below {RELEASE_VOLTAGE.toFixed(2)}V
          </div>
        </div>

        <div className="w-full max-w-3xl bg-gray-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">Depth</div>
              <div className="relative h-32 w-12 mx-auto bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 right-0 bg-green-500 bg-opacity-30"
                  style={{
                    bottom: '33%',
                    height: '17%',
                  }}
                />
                <div
                  className="absolute bottom-0 left-0 right-0 bg-success transition-all duration-150"
                  style={{
                    height: `${Math.min((feedback.depth / 7.0) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className={`mt-2 font-semibold ${getDepthColor()}`}>
                {feedback.depth.toFixed(1)}cm {getDepthLabel()}
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">Rate</div>
              <div className="flex items-center justify-center h-32">
                <div className={`text-4xl font-bold ${getRateColor()}`}>
                  {Math.round(feedback.rate)}
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-400">BPM</div>
            </div>

            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">Quality</div>
              <div className="flex items-center justify-center h-32">
                <div className={`text-4xl font-bold ${getQualityColor()}`}>
                  {Math.round(feedback.quality)}
                  <span className="text-2xl">/100</span>
                </div>
              </div>
              <div className={`mt-2 font-semibold ${getQualityColor()}`}>
                {getQualityLabel()}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-3xl grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-lg bg-zinc-800 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Live Voltage</div>
            <div className="text-3xl font-bold text-cyan-400">{activeVoltage.toFixed(3)}V</div>
            <div className="mt-1 text-sm text-zinc-400">Raw: {serial.lastSample?.raw ?? 0}</div>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Sensor State</div>
            <div className={`text-3xl font-bold ${isPressed ? 'text-green-400' : 'text-zinc-300'}`}>
              {isPressed ? 'Pressed' : isSessionRunning ? 'Released' : 'Not Started'}
            </div>
            <div className="mt-1 text-sm text-zinc-400">Successful CPR counts only when threshold is crossed.</div>
          </div>
        </div>

        <div className="w-full max-w-3xl rounded-lg bg-zinc-800 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">Serial Debug Log</div>
              <div className="text-sm text-zinc-400">
                Status: {serial.lastStatus ?? 'none'} • Samples: {serial.sampleCount} • Receiving:{' '}
                {serial.isReceiving ? 'yes' : 'no'}
              </div>
            </div>
            <button
              type="button"
              onClick={serial.clearLogs}
              className="px-3 py-1 rounded-md bg-zinc-700 hover:bg-zinc-600 text-xs font-semibold transition-colors"
            >
              Clear logs
            </button>
          </div>

          <div className="max-h-40 overflow-y-auto rounded-md bg-black/30 p-3 text-left font-mono text-xs">
            {serial.logs.length === 0 ? (
              <div className="text-zinc-500">No serial logs yet. Click Connect Arduino or START.</div>
            ) : (
              serial.logs.slice(0, 8).map((log) => (
                <div
                  key={log.id}
                  className={
                    log.level === 'error'
                      ? 'text-red-300'
                      : log.level === 'warn'
                        ? 'text-amber-300'
                        : 'text-zinc-300'
                  }
                >
                  [{log.timestamp}] {log.message}{log.detail ? ` — ${log.detail}` : ''}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3 text-lg">
          <div>
            <span className="text-gray-400">Successful compressions:</span>{' '}
            <span className="font-bold text-white">{compressions}</span>
          </div>
          <div>
            <span className="text-gray-400">Time:</span>{' '}
            <span className="font-bold text-white">{formatTime(elapsedTime)}</span>
          </div>
          <div>
            <span className="text-gray-400">Next check:</span>{' '}
            <span className="font-bold text-amber-400">{formatTime(nextCheck)}</span>
          </div>
        </div>
      </div>

      <div className="bg-black px-6 py-4 flex items-center justify-between sticky bottom-0">
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          {voiceEnabled ? (
            <>
              <Volume2 className="h-5 w-5" />
              <span className="text-sm">Voice ON</span>
            </>
          ) : (
            <>
              <VolumeX className="h-5 w-5" />
              <span className="text-sm">Voice OFF</span>
            </>
          )}
        </button>

        <button
          onClick={() => setQuestionModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium"
        >
          Need help?
        </button>
      </div>

      {questionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-6 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Ask a Question</h3>
            <textarea
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              placeholder="e.g., His lips are turning blue, what do I do?"
              className="w-full bg-gray-700 text-white rounded-lg p-3 mb-4 resize-none"
              rows={4}
            />
            {userQuestion && (
              <div className="mb-4 p-3 bg-gray-700 rounded-lg text-sm">
                <p className="text-gray-300">
                  <strong>AI Response:</strong> Continue CPR. Blue lips indicate lack of oxygen,
                  which is expected. Keep compressions going at 110 BPM. Help is on the way.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setQuestionModalOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => console.log('Question:', userQuestion)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Ask
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function mapVoltageToDepth(voltage: number): number {
  if (voltage <= 0) return 0;
  const normalized = Math.max(0, Math.min(1, voltage / 5.0));
  return Number((normalized * 6.5).toFixed(1));
}

function computeQuality({ depth, rate, voltage }: { depth: number; rate: number; voltage: number }): number {
  let score = 0;

  if (depth >= 5.0 && depth <= 6.0) score += 35;
  else if (depth >= 4.5 && depth <= 6.5) score += 25;
  else score += 12;

  if (rate >= 100 && rate <= 120) score += 35;
  else if (rate >= 90 && rate <= 130) score += 25;
  else if (rate > 0) score += 12;

  if (voltage >= PEAK_VOLTAGE) score += 30;
  else if (voltage >= 4.3) score += 22;
  else if (voltage >= 3.8) score += 12;
  else score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}
