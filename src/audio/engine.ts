import { Scheduler, SplendidGrandPiano, pianoToPreset } from "smplr";
import type { SampleLoader, Storage } from "smplr";
import type { DrumId, InstrumentId, NoteName, Song } from "@/core/types";
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
const PIANO_BASE_URL = "/samples/piano";

// How long sound may be delayed waiting for samples before falling back to
// the 8bit voice (the export path can afford a longer wait than the UI).
const PIANO_WAIT_PLAY_MS = 4000;
const PIANO_WAIT_PREVIEW_MS = 2000;
const PIANO_WAIT_EXPORT_MS = 15000;

// The pitch range whose samples we load, as MIDI numbers.
//
// A song's notes can never leave its own constraints, so loading that range is
// enough — and much cheaper than the app maximum: the default C4–C5 song needs
// 8 sample files where C2–C7 needs 44. It only ever GROWS (widening the range,
// or opening a wider song, adds files; narrowing keeps what's loaded), so a
// piano already built for a wider range stays valid.
//
// Correctness note: smplr plays *silence* for a note whose sample wasn't
// loaded, so this range must cover every note that can sound. Callers grow it
// before playing — see preloadPianoSamples (driven by the song's constraints)
// and renderOffline.
type MidiRange = { min: number; max: number };

let sampleRange: MidiRange | null = null;

// Widen the range to cover a song's pitch constraints. Never narrows.
function growSampleRange(minNote: NoteName, maxNote: NoteName): void {
  const min = noteNameToMidi(minNote);
  const max = noteNameToMidi(maxNote);
  sampleRange = sampleRange
    ? { min: Math.min(sampleRange.min, min), max: Math.max(sampleRange.max, max) }
    : { min, max };
}

// The range to derive presets from: whatever callers have asked for, or the app
// maximum if none has yet — heavier, but never silent.
function currentSampleRange(): MidiRange {
  return (
    sampleRange ?? {
      min: noteNameToMidi(PITCH_RANGE_MIN),
      max: noteNameToMidi(PITCH_RANGE_MAX),
    }
  );
}

// Identifies the current range, so the engine can tell its piano is stale.
function sampleRangeKey(): string {
  const { min, max } = currentSampleRange();
  return `${min}-${max}`;
}

// The preset-shaping options, shared by the piano instances and the preload so
// they derive the same sample list (detune/decayTime are required by
// pianoToPreset's type; the values are smplr's defaults).
function pianoPresetOptions() {
  const { min, max } = currentSampleRange();
  const notes: number[] = [];
  for (let midi = min; midi <= max; midi++) {
    notes.push(midi);
  }
  return {
    baseUrl: PIANO_BASE_URL,
    detune: 0,
    decayTime: 0.5,
    notesToLoad: { notes, velocityRange: PIANO_VELOCITY_RANGE },
  };
}

// Cache-API-backed storage for the piano samples. Unlike smplr's CacheStorage
// it (a) never caches non-200 responses — a deploy window serving 404s must
// not poison the cache forever, (b) purges any previously-cached bad entry,
// and (c) rejects on HTTP errors so `piano.ready` rejects and the 8bit
// fallback actually engages (smplr's own loader resolves ready on non-200 and
// then plays *silence* for every note whose buffer is missing).
const pianoStorage: Storage = {
  async fetch(url: string): Promise<Response> {
    const cache =
      typeof caches !== "undefined" ? await caches.open(PIANO_SAMPLE_CACHE).catch(() => null) : null;
    const cached = await cache?.match(url);
    if (cached) {
      if (cached.status === 200) return cached;
      await cache?.delete(url);
    }
    const response = await fetch(url);
    if (response.status !== 200) {
      throw new Error(`Piano sample request failed (${response.status}): ${url}`);
    }
    await cache?.put(url, response.clone()).catch(() => {});
    return response;
  },
};

