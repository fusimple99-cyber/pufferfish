/**
 * Procedural Audio Synthesizer for Chinese Sugar Crafting Atmosphere
 * Uses Web Audio API directly - zero external .mp3 / 404 dependencies!
 */

class SugarAudioEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private simmerGain: GainNode | null = null;
  private breathGain: GainNode | null = null;
  private breathFilter: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.createNoiseBuffer();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  /**
   * Start soft background simmering pot sound (gentle boiling sugar & steam)
   */
  public startWorkshopAmbience() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx || this.simmerGain || !this.noiseBuffer) return;

    try {
      // Pink/Brownian filtered noise for warm gentle steam
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = this.noiseBuffer;
      noiseSource.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 450;
      filter.Q.value = 1.0;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.04; // subtle, unobtrusive

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noiseSource.start();
      this.simmerGain = gain;
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Start continuous gentle breath blowing sound
   */
  public startBreath() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx || !this.noiseBuffer) return;

    try {
      this.stopBreath();

      const breathSrc = this.ctx.createBufferSource();
      breathSrc.buffer = this.noiseBuffer;
      breathSrc.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 680;
      filter.Q.value = 3.5;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, this.ctx.currentTime + 0.3);

      breathSrc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      breathSrc.start();
      this.breathGain = gain;
      this.breathFilter = filter;
    } catch {
      // Silently catch audio policy blocks
    }
  }

  /**
   * Modulate breath frequency as inflation rises
   */
  public updateBreathIntensity(intensity: number) {
    if (!this.ctx || !this.breathFilter || !this.breathGain) return;
    try {
      const now = this.ctx.currentTime;
      this.breathFilter.frequency.setTargetAtTime(600 + intensity * 350, now, 0.1);
      this.breathGain.gain.setTargetAtTime(0.05 + intensity * 0.12, now, 0.1);
    } catch {
      // Ignore
    }
  }

  /**
   * Stop breath blowing sound smoothly
   */
  public stopBreath() {
    if (!this.ctx || !this.breathGain) return;
    try {
      const now = this.ctx.currentTime;
      this.breathGain.gain.setValueAtTime(this.breathGain.gain.value, now);
      this.breathGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      const prev = this.breathGain;
      setTimeout(() => {
        try { prev.disconnect(); } catch {}
      }, 250);
      this.breathGain = null;
      this.breathFilter = null;
    } catch {
      this.breathGain = null;
    }
  }

  /**
   * Play crystal amber sugar chime (pentatonic traditional resonance)
   */
  public playSugarChime(pitchIndex = 0) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      // Chinese Pentatonic Scale (Gong, Shang, Jue, Zhi, Yu: C, D, E, G, A)
      const freqs = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      const freq = freqs[pitchIndex % freqs.length] || 783.99;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Glassy harmonic overtone
      const overtone = this.ctx.createOscillator();
      const overGain = this.ctx.createGain();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2.76, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);

      overGain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      overGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6);

      osc.connect(gain);
      overtone.connect(overGain);
      gain.connect(this.ctx.destination);
      overGain.connect(this.ctx.destination);

      osc.start();
      overtone.start();
      osc.stop(this.ctx.currentTime + 1.2);
      overtone.stop(this.ctx.currentTime + 0.6);
    } catch {
      // Catch audio context policy
    }
  }

  /**
   * Soft wooden craft tap sound
   */
  public playWoodTap() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch {}
  }
}

export const sugarAudio = new SugarAudioEngine();
