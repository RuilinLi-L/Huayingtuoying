import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { oboePlayer } from '../../data/oboePlayer';
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

const ModelViewer = lazy(() => import('../InstrumentModelViewer').then(module => ({ default: module.InstrumentModelViewer })));

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
  currentScene: OrchestraSceneDefinition;
  sceneOptions: OrchestraSceneDefinition[];
  onTogglePlayback: () => void;
  onSeek: (timeInSeconds: number) => void;
  onSelectMusician: (musicianId: string) => void;
  onToggleMusicianInLineup: (musicianId: string) => void;
  onSceneChange: (sceneId: OrchestraSceneDefinition['id']) => void;
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
  currentScene,
  sceneOptions,
  onTogglePlayback,
  onSeek,
  onSelectMusician,
  onToggleMusicianInLineup,
  onSceneChange,
}: StageExperienceProps) {
  const [view, setView] = useState<'orchestra' | 'oboe'>('orchestra');
  const focusedMusician = musicians.find((item) => item.id === focusedMusicianId) ?? null;
  const previousIds = useRef(selectedIds);
  const [pulseIds, setPulseIds] = useState<string[]>([]);
  const lineupKey = selectedIds.join(',');
  useEffect(() => {
    const next = lineupKey ? lineupKey.split(',') : [];
    setPulseIds(next.filter((id) => !previousIds.current.includes(id)));
    previousIds.current = next;
    const timeout = window.setTimeout(() => setPulseIds([]), 560);
    return () => window.clearTimeout(timeout);
  }, [lineupKey]);
  const heroHighlights = focusedMusicianId && highlightIds.includes(focusedMusicianId) ? [focusedMusicianId] : [];

  return (
    <div className="stage-mobile">
      <div className="stage-mobile__view-tabs" role="group" aria-label="舞台展示方式">
        <button type="button" aria-pressed={view === 'orchestra'} onClick={() => setView('orchestra')}>乐团</button>
        <button type="button" aria-pressed={view === 'oboe'} onClick={() => setView('oboe')}>双簧管 3D</button>
      </div>
      {view === 'orchestra' ? <StageHero currentScene={currentScene} selectedIds={selectedIds} highlightIds={heroHighlights} pulseIds={pulseIds} /> : (
        <section className="stage-mobile__character-preview" aria-label="双簧管人物预览">
          <Suspense fallback={<p>正在准备 3D 预览…</p>}><ModelViewer modelUrl={oboePlayer.modelUrl} title={oboePlayer.title} accentColor={oboePlayer.themeColor!} /></Suspense>
          <p>双簧管演奏家 · 拖动旋转，双指缩放</p>
          <Link className="button" to="/experience/oboe-player">扫描体验</Link>
        </section>
      )}
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
      <header className="stage-mobile__intro">
        <h1>Orchestra</h1>
        <p>点选乐器，加入或移出演奏。让不同声部交织，听见你的交响乐团。</p>
      </header>

      <div className="stage-mobile__sections" aria-label="乐团声部">
        <OrchestraSection
          section="strings"
          musicians={musicians}
          selectedIds={selectedIds}
          pulseIds={pulseIds}
          focusedMusicianId={focusedMusicianId}
          onSelectMusician={onSelectMusician}
          onToggleMusician={onToggleMusicianInLineup}
        />
        <OrchestraSection
          section="woodwind"
          musicians={musicians}
          selectedIds={selectedIds}
          pulseIds={pulseIds}
          focusedMusicianId={focusedMusicianId}
          onSelectMusician={onSelectMusician}
          onToggleMusician={onToggleMusicianInLineup}
        />
        <OrchestraSection
          section="brass"
          musicians={musicians}
          selectedIds={selectedIds}
          pulseIds={pulseIds}
          focusedMusicianId={focusedMusicianId}
          onSelectMusician={onSelectMusician}
          onToggleMusician={onToggleMusicianInLineup}
        />
      </div>

      <StageActions
        currentScene={currentScene}
        onSceneChange={onSceneChange}
        sceneOptions={sceneOptions}
        selectedCount={selectedIds.length}
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
