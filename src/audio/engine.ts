import { CacheStorage, SplendidGrandPiano } from "smplr";
import type { DrumId, InstrumentId, Song } from "@/core/types";
import { noteNameToMidi, totalSteps, PITCH_RANGE_MIN, PITCH_RANGE_MAX } from "@/core/utils";

export type TransportState = "stopped" | "playing";

// A target for synthesis: any audio context (real-time or offline) plus the
// master gain and noise buffer created on it. Parameterizing synthesis by the
// target lets the exact same voices render both live (AudioContext) and offline
// (OfflineAudioContext for WAV export), so exported audio matches playback.
// `piano` is the sampled piano when its samples are ready, or null to fall
// back to the synthesized piano voice.
type RenderTarget = {
  ctx: BaseAudioContext;
  master: GainNode;
  noiseBuffer: AudioBuffer;
  piano: SplendidGrandPiano | null;
};

// Sampled piano (smplr SplendidGrandPiano). Loading every velocity layer would
// fetch ~300 files, so restrict to one mid-loud layer over the app's full
// pitch range (C2–C7) — small download, still a real piano recording.
const PIANO_VELOCITY_RANGE: [number, number] = [85, 100];
const PIANO_VELOCITY = 90;
const PIANO_SAMPLE_CACHE = "beatbubble-piano-samples";

function pianoNotesToLoad(): number[] {
  const min = noteNameToMidi(PITCH_RANGE_MIN);
  const max = noteNameToMidi(PITCH_RANGE_MAX);
  const notes: number[] = [];
  for (let midi = min; midi <= max; midi++) {
    notes.push(midi);
  }
  return notes;
}

function createSampledPiano(ctx: BaseAudioContext, destination: AudioNode): SplendidGrandPiano {
  return SplendidGrandPiano(ctx, {
    // Self-hosted (see public/samples/piano/README.md): school networks
    // whitelist the app's domain but not third-party CDNs, and a load failure
    // silently falls back to the 8bit voice — keep samples same-origin.
    baseUrl: "/samples/piano",
    destination,
    storage: CacheStorage(PIANO_SAMPLE_CACHE),
    velocity: PIANO_VELOCITY,
    notesToLoad: { notes: pianoNotesToLoad(), velocityRange: PIANO_VELOCITY_RANGE },
  });
}

