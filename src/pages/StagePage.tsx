import { StageExperience } from '../components/stage/StageExperience';
import { musicians } from '../data/orchestraDemo';
import { useOrchestraSession } from '../features/orchestra/useOrchestraSession';

export function StagePage() {
  const session = useOrchestraSession({
    playOnSelection: true,
    preloadSelectedStems: false,
    audioVariant: 'stage-mobile',
    showAllScenes: true,
  });

  return (
    <StageExperience
      musicians={musicians}
      selectedIds={session.snapshot.placedMusicianIds}
      highlightIds={session.highlightIds}
      focusedMusicianId={session.focusedMusicianId}
      currentTime={session.playbackTime}
      duration={session.duration}
      isPlaying={session.isPlaying}
      isLoading={session.isLoading}
      audioError={session.audioError}
      nfcError={session.nfcError}
      cameraReady={session.cameraReady}
      cameraError={session.cameraError}
      videoRef={session.videoRef}
      currentScene={session.currentScene}
      sceneOptions={session.sceneOptions}
      onTogglePlayback={() => void session.togglePlayback()}
      onRetryPlayback={() => void session.retryPlayback()}
      onSeek={session.seek}
      onResetAll={session.resetAll}
      onResetSection={session.resetSection}
      onSelectMusician={session.selectMusician}
      onToggleMusicianInLineup={session.toggleMusician}
      onSceneChange={session.changeScene}
      onOpenStage={() => void session.openStage()}
      onCloseStage={session.stopStage}
    />
  );
}
