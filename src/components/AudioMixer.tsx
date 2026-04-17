import { Pause, Play, SpeakerHigh, Waveform } from '@phosphor-icons/react';
import type { AudioStem } from '../types/manifest';

interface AudioMixerProps {
  stems: AudioStem[];
  enabledMap: Record<string, boolean>;
  soloStemId: string | null;
  isPlaying: boolean;
  volume: number;
  onTogglePlayback: () => void;
  onToggleStem: (stemId: string) => void;
  onSoloStem: (stemId: string) => void;
  onVolumeChange: (volume: number) => void;
}

export function AudioMixer({
  stems,
  enabledMap,
  soloStemId,
  isPlaying,
  volume,
  onTogglePlayback,
  onToggleStem,
  onSoloStem,
  onVolumeChange,
}: AudioMixerProps) {
  return (
    <section className="card mixer-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">分轨控制台</p>
          <h3>让观众直接听见编配关系的变化</h3>
          <p>控制区保留同步播放、静音、独奏与总音量，让体验不只是“看到舞台”，还能被听懂。</p>
        </div>
        <button className="button" onClick={onTogglePlayback} type="button">
          {isPlaying ? <Pause size={18} weight="regular" /> : <Play size={18} weight="regular" />}
          <span>{isPlaying ? '暂停播放' : '开始播放'}</span>
        </button>
      </div>

      <label className="slider">
        <span>
          <SpeakerHigh size={18} weight="regular" />
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
        />
        <strong>{Math.round(volume * 100)}%</strong>
      </label>

      <div className="stem-list">
        {stems.map((stem) => {
          const enabled = enabledMap[stem.id] ?? stem.defaultEnabled;
          const isSolo = soloStemId === stem.id;

          return (
            <div className="stem-row" key={stem.id}>
              <div>
                <strong>{stem.name}</strong>
                <small>
                  <Waveform size={14} weight="regular" /> {stem.group} / 声像{' '}
                  {stem.stereoPan ?? 0}
                </small>
              </div>
              <div className="stem-row__actions">
                <button
                  className={enabled ? 'button button--ghost active' : 'button button--ghost'}
                  onClick={() => onToggleStem(stem.id)}
                  type="button"
                >
                  {enabled ? '已开启' : '已静音'}
                </button>
                <button
                  className={isSolo ? 'button active' : 'button button--ghost'}
                  onClick={() => onSoloStem(stem.id)}
                  type="button"
                >
                  {isSolo ? '取消独奏' : '独奏'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
