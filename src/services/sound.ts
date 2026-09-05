// Synthetic gentle audio & haptic feedback using Web Audio API

class SoundService {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Camera shutter sound
  playShutter() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
      
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.1);
      
      this.triggerHaptic(50);
    } catch {
      // Audio autoplay blocked or unsupported
    }
  }

  // Click / Tab switch tone (warm clay tap)
  playTap() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.04);
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.05);
      
      this.triggerHaptic(15);
    } catch {
      // Ignored
    }
  }

  // Microphone toggle / recording start chime
  playMicStart() {
    this.playVoiceStart();
  }

  // Shilpi voice start chime
  playVoiceStart() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      
      const now = ctx.currentTime;
      [392, 523.25, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.06;
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(start);
        osc.stop(start + 0.16);
      });
      this.triggerHaptic(30);
    } catch {
      // Ignored
    }
  }

  // Success chord (Indian flute/tanpura harmonic warmth)
  playSuccess() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      
      const now = ctx.currentTime;
      // D major pentatonic warm chord (D4, F#4, A4, D5)
      const freqs = [293.66, 369.99, 440.00, 587.33];
      
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.08;
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(start);
        osc.stop(start + 0.65);
      });
      this.triggerHaptic([40, 60, 80]);
    } catch {
      // Ignored
    }
  }

  // Subtle slider tick
  playTick() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.02);
    } catch {
      // Ignored
    }
  }

  // Public Vibration API triggers for tactile feedback
  vibrate(pattern: number | number[] = 15) {
    this.triggerHaptic(pattern);
  }

  vibrateTap() {
    this.triggerHaptic(14);
  }

  vibrateSelection() {
    this.triggerHaptic(20);
  }

  vibrateSuccess() {
    this.triggerHaptic([25, 40, 35]);
  }

  vibrateWarning() {
    this.triggerHaptic([40, 50, 40]);
  }

  triggerHaptic(pattern: number | number[]) {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Vibration blocked or unsupported
      }
    }
  }
}

export const sound = new SoundService();

// Global touch/click haptic feedback listener
let isHapticsInitialized = false;
export function initGlobalHaptics() {
  if (typeof window === 'undefined' || isHapticsInitialized) return;
  isHapticsInitialized = true;

  const handleInteraction = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Check if clicked element or its parent is interactive
    const interactive = target.closest(
      'button, a, [role="button"], input[type="button"], input[type="submit"], input[type="radio"], input[type="checkbox"], select, [data-haptic]'
    );

    if (interactive) {
      sound.vibrate(12);
    }
  };

  window.addEventListener('pointerdown', handleInteraction, { passive: true });
}
