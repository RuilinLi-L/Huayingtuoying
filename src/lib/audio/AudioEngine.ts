import type { AudioStem } from '../../types/manifest';

interface ActiveStemNodes {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  pannerNode?: StereoPannerNode;
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private activeNodes = new Map<string, ActiveStemNodes>();
  private stemMap = new Map<string, AudioStem>();
  private enabledState = new Map<string, boolean>();
  private activeStemIds = new Set<string>();
  private soloStemId: string | null = null;
  private playing = false;
  private playbackStartedAt: number | null = null;
  private pausedProgress = 0;
  private compositionDuration = 0;

  async init() {
    await this.ensureContext(true);
  }

  async preload(stems: AudioStem[]) {
    await this.ensureContext(false);

    if (!this.context) {
      return;
    }

    await Promise.all(
      stems.map(async (stem) => {
        this.stemMap.set(stem.id, stem);
        if (!this.enabledState.has(stem.id)) {
          this.enabledState.set(stem.id, stem.defaultEnabled);
        }

        if (this.buffers.has(stem.id)) {
          return;
        }

        const response = await fetch(stem.file);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.context!.decodeAudioData(arrayBuffer.slice(0));
        this.buffers.set(stem.id, audioBuffer);
      }),
    );

    this.refreshCompositionDuration();
  }

  async play(stems: AudioStem[]) {
    await this.preload(stems);
    this.activeStemIds = new Set(stems.map((stem) => stem.id));
    this.pausedProgress = 0;
    this.stopActiveNodes();
    await this.resume();
  }

  stop() {
    this.stopActiveNodes();
    this.activeStemIds.clear();
    this.playing = false;
    this.playbackStartedAt = null;
    this.pausedProgress = 0;
  }

  pause() {
    this.pauseClock(false);
  }

  async resume() {
    if (!this.activeStemIds.size) {
      return;
    }

    await this.ensureContext(true);

    if (!this.context || this.playing) {
      return;
    }

    const startAt = this.normalizeCompositionTime(this.pausedProgress);
    this.playbackStartedAt = this.context.currentTime - startAt;
    this.playing = true;

    this.activeStemIds.forEach((stemId) => {
      this.startStem(stemId, startAt);
    });

    this.applyMix();
  }

  async setActiveStems(stems: AudioStem[], activeStemIds: string[]) {
    await this.preload(stems);

    const nextActiveStemIds = new Set(
      activeStemIds.filter((stemId) => this.stemMap.has(stemId)),
    );
    const currentProgress = this.getCurrentTime();

    this.activeNodes.forEach((_, stemId) => {
      if (!nextActiveStemIds.has(stemId)) {
        this.stopStem(stemId);
      }
    });

    this.activeStemIds = nextActiveStemIds;

    if (!nextActiveStemIds.size) {
      this.pauseClock(true);
      return;
    }

    if (!this.playing) {
      this.pausedProgress = currentProgress;
      await this.resume();
      return;
    }

    await this.ensureContext(true);

    nextActiveStemIds.forEach((stemId) => {
      if (!this.activeNodes.has(stemId)) {
        this.startStem(stemId, currentProgress);
      }
    });

    this.applyMix();
  }

  isPlaying() {
    return this.playing;
  }

  getCurrentTime() {
    if (!this.context || this.playbackStartedAt === null || !this.playing) {
      return this.normalizeCompositionTime(this.pausedProgress);
    }

    return this.normalizeCompositionTime(this.context.currentTime - this.playbackStartedAt);
  }

  getDuration() {
    return this.compositionDuration;
  }

  seek(timeInSeconds: number) {
    const nextProgress = this.normalizeCompositionTime(timeInSeconds);
    this.pausedProgress = nextProgress;

    if (!this.playing) {
      return;
    }

    this.stopActiveNodes();

    if (!this.context) {
      this.playing = false;
      this.playbackStartedAt = null;
      return;
    }

    this.playbackStartedAt = this.context.currentTime - nextProgress;
    this.activeStemIds.forEach((stemId) => {
      this.startStem(stemId, nextProgress);
    });
    this.applyMix();
  }

