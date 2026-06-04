import type { AudioStem } from '../../types/manifest';

interface StemPlaybackNodes {
  media: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gainNode: GainNode;
  pannerNode?: StereoPannerNode;
  objectUrl?: string;
}

interface StemLoadFailure {
  stemId: string;
  stemName: string;
  message: string;
}

const STEM_LOAD_CONCURRENCY = 6;
const DESYNC_TOLERANCE_SECONDS = 0.08;
const STEM_METADATA_WAIT_MS = 1800;
const STEM_FADE_IN_SECONDS = 0.035;

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

    await this.ensureContext(false);
    this.registerStems(stems);
    this.activeStemIds = new Set(stems.map((stem) => stem.id));
    this.pendingAudibleStemIds = new Set(this.activeStemIds);
    this.pausedProgress = 0;
    this.pauseAllLoadedStems(true);
    this.playing = false;
    this.playbackStartedAt = null;

    const failures = await this.loadStemIds(
      Array.from(this.activeStemIds),
      async (stemId) => {
        this.refreshCompositionDuration();

        if (!this.isOperationRelevant(operationId) || !this.activeStemIds.has(stemId)) {
          return;
        }

        await this.beginPlaybackIfNeeded(operationId);

        if (this.playing) {
          this.applyMix();
          await this.prepareActiveStemForAudible(stemId);
        }
      },
    );
    this.refreshCompositionDuration();

    if (!this.isOperationRelevant(operationId)) {
      return this.formatLoadFailures(failures);
    }

    if (this.hasPlayableActiveStems()) {
      await this.resume();
    } else {
      this.playing = false;
      this.playbackStartedAt = null;
    }

    return this.formatLoadFailures(failures);
  }

  stop() {
    this.operationId += 1;
    this.pauseAllLoadedStems(true);
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

    const startAt = this.normalizeCompositionTime(this.pausedProgress);
    this.playbackStartedAt = this.context.currentTime - startAt;
    this.playing = true;

    this.applyMix();

    try {
      await this.startLoadedStemsAt(startAt, {
        forceSync: true,
        onlyPaused: false,
      });
    } catch (error) {
      this.pauseClock(false);
      throw error;
    }
  }

  async setActiveStems(
    stems: AudioStem[],
    activeStemIds: string[],
    options: { load?: boolean; playWhenReady?: boolean } = {},
  ) {
    const operationId = ++this.operationId;

    await this.ensureContext(false);
    this.registerStems(stems);

    const nextActiveStemIds = new Set(
      activeStemIds.filter((stemId) => this.stemMap.has(stemId)),
    );
    const addedStemIds = new Set(
      Array.from(nextActiveStemIds).filter((stemId) => !this.activeStemIds.has(stemId)),
    );
    const progressBeforeLoad = this.getCurrentTime();
    const shouldPlayWhenReady = options.playWhenReady === true;

    if (!this.playing && shouldPlayWhenReady) {
      nextActiveStemIds.forEach((stemId) => {
        this.pendingAudibleStemIds.add(stemId);
      });
    }

    this.activeStemIds.forEach((stemId) => {
      if (!nextActiveStemIds.has(stemId)) {
        this.pendingAudibleStemIds.delete(stemId);
        if (!this.playing) {
          this.pauseStem(stemId, false);
        }
      }
    });

    this.activeStemIds = nextActiveStemIds;

    if (this.playing) {
      addedStemIds.forEach((stemId) => {
        this.pendingAudibleStemIds.add(stemId);
      });
    }

    this.applyMix();

    if (!nextActiveStemIds.size) {
      this.pauseClock(true);
      return null;
    }

    if (options.load === false) {
      this.pausedProgress = progressBeforeLoad;
      return null;
    }

    const failures = await this.loadStemIds(
      Array.from(nextActiveStemIds),
      async (stemId) => {
        this.refreshCompositionDuration();

        if (!this.isOperationRelevant(operationId) || !this.activeStemIds.has(stemId)) {
          return;
        }

        if (!this.playing && !shouldPlayWhenReady) {
          return;
        }

        await this.beginPlaybackIfNeeded(operationId);

        if (this.playing && (addedStemIds.has(stemId) || this.pendingAudibleStemIds.has(stemId))) {
          this.applyMix();
          await this.prepareActiveStemForAudible(stemId);
        }
      },
    );
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
        await this.beginPlaybackIfNeeded(operationId);

        if (this.playing) {
          this.applyMix();
          await this.startLoadedStemsAt(this.getCurrentTime(), {
            forceSync: true,
            onlyPaused: true,
          });
          nextActiveStemIds.forEach((stemId) => {
            this.pendingAudibleStemIds.delete(stemId);
          });
          this.applyMix();
          return this.formatLoadFailures(failures);
        }
      }

      this.pausedProgress = progressBeforeLoad;
      return this.formatLoadFailures(failures);
    }

    await this.ensureContext(true);

    if (!this.isOperationRelevant(operationId)) {
      return this.formatLoadFailures(failures);
    }

    const startProgress = this.getCurrentTime();
    this.applyMix();
    await this.preparePendingActiveStems(startProgress);

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
      this.stemNodes.forEach((_, stemId) => {
        this.syncStemToTime(stemId, nextProgress, true);
      });
      return;
    }

    if (!this.context) {
      this.playing = false;
      this.playbackStartedAt = null;
      return;
    }

    this.playbackStartedAt = this.context.currentTime - nextProgress;
    this.stemNodes.forEach((_, stemId) => {
      this.syncStemToTime(stemId, nextProgress, true);
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

    this.masterGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.02);
  }

  dispose() {
    this.operationId += 1;
    this.stop();
    this.stemNodes.forEach((nodes) => {
      nodes.media.pause();
      nodes.media.removeAttribute('src');
      nodes.media.load();
      if (nodes.objectUrl) {
        URL.revokeObjectURL(nodes.objectUrl);
      }
      nodes.source.disconnect();
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
    this.soloStemId = null;
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
      ...Array.from(this.stemNodes.values(), ({ media }) =>
        Number.isFinite(media.duration) ? media.duration : 0,
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

  private async loadStemIds(
    stemIds: string[],
    onStemLoaded?: (stemId: string) => Promise<void>,
  ) {
    const uniqueStemIds = [...new Set(stemIds.filter((stemId) => this.stemMap.has(stemId)))];
    const failures: StemLoadFailure[] = [];

    for (let index = 0; index < uniqueStemIds.length; index += STEM_LOAD_CONCURRENCY) {
      const chunk = uniqueStemIds.slice(index, index + STEM_LOAD_CONCURRENCY);
      const results = await Promise.allSettled(
        chunk.map((stemId) => this.loadStemMedia(stemId)),
      );

      results.forEach((result, resultIndex) => {
        const stemId = chunk[resultIndex];

        if (result.status === 'fulfilled') {
          if (onStemLoaded) {
            void onStemLoaded(stemId).catch(() => {
              // The caller re-checks playable state after loading completes.
            });
          }
          return;
        }

        failures.push(this.createLoadFailure(stemId, result.reason));
      });
    }

    return failures;
  }

  private async loadStemMedia(stemId: string) {
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
    const media = new Audio();
    media.preload = 'auto';
    media.loop = true;

    const source = loadingContext.createMediaElementSource(media);
    const gainNode = loadingContext.createGain();
    gainNode.gain.value = 0;

    const supportsStereoPanner = 'createStereoPanner' in loadingContext;
    const pannerNode = supportsStereoPanner
      ? loadingContext.createStereoPanner()
      : undefined;

    if (pannerNode) {
      pannerNode.pan.value = stem.stereoPan ?? 0;
      source.connect(gainNode);
      gainNode.connect(pannerNode);
      pannerNode.connect(loadingMasterGain);
    } else {
      source.connect(gainNode);
      gainNode.connect(loadingMasterGain);
    }

    const nodes: StemPlaybackNodes = {
      media,
      source,
      gainNode,
      pannerNode,
    };

    const teardown = () => {
      media.pause();
      media.removeAttribute('src');
      media.load();
      if (nodes.objectUrl) {
        URL.revokeObjectURL(nodes.objectUrl);
        nodes.objectUrl = undefined;
      }
      source.disconnect();
      gainNode.disconnect();
      pannerNode?.disconnect();
    };

    const syncWhenReady = () => {
      this.refreshCompositionDuration();

      if (!this.playing || !this.activeStemIds.has(stemId)) {
        return;
      }

      if (!media.paused && !this.pendingAudibleStemIds.has(stemId)) {
        return;
      }

      this.pendingAudibleStemIds.add(stemId);
      this.applyMix();

      void this.prepareActiveStemForAudible(stemId).catch(() => {
        // A later user gesture or play attempt will retry the stem.
      });
    };

    media.addEventListener('loadedmetadata', syncWhenReady);
    media.addEventListener('canplay', syncWhenReady);

    const waitForMediaMetadata = () =>
      new Promise<'ready' | 'timeout'>((resolve, reject) => {
        if (media.readyState >= HTMLMediaElement.HAVE_METADATA) {
          resolve('ready');
          return;
        }

        const cleanup = () => {
          media.removeEventListener('loadedmetadata', handleReady);
          media.removeEventListener('canplay', handleReady);
          media.removeEventListener('error', handleError);
          window.clearTimeout(metadataTimer);
        };

        const handleReady = () => {
          cleanup();
          resolve('ready');
        };

        const handleError = () => {
          cleanup();
          reject(new Error(this.getMediaErrorMessage(media, stem.file)));
        };

        const handleTimeout = () => {
          cleanup();
          resolve('timeout');
        };

        media.addEventListener('loadedmetadata', handleReady);
        media.addEventListener('canplay', handleReady);
        media.addEventListener('error', handleError);
        const metadataTimer = window.setTimeout(handleTimeout, STEM_METADATA_WAIT_MS);
      });

    const loadPromise = (async () => {
      try {
        media.src = stem.file;
        media.load();

        const directStatus = await waitForMediaMetadata();

        if (
          directStatus === 'timeout'
          && this.context === loadingContext
          && this.masterGain === loadingMasterGain
        ) {
          media.pause();
          media.removeAttribute('src');
          media.load();

          const objectUrl = await this.fetchStemObjectUrl(stem.file);
          nodes.objectUrl = objectUrl;
          media.src = objectUrl;
          media.load();
          await waitForMediaMetadata();
        }

        if (this.context !== loadingContext || this.masterGain !== loadingMasterGain) {
          media.removeEventListener('loadedmetadata', syncWhenReady);
          media.removeEventListener('canplay', syncWhenReady);
          teardown();
          throw new Error('Audio context is no longer active');
        }

        this.stemNodes.set(stemId, nodes);

        if (this.playing) {
          void this.prepareLoadedStemForPlayback(stemId).catch(() => {
            // Playback state can change while media readiness events settle.
          });
        }

        return nodes;
      } catch (error) {
        media.removeEventListener('loadedmetadata', syncWhenReady);
        media.removeEventListener('canplay', syncWhenReady);
        teardown();
        throw error;
      }
    })().finally(() => {
      this.loadingPromises.delete(stemId);
    });

    this.loadingPromises.set(stemId, loadPromise);
    return loadPromise;
  }

  private async fetchStemObjectUrl(file: string) {
    const response = await fetch(file);

    if (!response.ok) {
      throw new Error(`Request failed for ${file} (HTTP ${response.status})`);
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (contentType.includes('text/html')) {
      throw new Error(
        `Request for ${file} returned HTML, which usually means the audio file is missing`,
      );
    }

    const blob = await response.blob();
    if (!blob.size) {
      throw new Error(`Request for ${file} returned an empty audio file`);
    }

    return URL.createObjectURL(blob);
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

  private getStemOffset(stemId: string, compositionTime: number) {
    const nodes = this.stemNodes.get(stemId);
    const duration = nodes?.media.duration ?? 0;

    if (!Number.isFinite(duration) || duration <= 0) {
      return Math.max(0, compositionTime);
    }

    return this.normalizeCompositionTime(compositionTime) % duration;
  }

  private async startLoadedStemsAt(
    compositionTime: number,
    options: { forceSync: boolean; onlyPaused: boolean },
  ) {
    const playRequests: Promise<void>[] = [];
    const startedStemIds: string[] = [];

    this.stemNodes.forEach((nodes, stemId) => {
      const wasPaused = nodes.media.paused;

      if (options.onlyPaused && !wasPaused) {
        return;
      }

      if (!options.onlyPaused || wasPaused) {
        this.syncStemToTime(stemId, compositionTime, true);
      } else {
        this.syncStemToTime(stemId, compositionTime, options.forceSync);
      }

      if (nodes.media.paused) {
        playRequests.push(
          nodes.media.play().then(() => {
            startedStemIds.push(stemId);
          }),
        );
      }
    });

    await Promise.all(playRequests);

    const syncTime = this.getCurrentTime();

    if (options.onlyPaused) {
      startedStemIds.forEach((stemId) => {
        this.syncStemToTime(stemId, syncTime, true);
      });
    } else {
      this.stemNodes.forEach((nodes, stemId) => {
        if (!nodes.media.paused) {
          this.syncStemToTime(stemId, syncTime, true);
        }
      });
    }

    this.activeStemIds.forEach((stemId) => {
      const nodes = this.stemNodes.get(stemId);

      if (nodes && !nodes.media.paused) {
        this.pendingAudibleStemIds.delete(stemId);
      }
    });

    this.applyMix();
  }

  private async beginPlaybackIfNeeded(operationId: number) {
    if (this.playing || !this.context) {
      return;
    }

    await this.ensureContext(true);

    if (!this.isOperationRelevant(operationId) || !this.hasPlayableActiveStems()) {
      return;
    }

    const startAt = this.normalizeCompositionTime(this.pausedProgress);
    this.playbackStartedAt = this.context.currentTime - startAt;
    this.playing = true;
  }

  private async preparePendingActiveStems(compositionTime: number) {
    const stemIds = Array.from(this.pendingAudibleStemIds).filter((stemId) =>
      this.activeStemIds.has(stemId),
    );

    await Promise.all(stemIds.map((stemId) => this.prepareActiveStemForAudible(stemId, compositionTime)));
  }

  private async prepareLoadedStemForPlayback(stemId: string, compositionTime = this.getCurrentTime()) {
    if (!this.playing) {
      return;
    }

    if (this.activeStemIds.has(stemId) && this.pendingAudibleStemIds.has(stemId)) {
      await this.prepareActiveStemForAudible(stemId, compositionTime);
      return;
    }

    await this.prepareStemSilently(stemId, compositionTime);
  }

  private async prepareActiveStemForAudible(stemId: string, compositionTime = this.getCurrentTime()) {
    if (!this.activeStemIds.has(stemId)) {
      this.pendingAudibleStemIds.delete(stemId);
      this.applyMix();
      return;
    }

    const nodes = this.stemNodes.get(stemId);
    if (!nodes) {
      return;
    }

    this.pendingAudibleStemIds.add(stemId);
    this.applyMix();

    if (nodes.media.paused) {
      this.syncStemToTime(stemId, compositionTime, true);
      await nodes.media.play();
      this.syncStemToTime(stemId, this.getCurrentTime(), true);
    } else {
      this.syncStemToTime(stemId, compositionTime, false);
    }

    this.pendingAudibleStemIds.delete(stemId);
    this.applyMix();
    this.warmLoadedStemsForPlayback();
  }

  private async prepareStemSilently(stemId: string, compositionTime = this.getCurrentTime()) {
    const nodes = this.stemNodes.get(stemId);

    if (!nodes || !this.playing || !nodes.media.paused) {
      return;
    }

    this.syncStemToTime(stemId, compositionTime, true);
    await nodes.media.play();
    this.syncStemToTime(stemId, this.getCurrentTime(), true);
  }

  private warmLoadedStemsForPlayback(compositionTime = this.getCurrentTime()) {
    if (!this.playing) {
      return;
    }

    void this.startLoadedStemsAt(compositionTime, {
      forceSync: false,
      onlyPaused: true,
    }).catch(() => {
      // A later media readiness event or user action will retry silent warm-up.
    });
  }

  private syncStemToTime(stemId: string, compositionTime: number, force: boolean) {
    const nodes = this.stemNodes.get(stemId);
    if (!nodes) {
      return;
    }

    const duration = nodes.media.duration;
    const nextOffset = this.getStemOffset(stemId, compositionTime);
    const hasKnownDuration = Number.isFinite(duration) && duration > 0;
    const currentOffset = hasKnownDuration ? nodes.media.currentTime % duration : nodes.media.currentTime;
    const directDelta = Math.abs(currentOffset - nextOffset);
    const loopDelta = hasKnownDuration ? duration - directDelta : directDelta;
    const delta = Math.min(directDelta, loopDelta);

    if (force || delta > DESYNC_TOLERANCE_SECONDS) {
      try {
        nodes.media.currentTime = nextOffset;
      } catch {
        // Some browsers temporarily reject seeks while media metadata settles.
      }
    }
  }

  private pauseClock(clearActiveStemIds: boolean) {
    this.pausedProgress = this.getCurrentTime();
    this.pauseAllLoadedStems(false);
    this.playing = false;
    this.playbackStartedAt = null;

    if (clearActiveStemIds) {
      this.activeStemIds.clear();
    }

    this.applyMix();
  }

  private pauseAllLoadedStems(resetTime: boolean) {
    this.stemNodes.forEach((_, stemId) => {
      this.pauseStem(stemId, resetTime);
    });
  }

  private pauseStem(stemId: string, resetTime: boolean) {
    const nodes = this.stemNodes.get(stemId);
    if (!nodes) {
      return;
    }

    nodes.media.pause();

    if (resetTime) {
      try {
        nodes.media.currentTime = 0;
      } catch {
        // Reset is best-effort for media that is not seekable yet.
      }
    }
  }

  private applyMix() {
    if (!this.context) {
      return;
    }

    this.stemNodes.forEach(({ gainNode }, stemId) => {
      const stem = this.stemMap.get(stemId);
      const isActive = this.activeStemIds.has(stemId);
      const enabled = this.enabledState.get(stemId) ?? true;
      const isPendingAudible = this.pendingAudibleStemIds.has(stemId);
      const shouldPlay = isActive
        && !isPendingAudible
        && (this.soloStemId ? this.soloStemId === stemId : enabled);
      const targetGain = shouldPlay ? stem?.gain ?? 1 : 0;
      gainNode.gain.setTargetAtTime(targetGain, this.context!.currentTime, STEM_FADE_IN_SECONDS);
    });
  }

  private isOperationRelevant(operationId: number) {
    return this.operationId === operationId;
  }

  private getMediaErrorMessage(media: HTMLMediaElement, file: string) {
    const code = media.error?.code;

    switch (code) {
      case 1:
        return `Loading was aborted: ${file}`;
      case 2:
        return `Network error while loading: ${file}`;
      case 3:
        return `Audio decode failed: ${file}`;
      case 4:
        return `Audio format is not supported: ${file}`;
      default:
        return `Could not load audio: ${file}`;
    }
  }
}
