import { StageExperience } from '../components/stage/StageExperience';
import { musicians } from '../data/orchestraDemo';
import { useOrchestraSession } from '../features/orchestra/useOrchestraSession';

const fullOrchestraLineup = musicians.map((musician) => musician.id);

export function StagePage() {
  const session = useOrchestraSession({
    defaultLineupIds: fullOrchestraLineup,
    preloadSelectedStems: false,
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
      onSeek={session.seek}
      onSelectMusician={session.selectMusician}
      onToggleMusicianInLineup={session.toggleMusician}
      onSceneChange={session.changeScene}
      onOpenStage={() => void session.openStage()}
      onCloseStage={session.stopStage}
    />
  );
}
