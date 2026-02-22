import type { DrumId, InstrumentId, Song } from "@/core/types";
import { noteNameToMidi, totalSteps } from "@/core/utils";

export type TransportState = "stopped" | "playing";

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private state: TransportState = "stopped";
  private schedulerInterval: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime = 0;
  private currentStep = 0;
  private noiseBuffer: AudioBuffer | null = null;

  private readonly SCHEDULE_INTERVAL = 25;
  private readonly LOOKAHEAD = 0.15;

  async init(): Promise<void> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);
    }
    if (!this.noiseBuffer) {
      this.noiseBuffer = this.createNoiseBuffer();
    }
  }

  private createNoiseBuffer(): AudioBuffer {
    const bufferSize = this.ctx!.sampleRate * 0.5;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  play(getSong: () => Song, onStep?: (step: number) => void): void {
    if (this.state === "playing") return;
    if (!this.ctx || !this.masterGain) {
      console.error("AudioEngine not initialized. Call init() first.");
      return;
    }

    this.state = "playing";
    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;

    const initialSong = getSong();
    const secondsPerBeat = 60 / initialSong.bpm;
    const secondsPerStep = secondsPerBeat / initialSong.stepsPerBeat;
    const total = totalSteps(initialSong);

    const scheduler = () => {
      if (!this.ctx || this.state !== "playing") return;

      const currentSong = getSong();

      while (this.nextNoteTime < this.ctx.currentTime + this.LOOKAHEAD) {
        this.scheduleStep(currentSong, this.currentStep, this.nextNoteTime, secondsPerStep);

        if (onStep) {
          const stepToReport = this.currentStep;
          const timeUntilStep = (this.nextNoteTime - this.ctx.currentTime) * 1000;
          setTimeout(() => {
            if (this.state === "playing") {
              onStep(stepToReport);
            }
          }, Math.max(0, timeUntilStep));
        }

        this.nextNoteTime += secondsPerStep;
        this.currentStep++;

        if (this.currentStep >= total) {
          this.currentStep = 0;
        }
      }
    };

    this.schedulerInterval = setInterval(scheduler, this.SCHEDULE_INTERVAL);
    scheduler();
  }

  private scheduleStep(
    song: Song,
    step: number,
    time: number,
    secondsPerStep: number
  ): void {
    for (const note of song.melody.notes) {
      if (note.startStep === step) {
        const duration = note.durationSteps * secondsPerStep;
        this.playMelodyNote(note.note, time, duration, song.instrument);
      }
    }

    for (const hit of song.drums.hits) {
      if (hit.step === step) {
        this.playDrum(hit.drumId, time);
      }
    }
  }

  private playMelodyNote(
    noteName: string,
    startTime: number,
    duration: number,
    instrument: InstrumentId
  ): void {
    if (!this.ctx || !this.masterGain) return;

    switch (instrument) {
      case "piano":
        this.playPiano(noteName, startTime, duration);
        break;
      case "synth":
        this.playSynth(noteName, startTime, duration);
        break;
      case "marimba":
        this.playMarimba(noteName, startTime, duration);
        break;
      case "flute":
        this.playFlute(noteName, startTime, duration);
        break;
    }
  }

  private playPiano(noteName: string, startTime: number, duration: number): void {
    if (!this.ctx || !this.masterGain) return;

    const midi = noteNameToMidi(noteName);
    const freq = midiToFreq(midi);

    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.35, startTime + 0.005);
    gain.gain.setValueAtTime(0.35, startTime + duration - 0.03);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  private playSynth(noteName: string, startTime: number, duration: number): void {
    if (!this.ctx || !this.masterGain) return;

    const midi = noteNameToMidi(noteName);
    const freq = midiToFreq(midi);

    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2500, startTime);
    filter.frequency.exponentialRampToValueAtTime(900, startTime + 0.1);
    filter.Q.value = 3;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.25, startTime + 0.003);
    gain.gain.setValueAtTime(0.25, startTime + duration - 0.06);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  private playMarimba(noteName: string, startTime: number, duration: number): void {
    if (!this.ctx || !this.masterGain) return;

    const midi = noteNameToMidi(noteName);
    const freq = midiToFreq(midi);

    // Fundamental + 4th harmonic for marimba-like timbre
    const osc1 = this.ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = freq;

    const osc2 = this.ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = freq * 4;

    const decayTime = Math.min(duration, 0.6);

    const gain1 = this.ctx.createGain();
    gain1.gain.setValueAtTime(0, startTime);
    gain1.gain.linearRampToValueAtTime(0.45, startTime + 0.002);
    gain1.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime);

    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0, startTime);
    gain2.gain.linearRampToValueAtTime(0.15, startTime + 0.002);
    gain2.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime * 0.3);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);

    osc1.start(startTime);
    osc1.stop(startTime + decayTime + 0.01);
    osc2.start(startTime);
    osc2.stop(startTime + decayTime * 0.3 + 0.01);
  }

  private playFlute(noteName: string, startTime: number, duration: number): void {
    if (!this.ctx || !this.masterGain) return;

    const midi = noteNameToMidi(noteName);
    const freq = midiToFreq(midi);

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;

    // Faint 2nd harmonic for breath warmth
    const osc2 = this.ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = freq * 2;

    const attack = Math.min(0.08, duration * 0.2);
    const release = Math.min(0.1, duration * 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + attack);
    gain.gain.setValueAtTime(0.3, startTime + duration - release);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0, startTime);
    gain2.gain.linearRampToValueAtTime(0.06, startTime + attack);
    gain2.gain.setValueAtTime(0.06, startTime + duration - release);
    gain2.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
    osc2.start(startTime);
    osc2.stop(startTime + duration + 0.01);
  }

  private playDrum(drumId: DrumId, time: number): void {
    if (!this.ctx || !this.masterGain) return;

    switch (drumId) {
      case "kick":
        this.playKick(time);
        break;
      case "snare":
        this.playSnare(time);
        break;
      case "hihat":
        this.playHihat(time);
        break;
    }
  }

  private playKick(time: number): void {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  private playSnare(time: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 3000;
    filter.Q.value = 1;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 180;

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.4, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.15);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  private playHihat(time: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    this.state = "stopped";
    this.currentStep = 0;
  }

  getState(): TransportState {
    return this.state;
  }

  async playNotePreview(noteName: string, instrument: InstrumentId): Promise<void> {
    await this.init();
    if (!this.ctx) return;
    this.playMelodyNote(noteName, this.ctx.currentTime, 0.3, instrument);
  }

  async playDrumPreview(drumId: DrumId): Promise<void> {
    await this.init();
    if (!this.ctx) return;
    this.playDrum(drumId, this.ctx.currentTime);
  }
}
