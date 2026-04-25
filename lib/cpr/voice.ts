import type { CPRFeedback } from './detector';

export class VoiceCoach {
  private synth: SpeechSynthesis | null = null;
  private isSpeaking = false;
  private messageQueue: string[] = [];
  private lastFeedbackTime = 0;
  private feedbackCooldown = 5000; // 5 seconds between feedback
  private lastEncouragementTime = 0;
  private encouragementInterval = 30000; // 30 seconds

  // Track patterns
  private lastPaceLabel: string | null = null;
  private lastForceLabel: string | null = null;
  private consistentPoorPaceCount = 0;
  private consistentPoorForceCount = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  processFeedback(feedback: CPRFeedback) {
    const now = Date.now();

    // Check for consistent patterns that need correction
    if (feedback.paceLabel === this.lastPaceLabel) {
      if (feedback.paceLabel !== 'perfect') {
        this.consistentPoorPaceCount++;
      }
    } else {
      this.consistentPoorPaceCount = 0;
    }

    if (feedback.forceLabel === this.lastForceLabel) {
      if (feedback.forceLabel !== 'good') {
        this.consistentPoorForceCount++;
      }
    } else {
      this.consistentPoorForceCount = 0;
    }

    this.lastPaceLabel = feedback.paceLabel;
    this.lastForceLabel = feedback.forceLabel;

    // Only give feedback if enough time has passed
    if (now - this.lastFeedbackTime < this.feedbackCooldown) {
      return;
    }

    // Priority 1: Force feedback (if consistently wrong)
    if (this.consistentPoorForceCount >= 5) {
      if (feedback.forceLabel === 'too-light') {
        this.speak('Push harder. At least two inches deep.');
        this.lastFeedbackTime = now;
        this.consistentPoorForceCount = 0;
        return;
      } else if (feedback.forceLabel === 'too-hard') {
        this.speak('Ease up slightly.');
        this.lastFeedbackTime = now;
        this.consistentPoorForceCount = 0;
        return;
      }
    }

    // Priority 2: Pace feedback (if consistently wrong for 10+ compressions)
    if (this.consistentPoorPaceCount >= 10) {
      if (feedback.paceLabel === 'too-slow') {
        this.speak('Speed up. Push faster.');
        this.lastFeedbackTime = now;
        this.consistentPoorPaceCount = 0;
        return;
      } else if (feedback.paceLabel === 'slow') {
        this.speak('A little faster.');
        this.lastFeedbackTime = now;
        this.consistentPoorPaceCount = 0;
        return;
      } else if (feedback.paceLabel === 'fast') {
        this.speak('Slow down slightly.');
        this.lastFeedbackTime = now;
        this.consistentPoorPaceCount = 0;
        return;
      } else if (feedback.paceLabel === 'too-fast') {
        this.speak('Too fast. Slow down.');
        this.lastFeedbackTime = now;
        this.consistentPoorPaceCount = 0;
        return;
      }
    }

    // Priority 3: Positive reinforcement for good work
    if (
      feedback.paceLabel === 'perfect' &&
      feedback.forceLabel === 'good' &&
      this.consistentPoorPaceCount === 0 &&
      now - this.lastFeedbackTime > 10000
    ) {
      this.speak('Excellent compressions. Keep going.');
      this.lastFeedbackTime = now;
      return;
    }

    // Periodic encouragement
    if (now - this.lastEncouragementTime > this.encouragementInterval) {
      this.speak('Continue compressions. Help is on the way.');
      this.lastEncouragementTime = now;
    }
  }

  speak(message: string, priority: boolean = false) {
    if (!this.synth) return;

    // Cancel current speech if priority message
    if (priority && this.isSpeaking) {
      this.synth.cancel();
      this.isSpeaking = false;
    }

    // Add to queue if currently speaking
    if (this.isSpeaking && !priority) {
      this.messageQueue.push(message);
      return;
    }

    this.speakNow(message);
  }

  private speakNow(message: string) {
    if (!this.synth) return;

    const utterance = new SpeechSynthesisUtterance(message);

    // Configure voice
    utterance.rate = 1.0; // Normal speed
    utterance.pitch = 1.0; // Normal pitch
    utterance.volume = 1.0; // Full volume

    // Try to use a clear, authoritative voice
    const voices = this.synth.getVoices();
    const preferredVoice =
      voices.find((v) => v.name.includes('Samantha')) || // iOS
      voices.find((v) => v.name.includes('Google')) || // Android
      voices.find((v) => v.lang.startsWith('en')) || // Any English
      voices[0]; // Fallback

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
    };

    utterance.onend = () => {
      this.isSpeaking = false;

      // Process queue
      if (this.messageQueue.length > 0) {
        const nextMessage = this.messageQueue.shift()!;
        this.speakNow(nextMessage);
      }
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
    };

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.isSpeaking = false;
    this.messageQueue = [];
  }

  // For initial instructions
  giveInitialInstructions() {
    this.speak(
      'Place phone on chest. Push hard and fast. Follow the beat.',
      true
    );
  }
}
