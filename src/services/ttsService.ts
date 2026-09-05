/**
 * High-Fidelity Hybrid Multilingual Audio & Speech Service
 * Supports all 23 official Indian languages seamlessly across all browsers and devices.
 *
 * Strategy:
 * 1. Primary: High-fidelity natural acoustic speech audio streamed from /api/tts.
 *    Bypasses OS voice limitations (ensures Tamil, Telugu, Bengali, Urdu, Odia, etc.
 *    all produce authentic audio regardless of whether local OS voice packs are installed).
 * 2. Secondary Fallback: Web Speech API (window.speechSynthesis) with intelligent
 *    voice and language alignment so the browser engine never drops utterances.
 */

import { LanguageCode } from '../types';

export interface SpeechOptions {
  text: string;
  locale: string; // BCP-47 locale string (e.g. 'ur-IN', 'hi-IN', 'en-IN')
  langCode?: LanguageCode | string; // 2-3 letter code (e.g. 'ur', 'bn', 'ta')
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

class TTSService {
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private activeAudio: HTMLAudioElement | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private isCurrentlyPlaying = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initVoices();
      if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.initVoices();
        };
      }
    }
  }

  private initVoices() {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        this.cachedVoices = window.speechSynthesis.getVoices() || [];
      }
    } catch {
      // Ignore voice query errors
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && ('Audio' in window || 'speechSynthesis' in window);
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.cachedVoices.length === 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.cachedVoices = window.speechSynthesis.getVoices() || [];
    }
    return this.cachedVoices;
  }

  /**
   * Finds matching voice with graceful Indic fallbacks.
   */
  public findBestVoice(locale: string): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    const targetLocale = locale.toLowerCase().replace('_', '-');
    const baseLang = targetLocale.split('-')[0];

    // 1. Exact locale match (e.g. 'ur-in', 'hi-in', 'ta-in')
    const exactMatch = voices.find(
      (v) => v.lang.toLowerCase().replace('_', '-') === targetLocale
    );
    if (exactMatch) return exactMatch;

    // 2. Language dialect match (e.g. 'ur-PK' or 'ur' for 'ur-IN')
    const dialectMatch = voices.find((v) => {
      const vLang = v.lang.toLowerCase().replace('_', '-');
      return vLang.startsWith(baseLang + '-') || vLang === baseLang;
    });
    if (dialectMatch) return dialectMatch;

    // 3. Indian regional voice fallback (Hindi or Indian English voice)
    const indianFallback = voices.find((v) => {
      const vLang = v.lang.toLowerCase().replace('_', '-');
      return vLang.includes('-in') || vLang.includes('hi') || vLang.includes('hindi');
    });
    if (indianFallback) return indianFallback;

    // 4. Default voice
    return voices.find((v) => v.default) || voices[0] || null;
  }

  /**
   * Primary entry point: Speaks the text with full fallback support.
   */
  public speak(options: SpeechOptions): boolean {
    this.stop();

    const lang = options.langCode || options.locale.split('-')[0] || 'hi';
    const text = options.text;

    this.isCurrentlyPlaying = true;

    // Method 1: Try high-fidelity server TTS stream via HTML5 Audio
    try {
      const audioUrl = `/api/tts?lang=${encodeURIComponent(lang)}&text=${encodeURIComponent(text)}`;
      const audio = new Audio(audioUrl);
      this.activeAudio = audio;

      let started = false;

      audio.onplay = () => {
        started = true;
        this.isCurrentlyPlaying = true;
        options.onStart?.();
      };

      audio.onended = () => {
        this.isCurrentlyPlaying = false;
        this.activeAudio = null;
        options.onEnd?.();
      };

      audio.onerror = () => {
        // Upstream or offline audio failed - fall back to browser Web Speech API
        this.activeAudio = null;
        if (!started) {
          this.speakWithWebSpeech(options);
        } else {
          this.isCurrentlyPlaying = false;
          options.onEnd?.();
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay or network issue, fallback to Web Speech API
          this.activeAudio = null;
          this.speakWithWebSpeech(options);
        });
      }

      return true;
    } catch {
      // Fallback directly to Web Speech API
      return this.speakWithWebSpeech(options);
    }
  }

  /**
   * Secondary fallback: Web Speech API with safe voice alignment.
   */
  private speakWithWebSpeech(options: SpeechOptions): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.isCurrentlyPlaying = false;
      options.onError?.(new Error('Audio synthesis not supported'));
      return false;
    }

    try {
      const { text, locale, rate = 0.92, pitch = 1.0, onStart, onEnd, onError } = options;
      const utterance = new SpeechSynthesisUtterance(text);

      const matchingVoice = this.findBestVoice(locale);
      if (matchingVoice) {
        utterance.voice = matchingVoice;
        // Important: Set utterance.lang to the voice's supported language
        // to prevent browser speech synthesis discarding the utterance
        utterance.lang = matchingVoice.lang;
      } else {
        utterance.lang = locale;
      }

      utterance.rate = rate;
      utterance.pitch = pitch;

      utterance.onstart = () => {
        this.isCurrentlyPlaying = true;
        onStart?.();
      };

      utterance.onend = () => {
        this.isCurrentlyPlaying = false;
        this.activeUtterance = null;
        onEnd?.();
      };

      utterance.onerror = (e) => {
        this.isCurrentlyPlaying = false;
        this.activeUtterance = null;
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          onError?.(e);
        } else {
          onEnd?.();
        }
      };

      this.activeUtterance = utterance;

      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      this.isCurrentlyPlaying = false;
      this.activeUtterance = null;
      options.onError?.(err);
      return false;
    }
  }

  public stop(): void {
    this.isCurrentlyPlaying = false;

    // Stop HTML5 Audio
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch {
        // Ignore audio pause errors
      }
      this.activeAudio = null;
    }

    // Stop Web Speech
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
    this.activeUtterance = null;
  }

  public isSpeaking(): boolean {
    if (this.isCurrentlyPlaying) return true;
    if (this.activeAudio && !this.activeAudio.paused) return true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis.speaking;
    }
    return false;
  }
}

export const ttsService = new TTSService();