  setStemEnabled(stemId: string, enabled: boolean) {
    this.enabledState.set(stemId, enabled);
    this.applyMix();
  }

  setSoloStem(stemId: string | null) {
    this.soloStemId = stemId;
    this.applyMix();
  }

  setMasterVolume(volume: number) {
    if (!this.masterGain || !this.context) {
      return;
    }

    this.masterGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.02);
  }

  dispose() {
    this.stop();
    if (this.context) {
      void this.context.close();
    }
    this.context = null;
    this.masterGain = null;
    this.buffers.clear();
    this.stemMap.clear();
    this.enabledState.clear();
    this.soloStemId = null;
    this.compositionDuration = 0;
  }

  private async ensureContext(resumeIfSuspended: boolean) {
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.88;
      this.masterGain.connect(this.context.destination);
    }

    if (resumeIfSuspended && this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  private refreshCompositionDuration() {
    this.compositionDuration = Math.max(
      0,
      ...Array.from(this.buffers.values(), (buffer) => buffer.duration || 0),
    );
  }

  private normalizeCompositionTime(timeInSeconds: number) {
    if (!this.compositionDuration) {
      return Math.max(0, timeInSeconds);
    }

    const normalized = timeInSeconds % this.compositionDuration;
    return normalized < 0 ? normalized + this.compositionDuration : normalized;
  }

  private getStemOffset(stemId: string, compositionTime: number) {
    const buffer = this.buffers.get(stemId);
    if (!buffer || !buffer.duration) {
      return 0;
    }

    if (!this.compositionDuration) {
      return this.normalizeCompositionTime(compositionTime) % buffer.duration;
    }

    const progressRatio =
      this.normalizeCompositionTime(compositionTime) / this.compositionDuration;

    return progressRatio * buffer.duration;
  }

  private startStem(stemId: string, compositionTime: number) {
    if (!this.context || !this.masterGain) {
      return;
    }

    const stem = this.stemMap.get(stemId);
    const buffer = this.buffers.get(stemId);
    if (!stem || !buffer) {
      return;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = buffer.duration;

    const gainNode = this.context.createGain();
    const supportsStereoPanner = 'createStereoPanner' in this.context;
    const pannerNode = supportsStereoPanner
      ? this.context.createStereoPanner()
      : undefined;

    if (pannerNode) {
      pannerNode.pan.value = stem.stereoPan ?? 0;
      source.connect(gainNode);
      gainNode.connect(pannerNode);
      pannerNode.connect(this.masterGain);
    } else {
      source.connect(gainNode);
      gainNode.connect(this.masterGain);
    }

    source.start(0, this.getStemOffset(stemId, compositionTime));
    this.activeNodes.set(stemId, { source, gainNode, pannerNode });
  }

  private pauseClock(clearActiveStemIds: boolean) {
    this.pausedProgress = this.getCurrentTime();
    this.stopActiveNodes();
    this.playing = false;
    this.playbackStartedAt = null;

    if (clearActiveStemIds) {
      this.activeStemIds.clear();
    }
  }

  private stopActiveNodes() {
    this.activeNodes.forEach((_, stemId) => {
      this.stopStem(stemId);
    });
  }

  private stopStem(stemId: string) {
    const nodes = this.activeNodes.get(stemId);
    if (!nodes) {
      return;
    }

    try {
      nodes.source.stop();
    } catch {
      // AudioBufferSourceNode can only be stopped once.
    }

    nodes.source.disconnect();
    nodes.gainNode.disconnect();
    nodes.pannerNode?.disconnect();
    this.activeNodes.delete(stemId);
  }

  private applyMix() {
    if (!this.context) {
      return;
    }

    this.activeNodes.forEach(({ gainNode }, stemId) => {
      const stem = this.stemMap.get(stemId);
      const enabled = this.enabledState.get(stemId) ?? true;
      const shouldPlay = this.soloStemId ? this.soloStemId === stemId : enabled;
      const targetGain = shouldPlay ? stem?.gain ?? 1 : 0;
      gainNode.gain.setTargetAtTime(targetGain, this.context!.currentTime, 0.02);
    });
  }
}
