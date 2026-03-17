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
          <h3>分轨音频控制</h3>
          <p>支持同步播放、静音/独奏和总音量控制，为后续空间音频预留声像参数。</p>
        </div>
        <button className="button" onClick={onTogglePlayback} type="button">
          {isPlaying ? '停止播放' : '开始播放'}
        </button>
      </div>

      <label className="slider">
        <span>总音量</span>
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
                  {stem.group} · 声像 {stem.stereoPan ?? 0}
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
