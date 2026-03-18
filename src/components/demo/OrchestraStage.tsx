import type { CSSProperties, RefObject } from 'react';
import { getMusicianById } from '../../lib/orchestraSession';
import type {
  MusicianProfile,
  OrchestraModeDefinition,
  OrchestraSceneDefinition,
  TrackDefinition,
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
  currentTrack: TrackDefinition | null;
  isPlaying: boolean;
  cameraReady: boolean;
  cameraError: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  onOpenStage: () => void;
  onCloseStage: () => void;
  onSelectMusician: (musicianId: string) => void;
  onTogglePlayback: () => void;
  onPreviousTrack: () => void;
  onNextTrack: () => void;
  onSceneChange: (sceneId: OrchestraSceneDefinition['id']) => void;
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
  const isDimmed =
    highlightIds.length > 0 && !isHighlighted && !isFocused && !isSelected;

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
  currentTrack,
  isPlaying,
  cameraReady,
  cameraError,
  videoRef,
  onOpenStage,
  onCloseStage,
  onSelectMusician,
  onTogglePlayback,
  onPreviousTrack,
  onNextTrack,
  onSceneChange,
}: OrchestraStageProps) {
  const focusedMusician = focusedMusicianId ? getMusicianById(focusedMusicianId) : null;
  const lineupProgress = `${selectedIds.length} / ${musicians.length}`;

  return (
    <section className="card orchestra-stage">
      <div className="section-heading">
        <div>
          <h3>虚拟音乐厅</h3>
          <p>用相机背景模拟 WebAR 演出现场，先验证组合玩法、场景切换和乐手交互。</p>
        </div>
        {cameraReady ? (
          <button className="button button--ghost" onClick={onCloseStage} type="button">
            关闭相机
          </button>
        ) : (
          <button className="button" onClick={onOpenStage} type="button">
            扫码进入演出现场
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
              <strong>等待扫码演示</strong>
              <p>点击“扫码进入演出现场”后，页面会调用相机并进入 demo 版 AR 舞台。</p>
            </div>
          ) : null}
        </div>

        <div className="stage-shell__overlay" />
        <div className="stage-shell__hud">
          <div className="stage-shell__hud-chip stage-shell__hud-chip--anchor">
            <span className="stage-anchor__mark">院徽锚点</span>
            <small>{cameraReady ? '已锁定底座视觉锚点' : '等待开启相机'}</small>
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
          currentScene={currentScene}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onNextTrack={onNextTrack}
          onPreviousTrack={onPreviousTrack}
          onSceneChange={onSceneChange}
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
                    {state.isFocused
                      ? '查看中'
                      : state.isSelected
                        ? '已落子'
                        : '点击查看'}
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
              右侧面板保留完整数字名片与百科内容。
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
