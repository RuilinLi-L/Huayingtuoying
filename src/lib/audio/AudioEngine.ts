import type { AudioStem } from '../../types/manifest';

interface ActiveStemNodes {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  pannerNode?: StereoPannerNode;
}

interface StemLoadFailure {
  stemId: string;
  stemName: string;
  message: string;
}

const STEM_LOAD_CONCURRENCY = 2;

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loadingPromises = new Map<string, Promise<AudioBuffer>>();
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
    this.registerStems(stems);

    if (!this.context) {
      return null;
    }

    const failures = await this.loadStemIds(stems.map((stem) => stem.id));
    this.refreshCompositionDuration();
    return this.formatLoadFailures(failures);
  }

  async play(stems: AudioStem[]) {
    await this.ensureContext(false);
    this.registerStems(stems);
    this.activeStemIds = new Set(stems.map((stem) => stem.id));
    this.pausedProgress = 0;
    this.stopActiveNodes();

    const failures = await this.loadStemIds(Array.from(this.activeStemIds));
    this.refreshCompositionDuration();

    if (this.hasLoadedBuffers(this.activeStemIds)) {
      await this.resume();
    } else {
      this.playing = false;
      this.playbackStartedAt = null;
    }

    return this.formatLoadFailures(failures);
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
    await this.ensureContext(false);
    this.registerStems(stems);

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
      return null;
    }

    const failures = await this.loadStemIds(Array.from(nextActiveStemIds));
    this.refreshCompositionDuration();

    if (!this.hasLoadedBuffers(nextActiveStemIds)) {
      this.pauseClock(false);
      return this.formatLoadFailures(failures);
    }

    if (!this.playing) {
      this.pausedProgress = currentProgress;
      await this.resume();
      return this.formatLoadFailures(failures);
    }

    await this.ensureContext(true);

    nextActiveStemIds.forEach((stemId) => {
      if (!this.activeNodes.has(stemId) && this.buffers.has(stemId)) {
        this.startStem(stemId, currentProgress);
      }
    });

    this.applyMix();
    return this.formatLoadFailures(failures);
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
    this.loadingPromises.clear();
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

  private registerStems(stems: AudioStem[]) {
    stems.forEach((stem) => {
      this.stemMap.set(stem.id, stem);
      if (!this.enabledState.has(stem.id)) {
        this.enabledState.set(stem.id, stem.defaultEnabled);
      }
    });
  }

  private hasLoadedBuffers(stemIds: Iterable<string>) {
    for (const stemId of stemIds) {
      if (this.buffers.has(stemId)) {
        return true;
      }
    }

    return false;
  }

  private async loadStemIds(stemIds: string[]) {
    const uniqueStemIds = [...new Set(stemIds.filter((stemId) => this.stemMap.has(stemId)))];
    const failures: StemLoadFailure[] = [];

    for (let index = 0; index < uniqueStemIds.length; index += STEM_LOAD_CONCURRENCY) {
      const chunk = uniqueStemIds.slice(index, index + STEM_LOAD_CONCURRENCY);
      const results = await Promise.allSettled(
        chunk.map((stemId) => this.loadStemBuffer(stemId)),
      );

      results.forEach((result, resultIndex) => {
        if (result.status === 'fulfilled') {
          return;
        }

        failures.push(this.createLoadFailure(chunk[resultIndex], result.reason));
      });
    }

    return failures;
  }

  private async loadStemBuffer(stemId: string) {
    const cachedBuffer = this.buffers.get(stemId);
    if (cachedBuffer) {
      return cachedBuffer;
    }

    const existingPromise = this.loadingPromises.get(stemId);
    if (existingPromise) {
      return existingPromise;
    }

    const stem = this.stemMap.get(stemId);
    if (!stem) {
      throw new Error(`找不到音轨 ${stemId}`);
    }

    if (!this.context) {
      throw new Error('音频上下文尚未初始化');
    }

    const loadPromise = (async () => {
      const response = await fetch(stem.file);
      if (!response.ok) {
        throw new Error(`请求 ${stem.file} 失败（HTTP ${response.status}）`);
      }

      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (contentType.includes('text/html')) {
        throw new Error(
          `请求 ${stem.file} 返回了 HTML 页面，通常表示线上文件不存在或被路由回退到了 index.html`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer.byteLength) {
        throw new Error(`请求 ${stem.file} 返回了空文件`);
      }

      try {
        const audioBuffer = await this.context!.decodeAudioData(arrayBuffer.slice(0));
        this.buffers.set(stemId, audioBuffer);
        return audioBuffer;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(
          `解码 ${stem.file} 失败${contentType ? `（${contentType}）` : ''}：${reason}`,
        );
      }
    })().finally(() => {
      this.loadingPromises.delete(stemId);
    });

    this.loadingPromises.set(stemId, loadPromise);
    return loadPromise;
  }

  private createLoadFailure(stemId: string, error: unknown): StemLoadFailure {
    const stem = this.stemMap.get(stemId);
    return {
      stemId,
      stemName: stem?.name ?? stemId,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  private formatLoadFailures(failures: StemLoadFailure[]) {
    if (!failures.length) {
      return null;
    }

    const detail = failures
      .map((failure) => `${failure.stemName}：${failure.message}`)
      .join('；');

    return `音频加载异常。${detail}`;
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
