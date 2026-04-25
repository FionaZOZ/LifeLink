'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Volume2, VolumeX, Bluetooth } from 'lucide-react';
import { ensureBeatAudioUnlocked, playCompressionTick } from '@/lib/compressionBeatSound';

interface HardwareFeedback {
  depth: number; // in cm
  rate: number; // BPM
  quality: number; // 0-100
}

export default function CPRHardware() {
  const router = useRouter();
  const [compressions, setCompressions] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [nextCheck, setNextCheck] = useState(120);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [feedback, setFeedback] = useState<HardwareFeedback>({
    depth: 5.2,
    rate: 110,
    quality: 85,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const metronomeRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackRef = useRef<NodeJS.Timeout | null>(null);

  const startTimers = () => {
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
      setNextCheck((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          router.push('/emergency/assessment');
        }
        return next;
      });
    }, 1000);

    const bpm = 110;
    const interval = (60 / bpm) * 1000;

    metronomeRef.current = setInterval(() => {
      void playCompressionTick();
      setCompressions((prev) => prev + 1);
    }, interval);
  };

  useEffect(() => {
    // Unlock audio on mount
    void ensureBeatAudioUnlocked();

    // Start timers
    startTimers();

    // Simulate hardware feedback updates
    feedbackRef.current = setInterval(() => {
      setFeedback({
        depth: 4.0 + Math.random() * 2.5, // 4.0-6.5cm
        rate: 95 + Math.random() * 35, // 95-130 BPM
        quality: 60 + Math.random() * 35, // 60-95
      });
    }, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (metronomeRef.current) clearInterval(metronomeRef.current);
      if (feedbackRef.current) clearInterval(feedbackRef.current);
    };
  }, [router]);

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
    if (feedback.depth >= 5.0 && feedback.depth <= 6.0) return '✓';
    if (feedback.depth < 5.0) return 'Push deeper!';
    return 'Ease up';
  };

  const getRateColor = () => {
    if (feedback.rate >= 100 && feedback.rate <= 120) return 'text-success';
    return 'text-amber-500';
  };

  const getQualityColor = () => {
    if (feedback.quality >= 80) return 'text-success';
    if (feedback.quality >= 70) return 'text-amber-500';
    return 'text-red-500';
  };

  const getQualityLabel = () => {
    if (feedback.quality >= 80) return 'Good';
    if (feedback.quality >= 70) return 'Needs work';
    return 'Poor';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Top section */}
      <div className="bg-black px-6 py-8 relative">
        {/* BLE Connected Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-blue-600 rounded-full text-sm">
          <Bluetooth className="h-4 w-4" />
          <span>BLE Connected</span>
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

      {/* Center: Metronome */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="text-center mb-8">
          <div className="relative inline-block mb-8">
            <div className="w-48 h-48 rounded-full bg-success flex items-center justify-center animate-metronome shadow-2xl">
              <span className="text-4xl font-bold">PUSH</span>
            </div>
          </div>
          <div className="text-lg text-gray-400">110 BPM</div>
        </div>

        {/* Hardware Feedback Strip */}
        <div className="w-full max-w-3xl bg-gray-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Depth */}
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">Depth</div>
              <div className="relative h-32 w-12 mx-auto bg-gray-700 rounded-full overflow-hidden">
                {/* Green zone marker */}
                <div
                  className="absolute left-0 right-0 bg-green-500 bg-opacity-30"
                  style={{
                    bottom: '33%',
                    height: '17%',
                  }}
                ></div>
                {/* Current depth fill */}
                <div
                  className="absolute bottom-0 left-0 right-0 bg-success transition-all duration-300"
                  style={{
                    height: `${Math.min((feedback.depth / 7.0) * 100, 100)}%`,
                  }}
                ></div>
              </div>
              <div className={`mt-2 font-semibold ${getDepthColor()}`}>
                {feedback.depth.toFixed(1)}cm {getDepthLabel()}
              </div>
            </div>

            {/* Rate */}
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">Rate</div>
              <div className="flex items-center justify-center h-32">
                <div className={`text-4xl font-bold ${getRateColor()}`}>
                  {Math.round(feedback.rate)}
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-400">BPM</div>
            </div>

            {/* Quality */}
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

        {/* Stats */}
        <div className="space-y-3 text-lg">
          <div>
            <span className="text-gray-400">Compressions:</span>{' '}
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

      {/* Bottom bar */}
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

      {/* Question Modal */}
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
