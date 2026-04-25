'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { CPRDetector, type CPRFeedback, type CompressionData } from '@/lib/cpr/detector';
import { Metronome } from '@/lib/cpr/metronome';
import { VoiceCoach } from '@/lib/cpr/voice';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Heart, Volume2, VolumeX, Play, Pause } from 'lucide-react';

export default function CPRCoachPage() {
  const searchParams = useSearchParams();
  // emergencyId can be used for logging/tracking
  const emergencyId = searchParams?.get('emergency_id');
  if (emergencyId) {
    console.log('CPR session for emergency:', emergencyId);
  }

  const [isActive, setIsActive] = useState(false);
  const [feedback, setFeedback] = useState<CPRFeedback | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [testMode, setTestMode] = useState(false);
  const [compressionData, setCompressionData] = useState<CompressionData[]>([]);

  const detectorRef = useRef<CPRDetector | null>(null);
  const metronomeRef = useRef<Metronome | null>(null);
  const voiceCoachRef = useRef<VoiceCoach | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const testIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize on mount
    detectorRef.current = new CPRDetector();
    metronomeRef.current = new Metronome();
    voiceCoachRef.current = new VoiceCoach();

    return () => {
      // Cleanup
      if (detectorRef.current) detectorRef.current.stop();
      if (metronomeRef.current) metronomeRef.current.stop();
      if (voiceCoachRef.current) voiceCoachRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (testIntervalRef.current) clearInterval(testIntervalRef.current);
    };
  }, []);

  const startCPR = () => {
    if (!detectorRef.current || !metronomeRef.current || !voiceCoachRef.current) return;

    setIsActive(true);
    setElapsedTime(0);

    // Start detector
    detectorRef.current.onFeedback((fb) => {
      setFeedback(fb);
      setCompressionData(detectorRef.current!.getCompressions());

      // Voice feedback
      voiceCoachRef.current?.processFeedback(fb);
    });

    if (testMode) {
      // Test mode: simulate compressions
      startTestMode();
    } else {
      // Real mode: start motion detection
      detectorRef.current.start();
      voiceCoachRef.current.giveInitialInstructions();
    }

    // Start metronome
    if (metronomeEnabled) {
      metronomeRef.current.start(110);
    }

    // Start timer
    timerRef.current = setInterval(() => {
      setElapsedTime((t) => t + 1);
    }, 1000);
  };

  const stopCPR = () => {
    setIsActive(false);

    if (detectorRef.current) detectorRef.current.stop();
    if (metronomeRef.current) metronomeRef.current.stop();
    if (voiceCoachRef.current) voiceCoachRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (testIntervalRef.current) clearInterval(testIntervalRef.current);
  };

  const toggleMetronome = () => {
    setMetronomeEnabled(!metronomeEnabled);

    if (isActive && metronomeRef.current) {
      if (metronomeEnabled) {
        metronomeRef.current.stop();
      } else {
        metronomeRef.current.start(110);
      }
    }
  };

  const startTestMode = () => {
    // Simulate realistic CPR patterns
    let currentBPM = 110;
    let currentForce: 'light' | 'good' | 'hard' = 'good';
    let cycleCount = 0;

    testIntervalRef.current = setInterval(() => {
      if (!detectorRef.current) return;

      // Vary the pattern every 10 compressions for demo
      cycleCount++;
      if (cycleCount % 10 === 0) {
        const patterns = [
          { bpm: 90, force: 'light' as const },
          { bpm: 110, force: 'good' as const },
          { bpm: 130, force: 'good' as const },
          { bpm: 105, force: 'hard' as const },
        ];
        const pattern = patterns[Math.floor(cycleCount / 10) % patterns.length];
        currentBPM = pattern.bpm;
        currentForce = pattern.force;
      }

      detectorRef.current.simulateCompression(currentBPM, currentForce);
    }, 100);
  };

  const getPaceFeedbackText = () => {
    if (!feedback) return 'Waiting...';

    switch (feedback.paceLabel) {
      case 'too-slow':
        return 'PUSH FASTER';
      case 'slow':
        return 'Speed up slightly';
      case 'perfect':
        return 'PERFECT PACE';
      case 'fast':
        return 'Slow down slightly';
      case 'too-fast':
        return 'TOO FAST';
      default:
        return '';
    }
  };

  const getForceFeedbackText = () => {
    if (!feedback) return '';

    switch (feedback.forceLabel) {
      case 'too-light':
        return 'PUSH HARDER';
      case 'good':
        return 'Good depth';
      case 'too-hard':
        return 'Ease up';
      default:
        return '';
    }
  };

  const getPaceColor = () => {
    if (!feedback) return 'bg-gray-500';

    switch (feedback.paceLabel) {
      case 'perfect':
        return 'bg-green-500';
      case 'slow':
      case 'fast':
        return 'bg-yellow-500';
      default:
        return 'bg-red-500';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const chartData = compressionData.slice(-20).map((c, i) => ({
    index: i,
    amplitude: c.amplitude,
  }));

  // Check if mobile
  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (!isMobile && !testMode) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <Card className="max-w-md bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Mobile Device Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">
              The CPR coach requires a mobile device with motion sensors.
            </p>
            <p className="text-gray-300">
              Please open this page on your smartphone or enable test mode below.
            </p>
            <Button
              onClick={() => setTestMode(true)}
              className="w-full"
            >
              Enable Test Mode
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-black p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-red-500" fill="currentColor" />
          <h1 className="text-lg font-bold">CPR Coach</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMetronome}
            className="text-white border-gray-600"
          >
            {metronomeEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          {!isActive ? (
            <Button onClick={startCPR} size="sm" className="bg-green-600 hover:bg-green-700">
              <Play className="h-4 w-4 mr-1" /> Start
            </Button>
          ) : (
            <Button onClick={stopCPR} size="sm" className="bg-red-600 hover:bg-red-700">
              <Pause className="h-4 w-4 mr-1" /> Stop
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-6 space-y-6">
        {/* Timer & Stats */}
        <div className="text-center space-y-2">
          <div className="text-5xl font-bold font-mono">{formatTime(elapsedTime)}</div>
          <div className="text-sm text-gray-400">
            {feedback?.compressionCount || 0} compressions • {feedback?.bpm || 0} BPM
          </div>
        </div>

        {/* Pulse Circle */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            <div
              className={`w-64 h-64 rounded-full ${getPaceColor()} flex items-center justify-center transition-all duration-300 ${
                isActive ? 'animate-pulse' : ''
              }`}
            >
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">{getPaceFeedbackText()}</div>
                <div className="text-lg">{getForceFeedbackText()}</div>
              </div>
            </div>

            {/* Quality Score */}
            {feedback && (
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                <div className="text-2xl font-bold">{feedback.quality}%</div>
                <div className="text-xs text-gray-400">Quality</div>
              </div>
            )}
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-300">Compression Amplitude</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={chartData}>
                  <XAxis dataKey="index" hide />
                  <YAxis hide domain={[0, 30]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amplitude"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!isActive && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                <li>Place phone flat on patient&apos;s chest</li>
                <li>Press START button above</li>
                <li>Push hard and fast following the beat</li>
                <li>Allow full chest recoil between compressions</li>
                <li>Continue until help arrives</li>
              </ol>
            </CardContent>
          </Card>
        )}

        {testMode && (
          <div className="text-center text-xs text-yellow-500">
            TEST MODE ACTIVE - Simulated compressions
          </div>
        )}
      </main>
    </div>
  );
}