// Seconds of silence/decay rendered after one loop so sustained notes and drum
// tails ring out instead of being clipped at the loop boundary.
const EXPORT_TAIL_SECONDS = 1.5;
const EXPORT_SAMPLE_RATE = 44100;

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function createNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const bufferSize = Math.floor(ctx.sampleRate * 0.5);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private state: TransportState = "stopped";
  private schedulerInterval: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime = 0;
  private currentStep = 0;
  private noiseBuffer: AudioBuffer | null = null;
  private piano: SplendidGrandPiano | null = null;
  private pianoReady = false;

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
      this.noiseBuffer = createNoiseBuffer(this.ctx);
    }
    if (!this.piano) {
      // Kick off sample loading without awaiting: playback falls back to the
      // synthesized piano until samples are ready, then switches over.
      this.piano = createSampledPiano(this.ctx, this.masterGain);
      this.piano.ready
        .then(() => {
          this.pianoReady = true;
        })
        .catch((err) => {
          console.warn("Piano samples failed to load; using synthesized piano.", err);
        });
    }
  }

  // The live (real-time) render target, or null if not initialized.
  private liveTarget(): RenderTarget | null {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return null;
    return {
      ctx: this.ctx,
      master: this.masterGain,
      noiseBuffer: this.noiseBuffer,
      piano: this.pianoReady ? this.piano : null,
    };
  }

  play(getSong: () => Song, onStep?: (step: number) => void): void {
    if (this.state === "playing") return;
    const target = this.liveTarget();
    if (!target || !this.ctx) {
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
        this.scheduleStep(target, currentSong, this.currentStep, this.nextNoteTime, secondsPerStep);

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

  // Render one loop of the song (plus a short tail) offline and return the
  // resulting AudioBuffer. Used for WAV export; does not touch live playback.
  async renderOffline(song: Song): Promise<AudioBuffer> {
    const secondsPerBeat = 60 / song.bpm;
    const secondsPerStep = secondsPerBeat / song.stepsPerBeat;
    const total = totalSteps(song);
    const loopDuration = total * secondsPerStep;
    const renderDuration = loopDuration + EXPORT_TAIL_SECONDS;

    const length = Math.ceil(renderDuration * EXPORT_SAMPLE_RATE);
    const offline = new OfflineAudioContext(1, length, EXPORT_SAMPLE_RATE);

    const master = offline.createGain();
    master.gain.value = 0.5;
    master.connect(offline.destination);

    // Load the sampled piano on the offline context too, so exported audio
    // matches playback. On load failure fall back to the synthesized piano.
    let piano: SplendidGrandPiano | null = null;
    if (song.instrument === "piano" && song.melody.notes.length > 0) {
      try {
        piano = createSampledPiano(offline, master);
        await piano.ready;
      } catch (err) {
        console.warn("Piano samples failed to load for export; using synthesized piano.", err);
        piano = null;
      }
    }

    const target: RenderTarget = {
      ctx: offline,
      master,
      noiseBuffer: createNoiseBuffer(offline),
      piano,
    };

    for (let step = 0; step < total; step++) {
      this.scheduleStep(target, song, step, step * secondsPerStep, secondsPerStep);
    }

    return offline.startRendering();
  }

  private scheduleStep(
    target: RenderTarget,
    song: Song,
    step: number,
    time: number,
    secondsPerStep: number
  ): void {
    for (const note of song.melody.notes) {
      if (note.startStep === step) {
        const duration = note.durationSteps * secondsPerStep;
        this.playMelodyNote(target, note.note, time, duration, song.instrument);
      }
    }

    for (const hit of song.drums.hits) {
      if (hit.step === step) {
        this.playDrum(target, hit.drumId, time);
      }
    }
  }

  private playMelodyNote(
    target: RenderTarget,
    noteName: string,
    startTime: number,
    duration: number,
    instrument: InstrumentId
  ): void {
    switch (instrument) {
      case "piano":
        this.playPiano(target, noteName, startTime, duration);
        break;
      case "8bit":
        this.playEightBit(target, noteName, startTime, duration);
        break;
      case "synth":
        this.playSynth(target, noteName, startTime, duration);
        break;
      case "marimba":
        this.playMarimba(target, noteName, startTime, duration);
        break;
      case "flute":
        this.playFlute(target, noteName, startTime, duration);
        break;
    }
  }

  private playPiano(
    target: RenderTarget,
    noteName: string,
    startTime: number,
    duration: number
  ): void {
    // Sampled piano when ready; 8bit voice as fallback while loading.
    if (target.piano) {
      target.piano.start({ note: noteNameToMidi(noteName), time: startTime, duration });
      return;
    }
    this.playEightBit(target, noteName, startTime, duration);
  }

  // Triangle wave held at constant volume — BeatBubble's original "piano"
  // voice, kept as its own chiptune-style instrument.
  private playEightBit(
    target: RenderTarget,
    noteName: string,
    startTime: number,
    duration: number
  ): void {
    const { ctx, master } = target;
    const midi = noteNameToMidi(noteName);
    const freq = midiToFreq(midi);

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.35, startTime + 0.005);
    gain.gain.setValueAtTime(0.35, startTime + duration - 0.03);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(master);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  private playSynth(
    target: RenderTarget,
    noteName: string,
    startTime: number,
    duration: number
  ): void {
    const { ctx, master } = target;
    const midi = noteNameToMidi(noteName);
    const freq = midiToFreq(midi);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2500, startTime);
    filter.frequency.exponentialRampToValueAtTime(900, startTime + 0.1);
    filter.Q.value = 3;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.25, startTime + 0.003);
    gain.gain.setValueAtTime(0.25, startTime + duration - 0.06);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  private playMarimba(
    target: RenderTarget,
    noteName: string,
    startTime: number,
    duration: number
  ): void {
    const { ctx, master } = target;
    const midi = noteNameToMidi(noteName);
    const freq = midiToFreq(midi);

    // Fundamental + 4th harmonic for marimba-like timbre
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = freq;

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = freq * 4;

    const decayTime = Math.min(duration, 0.6);

    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0, startTime);
    gain1.gain.linearRampToValueAtTime(0.45, startTime + 0.002);
    gain1.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, startTime);
    gain2.gain.linearRampToValueAtTime(0.15, startTime + 0.002);
    gain2.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime * 0.3);

    osc1.connect(gain1);
    gain1.connect(master);
    osc2.connect(gain2);
    gain2.connect(master);

    osc1.start(startTime);
    osc1.stop(startTime + decayTime + 0.01);
    osc2.start(startTime);
    osc2.stop(startTime + decayTime * 0.3 + 0.01);
  }

  private playFlute(
    target: RenderTarget,
    noteName: string,
    startTime: number,
    duration: number
  ): void {
    const { ctx, master } = target;
    const midi = noteNameToMidi(noteName);
    const freq = midiToFreq(midi);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;

    // Faint 2nd harmonic for breath warmth
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = freq * 2;

    const attack = Math.min(0.08, duration * 0.2);
    const release = Math.min(0.1, duration * 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + attack);
    gain.gain.setValueAtTime(0.3, startTime + duration - release);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, startTime);
    gain2.gain.linearRampToValueAtTime(0.06, startTime + attack);
    gain2.gain.setValueAtTime(0.06, startTime + duration - release);
    gain2.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(master);
    osc2.connect(gain2);
    gain2.connect(master);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
    osc2.start(startTime);
    osc2.stop(startTime + duration + 0.01);
  }

  private playDrum(target: RenderTarget, drumId: DrumId, time: number): void {
    switch (drumId) {
      case "kick":
        this.playKick(target, time);
        break;
      case "snare":
        this.playSnare(target, time);
        break;
      case "hihat":
        this.playHihat(target, time);
        break;
    }
  }

  private playKick(target: RenderTarget, time: number): void {
    const { ctx, master } = target;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    osc.connect(gain);
    gain.connect(master);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  private playSnare(target: RenderTarget, time: number): void {
    const { ctx, master, noiseBuffer } = target;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 3000;
    filter.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 180;

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.4, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.connect(oscGain);
    oscGain.connect(master);

    noise.start(time);
    noise.stop(time + 0.15);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  private playHihat(target: RenderTarget, time: number): void {
    const { ctx, master, noiseBuffer } = target;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    // Cut already-scheduled sampled-piano voices so Stop is immediate.
    if (this.pianoReady && this.piano) {
      this.piano.stop();
    }
    this.state = "stopped";
    this.currentStep = 0;
  }

  // Stop the scheduler and tear down the AudioContext. Call when the editor
  // unmounts (e.g. navigating away mid-playback) so audio can't keep running.
  dispose(): void {
    this.stop();
    if (this.piano) {
      try {
        this.piano.dispose();
      } catch {
        // Disposing mid-load can throw; the context teardown below cleans up.
      }
      this.piano = null;
      this.pianoReady = false;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.masterGain = null;
      this.noiseBuffer = null;
    }
  }

  getState(): TransportState {
    return this.state;
  }

  async playNotePreview(noteName: string, instrument: InstrumentId): Promise<void> {
    await this.init();
    const target = this.liveTarget();
    if (!target) return;
    this.playMelodyNote(target, noteName, target.ctx.currentTime, 0.3, instrument);
  }

  async playDrumPreview(drumId: DrumId): Promise<void> {
    await this.init();
    const target = this.liveTarget();
    if (!target) return;
    this.playDrum(target, drumId, target.ctx.currentTime);
  }
}
