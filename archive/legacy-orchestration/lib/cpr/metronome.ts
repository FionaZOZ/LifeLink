export class Metronome {
  private audioContext: AudioContext | null = null;
  private isPlaying = false;
  private intervalId: NodeJS.Timeout | null = null;
  private bpm = 110; // Target CPR rate

  start(bpm: number = 110) {
    if (this.isPlaying) return;

    this.bpm = bpm;
    this.isPlaying = true;

    // Initialize Audio Context (requires user interaction on some browsers)
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    const interval = (60 / this.bpm) * 1000; // milliseconds per beat

    this.intervalId = setInterval(() => {
      this.playClick();
    }, interval);

    // Play first click immediately
    this.playClick();
  }

  private playClick() {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;

    // Create oscillator for click sound
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Short, high-pitched click
    oscillator.frequency.value = 1000; // 1kHz
    oscillator.type = 'sine';

    // Quick attack and decay
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    oscillator.start(now);
    oscillator.stop(now + 0.05);
  }

  stop() {
    this.isPlaying = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  isActive(): boolean {
    return this.isPlaying;
  }

  setBPM(bpm: number) {
    if (this.isPlaying) {
      this.stop();
      this.start(bpm);
    } else {
      this.bpm = bpm;
    }
  }
}
