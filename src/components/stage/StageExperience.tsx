import type { RefObject } from 'react';
import type {
  MusicianProfile,
  OrchestraSceneDefinition,
} from '../../types/demo';
import { StageActions } from './StageActions';
import { StageHero } from './StageHero';
import { StageInsightSheet } from './StageInsightSheet';
import { StagePlayer } from './StagePlayer';
import { OrchestraSection } from './OrchestraSection';
import '../../styles/stage-mobile.css';

export interface StageExperienceProps {
  musicians: MusicianProfile[];
  selectedIds: string[];
  highlightIds: string[];
  focusedMusicianId: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isLoading: boolean;
  audioError: string;
  nfcError: string;
  cameraReady: boolean;
  cameraError: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  currentScene: OrchestraSceneDefinition;
  sceneOptions: OrchestraSceneDefinition[];
  onTogglePlayback: () => void;
  onSeek: (timeInSeconds: number) => void;
  onSelectMusician: (musicianId: string) => void;
  onToggleMusicianInLineup: (musicianId: string) => void;
  onSceneChange: (sceneId: OrchestraSceneDefinition['id']) => void;
  onOpenStage: () => void;
  onCloseStage: () => void;
}

export function StageExperience({
  musicians,
  selectedIds,
  highlightIds,
  focusedMusicianId,
  currentTime,
  duration,
  isPlaying,
  isLoading,
  audioError,
  nfcError,
  cameraReady,
  cameraError,
  videoRef,
  currentScene,
  sceneOptions,
  onTogglePlayback,
  onSeek,
  onSelectMusician,
  onToggleMusicianInLineup,
  onSceneChange,
  onOpenStage,
  onCloseStage,
}: StageExperienceProps) {
  const focusedMusician = musicians.find((item) => item.id === focusedMusicianId) ?? null;

  return (
    <div className="stage-mobile">
      <StageHero currentScene={currentScene} />
      <StagePlayer
        currentTime={currentTime}
        duration={duration}
        isLoading={isLoading}
        isPlaying={isPlaying}
        hasActiveMusicians={selectedIds.length > 0}
        onSeek={onSeek}
        onTogglePlayback={onTogglePlayback}
      />

      {audioError ? (
        <div className="stage-mobile__notice stage-mobile__notice--error" role="alert">
          <strong>音频加载失败</strong>
          <p>{audioError}</p>
        </div>
      ) : null}
      {nfcError ? (
        <div className="stage-mobile__notice stage-mobile__notice--error" role="alert">
          <strong>阵容同步未完成</strong>
          <p>{nfcError}</p>
        </div>
      ) : null}
      {cameraError ? (
        <div className="stage-mobile__notice stage-mobile__notice--error" role="alert">
          <strong>相机未启动</strong>
          <p>{cameraError}</p>
        </div>
      ) : null}

      <header className="stage-mobile__intro">
        <h1>Orchestra</h1>
        <p>选取下面的乐团角色，听取乐曲不同的乐器演奏，享受不一样的乐曲体验。</p>
      </header>

      <div className="stage-mobile__sections" aria-label="乐团声部">
        <OrchestraSection
          section="strings"
          musicians={musicians}
          selectedIds={selectedIds}
          highlightIds={highlightIds}
          focusedMusicianId={focusedMusicianId}
          onSelectMusician={onSelectMusician}
        />
        <OrchestraSection
          section="woodwind"
          musicians={musicians}
          selectedIds={selectedIds}
          highlightIds={highlightIds}
          focusedMusicianId={focusedMusicianId}
          onSelectMusician={onSelectMusician}
        />
        <OrchestraSection
          section="brass"
          musicians={musicians}
          selectedIds={selectedIds}
          highlightIds={highlightIds}
          focusedMusicianId={focusedMusicianId}
          onSelectMusician={onSelectMusician}
        />
      </div>

      <StageActions
        cameraError={cameraError}
        cameraReady={cameraReady}
        currentScene={currentScene}
        onCloseStage={onCloseStage}
        onOpenStage={onOpenStage}
        onSceneChange={onSceneChange}
        sceneOptions={sceneOptions}
        selectedCount={selectedIds.length}
        videoRef={videoRef}
      />

      <StageInsightSheet
        currentScene={currentScene}
        isInLineup={focusedMusician ? selectedIds.includes(focusedMusician.id) : false}
        musician={focusedMusician}
        onClose={() => focusedMusician && onSelectMusician(focusedMusician.id)}
        onToggleLineup={onToggleMusicianInLineup}
      />
    </div>
  );
}
