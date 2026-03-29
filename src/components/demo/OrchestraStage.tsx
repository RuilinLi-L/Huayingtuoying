import type { CSSProperties, RefObject } from 'react';
import { getMusicianById } from '../../lib/orchestraSession';
import type {
  CompositionDefinition,
  MusicianProfile,
  OrchestraModeDefinition,
  OrchestraSceneDefinition,
} from '../../types/demo';
import { PlaybackConsole } from './PlaybackConsole';

interface OrchestraStageProps {
  currentScene: OrchestraSceneDefinition;
  sceneOptions: OrchestraSceneDefinition[];
  mode: OrchestraModeDefinition;
  musicians: MusicianProfile[];
  selectedIds: string[];
  highlightIds: string[];
  focusedMusicianId: string | null;
  composition: CompositionDefinition;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  cameraReady: boolean;
  cameraError: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  onOpenStage: () => void;
  onCloseStage: () => void;
  onSelectMusician: (musicianId: string) => void;
  onTogglePlayback: () => void;
  onSceneChange: (sceneId: OrchestraSceneDefinition['id']) => void;
  onSeek: (timeInSeconds: number) => void;
}

function getMusicianState(
  musicianId: string,
  selectedIds: string[],
  highlightIds: string[],
  focusedMusicianId: string | null,
) {
  const isSelected = selectedIds.includes(musicianId);
  const isHighlighted = highlightIds.includes(musicianId);
  const isFocused = focusedMusicianId === musicianId;
  const isDimmed = highlightIds.length > 0 && !isHighlighted && !isFocused && !isSelected;

  return {
    isSelected,
    isHighlighted,
    isFocused,
    isDimmed,
  };
}

export function OrchestraStage({
  currentScene,
  sceneOptions,
  mode,
  musicians,
  selectedIds,
  highlightIds,
  focusedMusicianId,
  composition,
  currentTime,
  duration,
  isPlaying,
  cameraReady,
  cameraError,
  videoRef,
  onOpenStage,
  onCloseStage,
  onSelectMusician,
  onTogglePlayback,
  onSceneChange,
  onSeek,
}: OrchestraStageProps) {
  const focusedMusician = focusedMusicianId ? getMusicianById(focusedMusicianId) : null;
  const lineupProgress = `${selectedIds.length} / ${musicians.length}`;

  return (
    <section className="card orchestra-stage">
      <div className="section-heading">
        <div>
          <h3>虚拟音乐厅</h3>
          <p>用相机背景模拟 WebAR 演出现场，先验证落子、同步合奏、场景切换和乐手交互。</p>
        </div>
        {cameraReady ? (
          <button className="button button--ghost" onClick={onCloseStage} type="button">
            关闭相机
          </button>
        ) : (
          <button className="button" onClick={onOpenStage} type="button">
            打开演示舞台
          </button>
        )}
      </div>

      <div
        className="stage-shell"
        style={
          {
            '--scene-base': currentScene.palette.base,
            '--scene-glow': currentScene.palette.glow,
            '--scene-haze': currentScene.palette.haze,
          } as CSSProperties
        }
      >
        <div className="stage-shell__camera">
          <video autoPlay muted playsInline ref={videoRef} />
          {!cameraReady ? (
            <div className="stage-shell__placeholder">
              <strong>等待进入舞台</strong>
              <p>开启相机后，这里会显示舞台背景，你可以继续用右侧的 NFC 模拟面板做插拔联动。</p>
            </div>
          ) : null}
        </div>

        <div className="stage-shell__overlay" />
        <div className="stage-shell__hud">
          <div className="stage-shell__hud-chip stage-shell__hud-chip--anchor">
            <span className="stage-anchor__mark">底座锚点</span>
            <small>{cameraReady ? '舞台已开启' : '等待开启相机'}</small>
          </div>
          <div className="stage-shell__hud-chip">
            <small>当前玩法</small>
            <strong>{mode.title}</strong>
          </div>
          <div className="stage-shell__hud-chip">
            <small>当前场景</small>
            <strong>{currentScene.shortLabel}</strong>
          </div>
          <div className="stage-shell__hud-chip">
            <small>编制进度</small>
            <strong>{lineupProgress}</strong>
          </div>
        </div>

        <PlaybackConsole
          composition={composition}
          currentScene={currentScene}
          currentTime={currentTime}
          duration={duration}
          hasActiveMusicians={selectedIds.length > 0}
          isPlaying={isPlaying}
          onSceneChange={onSceneChange}
          onSeek={onSeek}
          onTogglePlayback={onTogglePlayback}
          sceneOptions={sceneOptions}
        />

        <div className="stage-shell__floor" />

        <div className="stage-ensemble">
          {musicians.map((musician) => {
            const state = getMusicianState(
              musician.id,
              selectedIds,
              highlightIds,
              focusedMusicianId,
            );

            return (
              <button
                className={[
                  'musician-node',
                  state.isSelected ? 'musician-node--selected' : '',
                  state.isHighlighted ? 'musician-node--highlighted' : '',
                  state.isFocused ? 'musician-node--focused' : '',
                  state.isDimmed ? 'musician-node--dimmed' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={musician.id}
                onClick={() => onSelectMusician(musician.id)}
                style={
                  {
                    '--node-x': `${musician.position.x}%`,
                    '--node-y': `${musician.position.y}%`,
                    '--node-depth': `${musician.position.depth}`,
                    '--node-color': musician.color,
                  } as CSSProperties
                }
                type="button"
              >
                <span className="musician-node__avatar">{musician.shortLabel}</span>
                <span className="musician-node__label">
                  <strong>{musician.instrument}</strong>
                  <small>
                    {state.isFocused ? '查看中' : state.isSelected ? '已插入' : '点击查看'}
                  </small>
                </span>
              </button>
            );
          })}
        </div>

        {focusedMusician ? (
          <div className="stage-shell__summary-popup">
            <div className="stage-shell__summary-header">
              <div className="stage-shell__summary-title">
                <span
                  className="stage-shell__summary-swatch"
                  style={{ backgroundColor: focusedMusician.color }}
                />
                <div>
                  <small>乐器摘要</small>
                  <strong>{focusedMusician.instrument}</strong>
                </div>
              </div>
              <button
                className="stage-shell__summary-close"
                onClick={() => onSelectMusician(focusedMusician.id)}
                type="button"
              >
                收起
              </button>
            </div>
            <p>{focusedMusician.knowledgeSummary}</p>
            <div className="stage-shell__summary-meta">
              <span>{mode.name}</span>
              <span>{currentScene.name}</span>
            </div>
            <small className="stage-shell__summary-note">
              右侧面板保留更完整的数字名片与百科内容。
            </small>
          </div>
        ) : null}

        {cameraError ? (
          <div className="stage-shell__error">
            <strong>相机未启动</strong>
            <p>{cameraError}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