function createSampledPiano(
  ctx: BaseAudioContext,
  destination: AudioNode,
  loader?: SampleLoader
): SplendidGrandPiano {
  return SplendidGrandPiano(ctx, {
    // Self-hosted (see public/samples/piano/README.md): school networks
    // whitelist the app's domain but not third-party CDNs — keep samples
    // same-origin.
    ...pianoPresetOptions(),
    destination,
    storage: pianoStorage,
    velocity: PIANO_VELOCITY,
    // Reuse the live piano's loader for offline export so already-decoded
    // buffers aren't re-fetched and re-decoded on every WAV export.
    loader,
    // smplr's default Scheduler dispatches events beyond its 200ms lookahead
    // from a real-time setInterval, which an OfflineAudioContext render
    // outruns — every note past 200ms would be dropped from WAV exports. An
    // effectively infinite lookahead makes start() schedule each voice
    // synchronously at its absolute time, which is also correct for live
    // playback (our own scheduler already stays within a 150ms lookahead).
    scheduler: Scheduler(ctx, { lookaheadMs: Number.MAX_SAFE_INTEGER }),
  });
}

// The sample names the piano will request, derived from the same preset
// smplr builds internally so the preload URLs match the loader's exactly.
function pianoSampleNames(): string[] {
  const preset = pianoToPreset(pianoPresetOptions());
  const names = new Set<string>();
  for (const group of preset.groups) {
    for (const region of group.regions) {
      names.add(region.sample);
    }
  }
  return [...names];
}

// Mirror of smplr's format pick (findFirstSupportedFormat, not exported):
// ogg everywhere except Safari/iPad, which can't decode it and gets m4a.
function preferredPianoFormat(): string {
  if (typeof document === "undefined") return "ogg";
  const ua = navigator.userAgent;
  const isSafari = ua.includes("Safari") && !ua.includes("Chrome") && !ua.includes("Chromium");
  const audio = document.createElement("audio");
  if (!isSafari && audio.canPlayType("audio/ogg")) return "ogg";
  if (audio.canPlayType("audio/m4a") || audio.canPlayType("audio/aac")) return "m4a";
  return "ogg";
}

// Warm the Cache API with the piano samples before any user gesture, so the
// first Play/preview doesn't race the download (the first notes used to come
// out as the 8bit fallback). Fetches through the same storage smplr reads
// from; no AudioContext is created here.
//
// Takes the song's pitch constraints so only the samples that song can sound
// are fetched (8 files for the default C4–C5, not the app maximum's 44). Call
// it whenever that range changes — widening it pulls just the new files, and
// the engine rebuilds its piano to match on the next init(). Every sample is
// requested at most once per page (which also absorbs React StrictMode's
// double-mounted effects).
const requestedSampleUrls = new Set<string>();

