import type { CompositionDefinition, OrchestraSceneDefinition } from '../../types/demo';

interface PlaybackConsoleProps {
  composition: CompositionDefinition;
  currentScene: OrchestraSceneDefinition;
  sceneOptions: OrchestraSceneDefinition[];
  currentTime: number;
  duration: number;
  hasActiveMusicians: boolean;
  isPlaying: boolean;
  onTogglePlayback: () => void;
  onSceneChange: (sceneId: OrchestraSceneDefinition['id']) => void;
  onSeek: (timeInSeconds: number) => void;
}

function formatTime(timeInSeconds: number) {
  const safeValue = Number.isFinite(timeInSeconds) ? Math.max(0, timeInSeconds) : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function PlaybackConsole({
  composition,
  currentScene,
  sceneOptions,
  currentTime,
  duration,
  hasActiveMusicians,
  isPlaying,
  onTogglePlayback,
  onSceneChange,
  onSeek,
}: PlaybackConsoleProps) {
  const sliderMax = duration > 0 ? duration : 1;

  return (
    <div className="playback-console">
      <div className="playback-console__meta">
        <small>当前曲目</small>
        <strong>{composition.title}</strong>
        <span>
          {hasActiveMusicians
            ? composition.subtitle
            : '放入任意乐器后，将从全局时间轴开始同步播放。'}
        </span>
      </div>

      <div className="playback-console__actions">
        <button
          className="button"
          disabled={!hasActiveMusicians}
          onClick={onTogglePlayback}
          type="button"
        >
          {isPlaying ? '暂停' : '播放'}
        </button>
      </div>

      <label className="playback-console__progress" htmlFor="orchestra-progress">
        <span>全局进度</span>
        <input
          id="orchestra-progress"
          max={sliderMax}
          min={0}
          onChange={(event) => onSeek(Number(event.target.value))}
          step="0.01"
          type="range"
          value={Math.min(currentTime, sliderMax)}
        />
        <strong>
          {formatTime(currentTime)} / {formatTime(duration)}
        </strong>
      </label>

      <div className="scene-switcher">
        {sceneOptions.map((scene) => (
          <button
            className={
              scene.id === currentScene.id ? 'chip chip--active scene-chip' : 'chip scene-chip'
            }
            key={scene.id}
            onClick={() => onSceneChange(scene.id)}
            type="button"
          >
            {scene.shortLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
