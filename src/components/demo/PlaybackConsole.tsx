import type { OrchestraSceneDefinition, TrackDefinition } from '../../types/demo';

interface PlaybackConsoleProps {
  currentTrack: TrackDefinition | null;
  currentScene: OrchestraSceneDefinition;
  sceneOptions: OrchestraSceneDefinition[];
  isPlaying: boolean;
  onTogglePlayback: () => void;
  onPreviousTrack: () => void;
  onNextTrack: () => void;
  onSceneChange: (sceneId: OrchestraSceneDefinition['id']) => void;
}

export function PlaybackConsole({
  currentTrack,
  currentScene,
  sceneOptions,
  isPlaying,
  onTogglePlayback,
  onPreviousTrack,
  onNextTrack,
  onSceneChange,
}: PlaybackConsoleProps) {
  return (
    <div className="playback-console">
      <div className="playback-console__meta">
        <small>当前曲目</small>
        <strong>{currentTrack?.title ?? '等待解锁曲目'}</strong>
        <span>{currentTrack?.subtitle ?? '先放置演奏家并完成扫码演示'}</span>
      </div>
      <div className="playback-console__actions">
        <button className="button button--ghost" onClick={onPreviousTrack} type="button">
          上一首
        </button>
        <button className="button" onClick={onTogglePlayback} type="button">
          {isPlaying ? '暂停' : '播放'}
        </button>
        <button className="button button--ghost" onClick={onNextTrack} type="button">
          下一首
        </button>
      </div>
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
