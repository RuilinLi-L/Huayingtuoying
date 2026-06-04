import type { AudioStem } from '../../types/manifest';

interface StemPlaybackNodes {
  buffer: AudioBuffer;
  gainNode: GainNode;
  pannerNode?: StereoPannerNode;
  source: AudioBufferSourceNode | null;
}

interface StemLoadFailure {
  stemId: string;
  stemName: string;
  message: string;
}

const STEM_LOAD_CONCURRENCY = 3;
const STEM_FADE_IN_SECONDS = 0.035;
const MASTER_VOLUME_SMOOTH_SECONDS = 0.02;
const SOURCE_START_DELAY_SECONDS = 0.015;

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private stemNodes = new Map<string, StemPlaybackNodes>();
  private loadingPromises = new Map<string, Promise<StemPlaybackNodes>>();
  private stemMap = new Map<string, AudioStem>();
  private enabledState = new Map<string, boolean>();
  private activeStemIds = new Set<string>();
  private soloStemId: string | null = null;
  private playing = false;
  private playbackStartedAt: number | null = null;
  private pausedProgress = 0;
  private compositionDuration = 0;
  private operationId = 0;
  private pendingAudibleStemIds = new Set<string>();

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
    const operationId = ++this.operationId;

    await this.ensureContext(true);
    this.registerStems(stems);
    this.activeStemIds = new Set(stems.map((stem) => stem.id));
    this.pendingAudibleStemIds = new Set(this.activeStemIds);
    this.pausedProgress = 0;
    this.playing = false;
    this.playbackStartedAt = null;
    this.stopAllSources();
    this.applyMix();

    const failures = await this.loadStemIds(Array.from(this.activeStemIds));
    this.refreshCompositionDuration();

    if (!this.isOperationRelevant(operationId)) {
      return this.formatLoadFailures(failures);
    }

    if (this.hasPlayableActiveStems()) {
      await this.ensureContext(true);

      if (this.isOperationRelevant(operationId)) {
        this.startActiveStemsAt(0, { fadeIn: false, restartAll: true });
      }
    } else {
      this.playing = false;
      this.playbackStartedAt = null;
    }

    return this.formatLoadFailures(failures);
  }

  stop() {
    this.operationId += 1;
    this.stopAllSources();
    this.activeStemIds.clear();
    this.pendingAudibleStemIds.clear();
    this.playing = false;
    this.playbackStartedAt = null;
    this.pausedProgress = 0;
    this.applyMix();
  }

  pause() {
    this.operationId += 1;
    this.pauseClock(false);
  }

  async resume() {
    if (!this.hasPlayableActiveStems()) {
      return;
    }

    const operationId = this.operationId;

    await this.ensureContext(true);

    if (!this.context || this.playing || this.operationId !== operationId) {
      return;
    }

    this.startActiveStemsAt(this.pausedProgress, {
      fadeIn: false,
      restartAll: true,
    });
  }

  async setActiveStems(
    stems: AudioStem[],
    activeStemIds: string[],
    options: { load?: boolean; playWhenReady?: boolean } = {},
  ) {
    const operationId = ++this.operationId;
    const shouldPlayWhenReady = options.playWhenReady === true;

    await this.ensureContext(shouldPlayWhenReady);
    this.registerStems(stems);

    const nextActiveStemIds = new Set(
      activeStemIds.filter((stemId) => this.stemMap.has(stemId)),
    );
    const addedStemIds = new Set(
      Array.from(nextActiveStemIds).filter((stemId) => !this.activeStemIds.has(stemId)),
    );
    const removedStemIds = Array.from(this.activeStemIds).filter(
      (stemId) => !nextActiveStemIds.has(stemId),
    );
    const progressBeforeLoad = this.getCurrentTime();

    removedStemIds.forEach((stemId) => {
      this.pendingAudibleStemIds.delete(stemId);
      this.muteStemNow(stemId);
      this.stopStemSource(stemId);
    });

    this.activeStemIds = nextActiveStemIds;

    if (!nextActiveStemIds.size) {
      this.pauseClock(true);
      return null;
    }

    if (this.playing) {
      addedStemIds.forEach((stemId) => {
        this.pendingAudibleStemIds.add(stemId);
      });
      this.applyMix();
    }

    if (options.load === false) {
      if (!this.playing) {
        this.pausedProgress = progressBeforeLoad;
      }

      return null;
    }

    const failures = await this.loadStemIds(Array.from(nextActiveStemIds));
    this.refreshCompositionDuration();

    if (!this.isOperationRelevant(operationId)) {
      return this.formatLoadFailures(failures);
    }

    if (!this.hasLoadedStems(nextActiveStemIds)) {
      this.pauseClock(false);
      return this.formatLoadFailures(failures);
    }

    if (!this.playing) {
      if (shouldPlayWhenReady) {
        await this.ensureContext(true);

        if (this.isOperationRelevant(operationId)) {
          this.pausedProgress = progressBeforeLoad;
          this.startActiveStemsAt(progressBeforeLoad, {
            fadeIn: false,
            restartAll: true,
          });
        }

        return this.formatLoadFailures(failures);
      }

      this.pausedProgress = progressBeforeLoad;
      this.applyMix();
      return this.formatLoadFailures(failures);
    }

    await this.ensureContext(true);

    if (!this.isOperationRelevant(operationId) || !this.context) {
      return this.formatLoadFailures(failures);
    }

    const readyStemIds = Array.from(nextActiveStemIds).filter((stemId) => {
      const nodes = this.stemNodes.get(stemId);
      return nodes && (addedStemIds.has(stemId) || !nodes.source);
    });

    this.startStemIdsAtScheduledTime(readyStemIds, {
      fadeIn: true,
    });

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

  hasPlayableActiveStems() {
    return this.hasLoadedStems(this.activeStemIds);
  }

  seek(timeInSeconds: number) {
    const nextProgress = this.normalizeCompositionTime(timeInSeconds);
    this.pausedProgress = nextProgress;

    if (!this.playing) {
      return;
    }

    if (!this.context) {
      this.playing = false;
      this.playbackStartedAt = null;
      return;
    }

    this.playbackStartedAt = this.context.currentTime - nextProgress;
    this.startStemIdsAtScheduledTime(Array.from(this.activeStemIds), {
      fadeIn: false,
    });
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

    this.masterGain.gain.setTargetAtTime(
      volume,
      this.context.currentTime,
      MASTER_VOLUME_SMOOTH_SECONDS,
    );
  }

  dispose() {
    this.operationId += 1;
    this.stopAllSources();
    this.stemNodes.forEach((nodes) => {
      nodes.gainNode.disconnect();
      nodes.pannerNode?.disconnect();
    });

    if (this.context) {
      void this.context.close();
    }

    this.context = null;
    this.masterGain = null;
    this.stemNodes.clear();
    this.loadingPromises.clear();
    this.stemMap.clear();
    this.enabledState.clear();
    this.activeStemIds.clear();
    this.soloStemId = null;
    this.playing = false;
    this.playbackStartedAt = null;
    this.pausedProgress = 0;
    this.compositionDuration = 0;
    this.pendingAudibleStemIds.clear();
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
      ...Array.from(this.stemNodes.values(), ({ buffer }) =>
        Number.isFinite(buffer.duration) ? buffer.duration : 0,
      ),
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

  private hasLoadedStems(stemIds: Iterable<string>) {
    for (const stemId of stemIds) {
      if (this.stemNodes.has(stemId)) {
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
    const cachedNodes = this.stemNodes.get(stemId);
    if (cachedNodes) {
      return cachedNodes;
    }

    const existingPromise = this.loadingPromises.get(stemId);
    if (existingPromise) {
      return existingPromise;
    }

    const stem = this.stemMap.get(stemId);
    if (!stem) {
      throw new Error(`Missing audio stem: ${stemId}`);
    }

    if (!this.context || !this.masterGain) {
      throw new Error('Audio context is not initialized');
    }

    const loadingContext = this.context;
    const loadingMasterGain = this.masterGain;

    const loadPromise = (async () => {
      const response = await fetch(stem.file);

      if (!response.ok) {
        throw new Error(
          `Audio fetch failed (${response.status} ${response.statusText}): ${stem.file}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();

      if (this.context !== loadingContext || this.masterGain !== loadingMasterGain) {
        throw new Error('Audio context is no longer active');
      }

      let buffer: AudioBuffer;

      try {
        buffer = await loadingContext.decodeAudioData(arrayBuffer);
      } catch {
        throw new Error(`Audio decode failed: ${stem.file}`);
      }

      if (this.context !== loadingContext || this.masterGain !== loadingMasterGain) {
        throw new Error('Audio context is no longer active');
      }

      const gainNode = loadingContext.createGain();
      gainNode.gain.value = 0;

      const supportsStereoPanner = typeof loadingContext.createStereoPanner === 'function';
      const pannerNode = supportsStereoPanner
        ? loadingContext.createStereoPanner()
        : undefined;

      if (pannerNode) {
        pannerNode.pan.value = stem.stereoPan ?? 0;
        gainNode.connect(pannerNode);
        pannerNode.connect(loadingMasterGain);
      } else {
        gainNode.connect(loadingMasterGain);
      }

      const nodes: StemPlaybackNodes = {
        buffer,
        gainNode,
        pannerNode,
        source: null,
      };

      this.stemNodes.set(stemId, nodes);
      this.applyMix();

      return nodes;
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
      .map((failure) => `${failure.stemName}: ${failure.message}`)
      .join('; ');

    return `Audio loading failed. ${detail}`;
  }

  private normalizeCompositionTime(timeInSeconds: number) {
    if (!this.compositionDuration) {
      return Math.max(0, timeInSeconds);
    }

    const normalized = timeInSeconds % this.compositionDuration;
    return normalized < 0 ? normalized + this.compositionDuration : normalized;
  }

  private getCompositionTimeAtContextTime(contextTime: number) {
    if (!this.context || this.playbackStartedAt === null || !this.playing) {
      return this.normalizeCompositionTime(this.pausedProgress);
    }

    return this.normalizeCompositionTime(contextTime - this.playbackStartedAt);
  }

  private getStemOffset(stemId: string, compositionTime: number) {
    const nodes = this.stemNodes.get(stemId);
    const duration = nodes?.buffer.duration ?? 0;

    if (!Number.isFinite(duration) || duration <= 0) {
      return Math.max(0, compositionTime);
    }

    return this.normalizeCompositionTime(compositionTime) % duration;
  }

  private startActiveStemsAt(
    compositionTime: number,
    options: { fadeIn: boolean; restartAll: boolean },
  ) {
    if (!this.context) {
      return;
    }

    const startProgress = this.normalizeCompositionTime(compositionTime);
    this.pausedProgress = startProgress;
    this.playbackStartedAt = this.context.currentTime - startProgress;
    this.playing = true;

    if (options.restartAll) {
      this.stopAllSources();
    }

    this.startStemIdsAtScheduledTime(Array.from(this.activeStemIds), {
      fadeIn: options.fadeIn,
    });
  }

  private startStemIdsAtScheduledTime(
    stemIds: string[],
    options: { fadeIn: boolean },
  ) {
    if (!this.context || !this.playing) {
      return;
    }

    const scheduledTime = this.context.currentTime + SOURCE_START_DELAY_SECONDS;
    const compositionTime = this.getCompositionTimeAtContextTime(scheduledTime);
    const startedStemIds: string[] = [];

    stemIds.forEach((stemId) => {
      if (!this.activeStemIds.has(stemId)) {
        return;
      }

      if (this.startStemSource(stemId, compositionTime, scheduledTime, options)) {
        startedStemIds.push(stemId);
      }
    });

    startedStemIds.forEach((stemId) => {
      this.pendingAudibleStemIds.delete(stemId);
    });
    this.applyMix(scheduledTime);
  }

  private startStemSource(
    stemId: string,
    compositionTime: number,
    scheduledTime: number,
    options: { fadeIn: boolean },
  ) {
    if (!this.context) {
      return false;
    }

    const nodes = this.stemNodes.get(stemId);
    if (!nodes) {
      return false;
    }

    this.stopStemSource(stemId);

    if (options.fadeIn) {
      this.pendingAudibleStemIds.add(stemId);
      this.muteStemNow(stemId);
    }

    const source = this.context.createBufferSource();
    source.buffer = nodes.buffer;
    source.loop = true;
    source.connect(nodes.gainNode);
    source.onended = () => {
      if (nodes.source === source) {
        nodes.source = null;
      }
    };

    nodes.source = source;
    source.start(scheduledTime, this.getStemOffset(stemId, compositionTime));
    return true;
  }

  private stopAllSources() {
    this.stemNodes.forEach((_, stemId) => {
      this.stopStemSource(stemId);
    });
  }

  private stopStemSource(stemId: string) {
    const nodes = this.stemNodes.get(stemId);
    const source = nodes?.source;

    if (!nodes || !source) {
      return;
    }

    nodes.source = null;
    source.onended = null;

    try {
      source.stop();
    } catch {
      // Stopping an already-ended one-shot source is harmless.
    }

    source.disconnect();
  }

  private muteStemNow(stemId: string) {
    if (!this.context) {
      return;
    }

    const nodes = this.stemNodes.get(stemId);
    if (!nodes) {
      return;
    }

    nodes.gainNode.gain.cancelScheduledValues(this.context.currentTime);
    nodes.gainNode.gain.setValueAtTime(0, this.context.currentTime);
  }

  private pauseClock(clearActiveStemIds: boolean) {
    this.pausedProgress = this.getCurrentTime();
    this.stopAllSources();
    this.playing = false;
    this.playbackStartedAt = null;

    if (clearActiveStemIds) {
      this.activeStemIds.clear();
    }

    this.applyMix();
  }

  private applyMix(atTime?: number) {
    if (!this.context) {
      return;
    }

    const mixTime = atTime ?? this.context.currentTime;

    this.stemNodes.forEach(({ gainNode }, stemId) => {
      const stem = this.stemMap.get(stemId);
      const isActive = this.activeStemIds.has(stemId);
      const enabled = this.enabledState.get(stemId) ?? true;
      const isPendingAudible = this.pendingAudibleStemIds.has(stemId);
      const shouldPlay = this.playing
        && isActive
        && !isPendingAudible
        && (this.soloStemId ? this.soloStemId === stemId : enabled);
      const targetGain = shouldPlay ? stem?.gain ?? 1 : 0;

      gainNode.gain.cancelScheduledValues(mixTime);
      gainNode.gain.setTargetAtTime(targetGain, mixTime, STEM_FADE_IN_SECONDS);
    });
  }

  private isOperationRelevant(operationId: number) {
    return this.operationId === operationId;
  }
}
