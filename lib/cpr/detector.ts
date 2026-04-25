export interface CPRFeedback {
  bpm: number;
  paceLabel: 'too-slow' | 'slow' | 'perfect' | 'fast' | 'too-fast';
  forceLabel: 'too-light' | 'good' | 'too-hard';
  compressionCount: number;
  quality: number; // 0-100 score
  lastCompressionTime: number;
}

export interface CompressionData {
  timestamp: number;
  amplitude: number;
}

export class CPRDetector {
  private isRunning = false;
  private compressions: CompressionData[] = [];
  private lastPeakTime = 0;
  private peakIntervals: number[] = [];
  private feedbackCallback?: (feedback: CPRFeedback) => void;
  private lastAcceleration = 0;
  private peakThreshold = 12; // m/s² - minimum to count as compression
  private inPeak = false;
  private compressionCount = 0;

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.compressions = [];
    this.peakIntervals = [];
    this.compressionCount = 0;

    if (typeof window !== 'undefined' && window.DeviceMotionEvent) {
      // iOS 13+ requires permission
      if (
        typeof (DeviceMotionEvent as any).requestPermission === 'function'
      ) {
        (DeviceMotionEvent as any)
          .requestPermission()
          .then((permission: string) => {
            if (permission === 'granted') {
              this.startListening();
            } else {
              console.error('Motion permission denied');
            }
          })
          .catch((error: any) => {
            console.error('Error requesting motion permission:', error);
          });
      } else {
        // Non-iOS or older iOS
        this.startListening();
      }
    }
  }

  private startListening() {
    window.addEventListener('devicemotion', this.handleMotion);
  }

  private handleMotion = (event: DeviceMotionEvent) => {
    if (!this.isRunning) return;

    const accel = event.accelerationIncludingGravity;
    if (!accel || accel.y === null) return;

    // Y-axis is vertical when phone is flat
    const yAccel = Math.abs(accel.y);

    // Apply simple low-pass filter to reduce noise
    const filtered = 0.8 * this.lastAcceleration + 0.2 * yAccel;
    this.lastAcceleration = filtered;

    const now = Date.now();

    // Peak detection: look for local maxima above threshold
    if (filtered > this.peakThreshold && !this.inPeak) {
      // Entering a peak
      this.inPeak = true;

      // Record compression
      if (this.lastPeakTime > 0) {
        const interval = now - this.lastPeakTime;

        // Ignore if too soon (< 200ms = > 300 BPM, likely noise)
        if (interval > 200) {
          this.peakIntervals.push(interval);

          // Keep only last 10 intervals for rolling average
          if (this.peakIntervals.length > 10) {
            this.peakIntervals.shift();
          }

          this.compressionCount++;

          // Record compression data for chart
          this.compressions.push({
            timestamp: now,
            amplitude: filtered,
          });

          // Keep only last 30 seconds of data
          const cutoffTime = now - 30000;
          this.compressions = this.compressions.filter(
            (c) => c.timestamp > cutoffTime
          );

          // Calculate and send feedback
          this.calculateFeedback(filtered);
        }
      }

      this.lastPeakTime = now;
    } else if (filtered < this.peakThreshold * 0.6) {
      // Exiting peak (dropped below 60% of threshold)
      this.inPeak = false;
    }
  };

  private calculateFeedback(currentAmplitude: number) {
    if (this.peakIntervals.length < 2) return;

    // Calculate BPM from rolling average of intervals
    const avgInterval =
      this.peakIntervals.reduce((sum, i) => sum + i, 0) /
      this.peakIntervals.length;
    const bpm = Math.round(60000 / avgInterval);

    // Classify pace
    let paceLabel: CPRFeedback['paceLabel'];
    if (bpm < 90) paceLabel = 'too-slow';
    else if (bpm < 100) paceLabel = 'slow';
    else if (bpm <= 120) paceLabel = 'perfect';
    else if (bpm <= 140) paceLabel = 'fast';
    else paceLabel = 'too-fast';

    // Classify force based on amplitude
    let forceLabel: CPRFeedback['forceLabel'];
    if (currentAmplitude < 10) forceLabel = 'too-light';
    else if (currentAmplitude <= 20) forceLabel = 'good';
    else forceLabel = 'too-hard';

    // Calculate quality score (0-100)
    let quality = 0;

    // Pace score (max 50 points)
    if (paceLabel === 'perfect') quality += 50;
    else if (paceLabel === 'slow' || paceLabel === 'fast') quality += 35;
    else quality += 20;

    // Force score (max 30 points)
    if (forceLabel === 'good') quality += 30;
    else if (forceLabel === 'too-light') quality += 15;
    else quality += 10;

    // Consistency score (max 20 points)
    if (this.peakIntervals.length >= 5) {
      const variance =
        this.peakIntervals.reduce((sum, i) => {
          const diff = i - avgInterval;
          return sum + diff * diff;
        }, 0) / this.peakIntervals.length;
      const stdDev = Math.sqrt(variance);
      const consistency = Math.max(0, 20 - stdDev / 20);
      quality += consistency;
    }

    const feedback: CPRFeedback = {
      bpm,
      paceLabel,
      forceLabel,
      compressionCount: this.compressionCount,
      quality: Math.round(quality),
      lastCompressionTime: Date.now(),
    };

    if (this.feedbackCallback) {
      this.feedbackCallback(feedback);
    }
  }

  stop() {
    this.isRunning = false;
    window.removeEventListener('devicemotion', this.handleMotion);
  }

  onFeedback(callback: (feedback: CPRFeedback) => void) {
    this.feedbackCallback = callback;
  }

  getCompressions(): CompressionData[] {
    return [...this.compressions];
  }

  // Test mode: simulate compression patterns
  simulateCompression(bpm: number, force: 'light' | 'good' | 'hard') {
    const interval = 60000 / bpm;
    const amplitude = force === 'light' ? 8 : force === 'good' ? 15 : 25;

    const now = Date.now();

    if (this.lastPeakTime > 0) {
      const actualInterval = now - this.lastPeakTime;
      if (actualInterval >= interval - 50) {
        // Time for next compression
        this.peakIntervals.push(actualInterval);
        if (this.peakIntervals.length > 10) {
          this.peakIntervals.shift();
        }

        this.compressionCount++;

        this.compressions.push({
          timestamp: now,
          amplitude,
        });

        const cutoffTime = now - 30000;
        this.compressions = this.compressions.filter(
          (c) => c.timestamp > cutoffTime
        );

        this.calculateFeedback(amplitude);
        this.lastPeakTime = now;
      }
    } else {
      this.lastPeakTime = now;
    }
  }
}
