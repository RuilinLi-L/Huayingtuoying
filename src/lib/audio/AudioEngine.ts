import type { AudioStem } from '../../types/manifest';
import { FullFileAudioEngine } from './FullFileAudioEngine';
import { SegmentedAudioEngine } from './SegmentedAudioEngine';

/** Preserve the single-file API for fixtures and other compositions. */
export class AudioEngine {
  private engine: SegmentedAudioEngine | FullFileAudioEngine = new SegmentedAudioEngine();
  private select(stems: AudioStem[]) {
    const segmented = stems.length === 0 || stems.every((s) => s.segmentManifest);
    if (segmented !== this.engine instanceof SegmentedAudioEngine) {
      this.engine.dispose();
      this.engine = segmented ? new SegmentedAudioEngine() : new FullFileAudioEngine();
    }
  }
  init() {
    return this.engine.init();
  }
  preload(stems: AudioStem[]) {
    this.select(stems);
    return this.engine.preload(stems);
  }
  play(stems: AudioStem[]) {
    this.select(stems);
    return this.engine.play(stems);
  }
  setActiveStems(
    stems: AudioStem[],
    ids: string[],
    options: { load?: boolean; playWhenReady?: boolean } = {},
  ) {
    this.select(stems);
    return this.engine.setActiveStems(stems, ids, options);
  }
  pause() {
    this.engine.pause();
  }
  stop() {
    this.engine.stop();
  }
  resume() {
    return this.engine.resume();
  }
  isPlaying() {
    return this.engine.isPlaying();
  }
  isBuffering() {
    return this.engine instanceof SegmentedAudioEngine && this.engine.isBuffering();
  }
  getError() {
    return this.engine instanceof SegmentedAudioEngine ? this.engine.getError() : '';
  }
  getCurrentTime() {
    return this.engine.getCurrentTime();
  }
  getDuration() {
    return this.engine.getDuration();
  }
  hasPlayableActiveStems() {
    return this.engine.hasPlayableActiveStems();
  }
  seek(seconds: number) {
    this.engine.seek(seconds);
  }
  setStemEnabled(id: string, enabled: boolean) {
    this.engine.setStemEnabled(id, enabled);
  }
  setSoloStem(id: string | null) {
    this.engine.setSoloStem(id);
  }
  setMasterVolume(value: number) {
    this.engine.setMasterVolume(value);
  }
  dispose() {
    this.engine.dispose();
  }
}
