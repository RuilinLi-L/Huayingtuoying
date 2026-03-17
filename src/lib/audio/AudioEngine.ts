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
  private soloStemId: string | null = null;
  private playing = false;

  async init() {
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.88;
      this.masterGain.connect(this.context.destination);
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  async preload(stems: AudioStem[]) {
    await this.init();

    if (!this.context) {
      return;
    }

    await Promise.all(
      stems.map(async (stem) => {
        this.stemMap.set(stem.id, stem);
        if (this.buffers.has(stem.id)) {
          this.enabledState.set(stem.id, stem.defaultEnabled);
          return;
        }

        const response = await fetch(stem.file);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.context!.decodeAudioData(arrayBuffer.slice(0));
        this.buffers.set(stem.id, audioBuffer);
        this.enabledState.set(stem.id, stem.defaultEnabled);
      }),
    );
  }

  async play(stems: AudioStem[]) {
    await this.preload(stems);

    if (!this.context || !this.masterGain) {
      return;
    }

    this.stop();
    const startAt = this.context.currentTime + 0.06;

    stems.forEach((stem) => {
      const buffer = this.buffers.get(stem.id);
      if (!buffer) {
        return;
      }

      const source = this.context!.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gainNode = this.context!.createGain();
      const supportsStereoPanner = 'createStereoPanner' in this.context!;
      const pannerNode = supportsStereoPanner
        ? this.context!.createStereoPanner()
        : undefined;

      if (pannerNode) {
        pannerNode.pan.value = stem.stereoPan ?? 0;
        source.connect(gainNode);
        gainNode.connect(pannerNode);
        pannerNode.connect(this.masterGain!);
      } else {
        source.connect(gainNode);
        gainNode.connect(this.masterGain!);
      }

      source.start(startAt);
      this.activeNodes.set(stem.id, { source, gainNode, pannerNode });
    });

    this.playing = true;
    this.applyMix();
  }

  stop() {
    this.activeNodes.forEach(({ source }) => {
      try {
        source.stop();
      } catch {
        return;
      }
    });
    this.activeNodes.clear();
    this.playing = false;
  }

  isPlaying() {
    return this.playing;
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
  }
}
