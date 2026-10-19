import type { AudioStem } from '../../types/manifest';

interface Segment {
  file: string;
  startFrame: number;
  frameCount: number;
  trimStartFrames: number;
  bytes: number;
}
interface Manifest {
  version: number;
  sampleRate: number;
  totalFrames: number;
  segmentFrames: number;
  segments: Segment[];
}
interface Voice {
  gain: GainNode;
  pan?: StereoPannerNode;
}
interface Source {
  id: string;
  end: number;
  node: AudioBufferSourceNode;
}

/** A bounded, sample-aligned Web Audio transport. Every voice shares one clock.
 * Only schedule a time slice when ALL active voices have that slice ready. */
export class SegmentedAudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private stems = new Map<string, AudioStem>();
  private manifests = new Map<string, Manifest>();
  private buffers = new Map<string, AudioBuffer>();
  private voices = new Map<string, Voice>();
  private sources = new Map<string, Source>();
  private active: string[] = [];
  private epoch: number | null = null;
  private progress = 0;
  private duration = 0;
  private generation = 0;
  private controller = new AbortController();
  private timer: number | null = null;
  private pending: Promise<void> | null = null;
  private wantsPlayback = false;
  private buffering = false;
  private error = '';
  private solo: string | null = null;
  private enabled = new Map<string, boolean>();
  private disposed = false;
  private volume = 0.88;

  async init() {
    if (this.disposed) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.context.destination);
      this.timer = window.setInterval(() => this.tick(), 50);
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }
  isPlaying() {
    return this.epoch !== null;
  }
  isBuffering() {
    return this.buffering;
  }
  getError() {
    return this.error;
  }
  getDuration() {
    return this.duration;
  }
  getCurrentTime() {
    return Math.min(
      this.duration || Infinity,
      this.epoch === null ? this.progress : Math.max(0, this.context!.currentTime - this.epoch),
    );
  }
  hasPlayableActiveStems() {
    return this.active.length > 0 && this.duration > 0;
  }

  private cancelLoads() {
    this.generation++;
    this.controller.abort();
    this.controller = new AbortController();
    this.pending = null;
  }
  private stopSources(id?: string) {
    for (const [key, source] of this.sources)
      if (!id || source.id === id) {
        source.node.onended = null;
        try {
          source.node.stop();
        } catch {
          /* ended */
        }
        source.node.disconnect();
        this.sources.delete(key);
      }
  }
  pause() {
    this.progress = this.getCurrentTime();
    this.epoch = null;
    this.wantsPlayback = false;
    this.buffering = false;
    this.cancelLoads();
    this.stopSources();
  }
  stop() {
    this.pause();
    this.progress = 0;
    this.active = [];
  }
  async play(stems: AudioStem[]) {
    this.stop();
    return this.setActiveStems(
      stems,
      stems.map((s) => s.id),
      { playWhenReady: true },
    );
  }
  async preload(stems: AudioStem[]) {
    return this.setActiveStems(
      stems,
      stems.map((s) => s.id),
      { load: true },
    );
  }
  async resume() {
    return this.setActiveStems([...this.stems.values()], this.active, { playWhenReady: true });
  }

  async setActiveStems(
    stems: AudioStem[],
    ids: string[],
    options: { load?: boolean; playWhenReady?: boolean } = {},
  ) {
    if (this.disposed) return null;
    stems.forEach((s) => {
      this.stems.set(s.id, s);
      if (!this.enabled.has(s.id)) this.enabled.set(s.id, s.defaultEnabled);
    });
    const next = [...new Set(ids.filter((id) => this.stems.has(id)))];
    const wasPlaying = this.isPlaying() || this.wantsPlayback;
    this.active.filter((id) => !next.includes(id)).forEach((id) => this.stopSources(id));
    if (this.isPlaying() && next.some((id) => !this.active.includes(id))) {
      this.progress = this.getCurrentTime();
      this.epoch = null;
      this.stopSources();
    }
    this.active = next;
    this.cancelLoads();
    if (!next.length) {
      this.pause();
      return null;
    }
    if (options.load === false) return null;
    this.wantsPlayback = options.playWhenReady === true || wasPlaying;
    this.buffering = !this.isPlaying();
    this.error = '';
    const generation = this.generation;
    try {
      await this.init();
      if (this.disposed || generation !== this.generation) return null;
      await this.loadAhead(8);
      if (generation !== this.generation || this.disposed) return null;
      if (this.wantsPlayback && !this.isPlaying()) this.startClock();
      this.buffering = false;
      this.tick();
      return null;
    } catch (error) {
      return this.loadFailed(error, generation);
    }
  }
  seek(seconds: number) {
    const shouldPlay = this.wantsPlayback || this.isPlaying();
    this.pause();
    this.progress = Math.max(0, Math.min(seconds, this.duration));
    if (this.progress >= this.duration && this.duration) this.progress = 0;
    if (shouldPlay) void this.resume();
  }
  setStemEnabled(id: string, enabled: boolean) {
    this.enabled.set(id, enabled);
    this.mix();
  }
  setSoloStem(id: string | null) {
    this.solo = id;
    this.mix();
  }
  setMasterVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.02);
  }
  private mix() {
    if (!this.context) return;
    for (const [id, v] of this.voices) {
      const audible =
        this.active.includes(id) && (this.solo ? this.solo === id : this.enabled.get(id));
      v.gain.gain.setTargetAtTime(
        audible ? (this.stems.get(id)?.gain ?? 1) : 0,
        this.context.currentTime,
        0.015,
      );
    }
  }
  private voice(id: string) {
    let voice = this.voices.get(id);
    if (!voice) {
      const gain = this.context!.createGain();
      const pan = this.context!.createStereoPanner?.();
      if (pan) {
        pan.pan.value = this.stems.get(id)?.stereoPan ?? 0;
        gain.connect(pan);
        pan.connect(this.master!);
      } else gain.connect(this.master!);
      voice = { gain, pan };
      this.voices.set(id, voice);
      this.mix();
    }
    return voice;
  }
  private startClock() {
    if (!this.context || !this.wantsPlayback || !this.active.length) return;
    if (this.progress >= this.duration) this.progress = 0;
    this.epoch = this.context.currentTime + 0.08 - this.progress;
    this.buffering = false;
  }
  private loadFailed(error: unknown, generation: number) {
    if (generation !== this.generation || this.disposed) return null;
    this.pause();
    this.error = error instanceof Error ? error.message : '音频加载失败，请重试。';
    return this.error;
  }
  private async loadAhead(seconds: number) {
    if (this.pending) return this.pending;
    const generation = this.generation,
      signal = this.controller.signal;
    const ids = [...this.active],
      progress = this.getCurrentTime();
    const work = (async () => {
      await Promise.all(
        ids.map(async (id) => {
          const stem = this.stems.get(id)!;
          if (!this.manifests.has(id)) {
            const response = await fetch(stem.segmentManifest!, { signal });
            if (!response.ok) throw new Error(`${stem.name}音频目录加载失败，请重试。`);
            const manifest: Manifest = await response.json();
            if (manifest.version !== 1 || !manifest.segments?.length || manifest.sampleRate <= 0)
              throw new Error('音频目录格式异常。');
            if (generation !== this.generation) return;
            this.manifests.set(id, manifest);
          }
        }),
      );
      if (generation !== this.generation) return;
      this.duration = Math.max(
        ...ids.map(
          (id) => this.manifests.get(id)!.totalFrames / this.manifests.get(id)!.sampleRate,
        ),
      );
      const jobs: (() => Promise<void>)[] = [];
      for (const id of ids) {
        const manifest = this.manifests.get(id)!;
        manifest.segments.forEach((segment, index) => {
          const start = segment.startFrame / manifest.sampleRate,
            end = (segment.startFrame + segment.frameCount) / manifest.sampleRate;
          const key = `${id}:${index}`;
          if (end <= progress || start >= progress + seconds || this.buffers.has(key)) return;
          jobs.push(async () => {
            if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
            const url = new URL(
              segment.file,
              new URL(this.stems.get(id)!.segmentManifest!, location.href),
            );
            const response = await fetch(url, { signal });
            if (!response.ok) throw new Error(`${this.stems.get(id)!.name}音频加载失败，请重试。`);
            const data = await response.arrayBuffer();
            if (signal.aborted) return;
            const buffer = await this.context!.decodeAudioData(data);
            if (generation !== this.generation || this.disposed) return;
            const expected = (segment.frameCount + segment.trimStartFrames) / manifest.sampleRate;
            if (Math.abs(buffer.duration - expected) > 2 / manifest.sampleRate)
              throw new Error('音频片段长度异常，已停止以避免声部错位。');
            this.buffers.set(key, buffer);
          });
        });
      }
      let cursor = 0;
      await Promise.all(
        Array.from({ length: Math.min(6, jobs.length) }, async () => {
          while (cursor < jobs.length) {
            const job = jobs[cursor++];
            await job();
          }
        }),
      );
    })();
    this.pending = work;
    try {
      await work;
    } finally {
      if (this.pending === work) this.pending = null;
    }
  }
  private tick() {
    if (!this.context || this.disposed || !this.wantsPlayback || !this.duration) return;
    const progress = this.getCurrentTime();
    if (progress >= this.duration) {
      this.pause();
      this.progress = 0;
      void this.resume();
      return;
    }
    if (this.isPlaying()) {
      // A common contiguous horizon prevents one voice running past the others.
      let coverage = this.duration;
      for (const id of this.active) {
        const m = this.manifests.get(id);
        if (!m) {
          coverage = progress;
          break;
        }
        for (let i = 0; i < m.segments.length; i++) {
          const s = m.segments[i],
            end = (s.startFrame + s.frameCount) / m.sampleRate;
          if (end <= progress) continue;
          if (!this.buffers.has(`${id}:${i}`)) {
            coverage = Math.min(coverage, s.startFrame / m.sampleRate);
            break;
          }
        }
      }
      if (coverage <= progress + 0.02) {
        this.progress = Math.min(progress, coverage);
        this.epoch = null;
        this.stopSources();
        this.buffering = true;
      } else {
        // Read the clock once. Per-node reads can shift voices onto different
        // render quanta when joining or seeking during a busy frame.
        const earliestStart = this.context.currentTime + 0.04;
        for (const id of this.active) {
          const m = this.manifests.get(id)!;
          m.segments.forEach((s, i) => {
            const start = s.startFrame / m.sampleRate,
              end = (s.startFrame + s.frameCount) / m.sampleRate,
              key = `${id}:${i}`;
            if (
              end <= progress ||
              start >= Math.min(coverage, progress + 8) ||
              this.sources.has(key)
            )
              return;
            const buffer = this.buffers.get(key);
            if (!buffer) return;
            const when = Math.max(this.epoch! + start, earliestStart);
            const offset = Math.max(0, when - this.epoch! - start);
            if (offset >= end - start) return;
            const node = this.context!.createBufferSource();
            node.buffer = buffer;
            node.connect(this.voice(id).gain);
            this.sources.set(key, { id, end, node });
            node.onended = () => {
              node.disconnect();
              if (this.sources.get(key)?.node === node) this.sources.delete(key);
            };
            node.start(when, offset + s.trimStartFrames / m.sampleRate, end - start - offset);
          });
        }
      }
    }
    // Keep at most the rolling window (plus one previous slice), not five minutes of PCM.
    for (const key of this.buffers.keys()) {
      const [id, index] = key.split(':'),
        m = this.manifests.get(id)!,
        s = m.segments[Number(index)];
      if (
        !this.active.includes(id) ||
        (s.startFrame + s.frameCount) / m.sampleRate < progress - 4 ||
        s.startFrame / m.sampleRate > progress + 24
      )
        this.buffers.delete(key);
    }
    if (!this.pending) {
      const generation = this.generation;
      void this.loadAhead(12)
        .then(() => {
          if (generation === this.generation && this.wantsPlayback && this.buffering) {
            this.startClock();
            this.tick();
          }
        })
        .catch((error) => this.loadFailed(error, generation));
    }
  }
  dispose() {
    this.pause();
    this.disposed = true;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.voices.forEach((v) => {
      v.gain.disconnect();
      v.pan?.disconnect();
    });
    this.voices.clear();
    this.buffers.clear();
    this.manifests.clear();
    this.stems.clear();
    if (this.context) void this.context.close();
    this.context = null;
    this.master = null;
  }
}