export function preloadPianoSamples(minNote: NoteName, maxNote: NoteName): void {
  if (typeof window === "undefined") return;
  growSampleRange(minNote, maxNote);
  const format = preferredPianoFormat();
  for (const name of pianoSampleNames()) {
    // Same escaping as smplr's loadAudioBuffer, so the cache keys match
    // (sample names contain "#" and spaces).
    const url = `${PIANO_BASE_URL}/${name}.${format}`
      .replace(/#/g, "%23")
      .replace(/ /g, "%20")
      .replace(/([^:]\/)\/+/g, "$1");
    if (requestedSampleUrls.has(url)) continue;
    requestedSampleUrls.add(url);
    pianoStorage.fetch(url).catch(() => {});
  }
}

// Resolve when `promise` settles or reject after `ms` — without leaving the
// timer running once the race is decided.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// Whether playing/exporting this song needs the sampled piano to be loaded.
function usesSampledPiano(song: Song): boolean {
  return song.instrument === "piano" && song.melody.notes.length > 0;
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
  // The pitch range `piano` was built for, so init() can spot a stale one.
  private pianoRangeKey: string | null = null;
  // Incremented by each play() call; see the epoch check in play().
  private playEpoch = 0;

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
    // Rebuild when the loaded pitch range has grown since this piano was made
    // (the child widened the range, or opened a wider song): its preset has no
    // samples for the new notes, and smplr renders those as silence. Both the
    // play and preview paths call init() before sounding anything, so this runs
    // in time; each then waits (bounded) on `ready`, falling back to the 8bit
    // voice while the added samples load rather than going quiet.
    const rangeKey = sampleRangeKey();
    if (!this.piano || this.pianoRangeKey !== rangeKey) {
      this.piano?.stop(); // silence any voices still held by the old instance
      this.pianoReady = false;
      this.pianoRangeKey = rangeKey;
      // Kick off sample loading without awaiting: playback falls back to the
      // synthesized piano until samples are ready, then switches over.
      const piano = createSampledPiano(this.ctx, this.masterGain);
      this.piano = piano;
      piano.ready
        .then(() => {
          // A later rebuild may have replaced it while this was loading.
          if (this.piano === piano) this.pianoReady = true;
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

  // Wait (bounded) for the piano samples so the first scheduled notes don't
  // come out as the 8bit fallback. Resolves early on load failure or timeout;
  // playback then proceeds with the fallback voice.
  private async waitForPianoReady(timeoutMs: number): Promise<void> {
    if (this.pianoReady || !this.piano) return;
    await withTimeout(this.piano.ready, timeoutMs).catch(() => {});
  }

  async play(getSong: () => Song, onStep?: (step: number) => void): Promise<void> {
    if (this.state === "playing") return;
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) {
      console.error("AudioEngine not initialized. Call init() first.");
      return;
    }

    this.state = "playing";
    // Identifies this play() invocation across the await below: a Play →
    // Stop → Play sequence while samples are loading parks two calls in
    // waitForPianoReady, and the state re-check alone can't tell "still my
    // playback" from "a newer play() restarted it" — without the epoch both
    // would start a scheduler interval and the first one would leak,
    // permanently uncancellable.
    const epoch = ++this.playEpoch;

    // When the song starts on the piano, wait for its samples first (bounded)
    // so the opening notes don't come out as the 8bit fallback.
    if (usesSampledPiano(getSong())) {
      await this.waitForPianoReady(PIANO_WAIT_PLAY_MS);
      if (this.state !== "playing" || epoch !== this.playEpoch) return;
    }

    if (!this.liveTarget()) {
      this.state = "stopped";
      return;
    }

    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;

    const initialSong = getSong();
    const secondsPerBeat = 60 / initialSong.bpm;
    const secondsPerStep = secondsPerBeat / initialSong.stepsPerBeat;
    const total = totalSteps(initialSong);

    const scheduler = () => {
      if (this.state !== "playing") return;
      // Re-resolve the target every tick instead of snapshotting it once:
      // target.piano reflects pianoReady at resolve time, so a snapshot taken
      // before the samples finished loading would pin the whole loop to the
      // 8bit fallback — audible when switching a playing song to the piano.
      const target = this.liveTarget();
      if (!target) return;

      const currentSong = getSong();

      while (this.nextNoteTime < target.ctx.currentTime + this.LOOKAHEAD) {
        this.scheduleStep(target, currentSong, this.currentStep, this.nextNoteTime, secondsPerStep);

        if (onStep) {
          const stepToReport = this.currentStep;
          const timeUntilStep = (this.nextNoteTime - target.ctx.currentTime) * 1000;
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
    // matches playback. Reusing the live piano's loader (when it exists)
    // means the already-decoded buffers are shared instead of re-fetched and
    // re-decoded on every export. Bounded so a stalled network can't hang the
    // export forever; on failure/timeout fall back to the 8bit voice.
    let piano: SplendidGrandPiano | null = null;
    if (usesSampledPiano(song)) {
      try {
        // Export doesn't go through init(), so cover this song's range here —
        // otherwise notes outside the loaded range would render as silence.
        growSampleRange(song.constraints.minNote, song.constraints.maxNote);
        piano = createSampledPiano(offline, master, this.piano?.loader);
        await withTimeout(piano.ready, PIANO_WAIT_EXPORT_MS);
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
    if (instrument === "piano") {
      // With the mount-time preload the samples are usually cached by now,
      // so this only covers the decode (~first click after page load).
      await this.waitForPianoReady(PIANO_WAIT_PREVIEW_MS);
    }
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
