import { lazy, Suspense, useEffect, useRef, useState } from 'react';
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
  view: 'orchestra' | 'model';
  suspended: boolean;
  onViewChange: (view:'orchestra'|'model') => void;
  onOpenAr: () => void;
  onOpenImageTest: () => void;
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
  view, suspended, onViewChange, onOpenAr, onOpenImageTest,
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
        <button type="button" aria-pressed={view === 'orchestra'} onClick={() => onViewChange('orchestra')}>乐团</button>
        <button type="button" aria-pressed={view === 'model'} onClick={() => onViewChange('model')}>双簧管 3D</button>
      </div>
      {view === 'orchestra' ? <StageHero currentScene={currentScene} selectedIds={selectedIds} highlightIds={heroHighlights} pulseIds={pulseIds} /> : (
        <section className="stage-mobile__character-preview" aria-label="双簧管人物预览">
          <Suspense fallback={<p>正在准备 3D 预览…</p>}>{!suspended&&<ModelViewer modelUrl={oboePlayer.modelUrl} title={oboePlayer.title} accentColor={oboePlayer.themeColor!} />}</Suspense>
          <p>双簧管演奏家 · 拖动旋转，双指缩放</p>
          <button className="button" onClick={onOpenAr}>打开实景 AR</button>
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
      {isLoading&&!isPlaying&&<p className="stage-mobile__notice" role="status">{currentTime>0?'正在缓冲，所有声部已同步暂停，准备好后继续。':'正在准备起播片段，所有声部就绪后一起开始。'}</p>}

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
        onOpenAr={onOpenAr}
        onOpenImageTest={onOpenImageTest}
        currentScene={currentScene}
        onSceneChange={onSceneChange}
        sceneOptions={sceneOptions}
        selectedCount={selectedIds.length}
      />

      <StageInsightSheet
        currentScene={currentScene}
        isInLineup={focusedMusician ? selectedIds.includes(focusedMusician.id) : false}
        musician={suspended ? null : focusedMusician}
        onClose={() => focusedMusician && onSelectMusician(focusedMusician.id)}
        onToggleLineup={onToggleMusicianInLineup}
      />
    </div>
  );
}
