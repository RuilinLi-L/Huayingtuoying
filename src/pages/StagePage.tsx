import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { StageExperience } from '../components/stage/StageExperience';
import { musicians } from '../data/orchestraDemo';
import { oboePlayer } from '../data/oboePlayer';
import { getEntryById } from '../lib/entries';
import { useOrchestraSession } from '../features/orchestra/useOrchestraSession';
import type { StageView } from '../lib/navigation';

const StageArPanel = lazy(() =>
  import('../components/stage/StageArPanel').then((m) => ({ default: m.StageArPanel })),
);
export function StagePage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation(),
    navigate = useNavigate();
  const view = params.get('view'),
    isAr = view === 'ar' || view === 'image-test';
  const entry = getEntryById(params.get('entry') ?? undefined) ?? oboePlayer;
  const defaultLineup = useRef(
    params.has('entry')
      ? entry.audioStems.map((s) => s.id)
      : params.get('source') === 'nfc'
        ? []
        : musicians.map((m) => m.id),
  );
  const returnView = useRef<'orchestra' | 'model'>(view === 'model' ? 'model' : 'orchestra');
  if (!isAr) returnView.current = view === 'model' ? 'model' : 'orchestra';
  const session = useOrchestraSession({
    defaultLineupIds: defaultLineup.current,
    preloadSelectedStems: false,
    audioVariant: 'stage-mobile',
    showAllScenes: true,
    enableCamera: false,
  });
  const [volume, setVolume] = useState(0.88),
    [solo, setSolo] = useState<string | null>(null);
  useEffect(()=>{if(isAr)session.pausePlayback()},[isAr,session.pausePlayback]);
  useEffect(() => {
    if (solo && !session.snapshot.placedMusicianIds.includes(solo)) {
      setSolo(null);
      session.setSoloStem(null);
    }
  }, [session.snapshot.placedMusicianIds, solo, session.setSoloStem]);
  const setView = (next: StageView, entryId?: string) =>
    setParams(
      (current) => {
        const query = new URLSearchParams(current);
        query.set('view', next);
        if (entryId) query.set('entry', entryId);
        query.delete('autostart');
        return query;
      },
      { state: next === 'ar' || next === 'image-test' ? { stageArEntry: true } : null },
    );
  const closeAr = () => {
    if (location.state?.stageArEntry) {
      navigate(-1);
      return;
    }
    const query = new URLSearchParams(params);
    query.set('view', returnView.current);
    query.delete('autostart');
    setParams(query, { replace: true, state: null });
  };
  if(params.has('entry')&&!getEntryById(params.get('entry')??undefined))return <Navigate replace to="/not-found"/>;
  return (
    <>
      {isAr && (
        <Suspense fallback={<p className="ar-status">正在准备体验…</p>}>
          <StageArPanel
            key={`${view}:${entry.id}`}
            entry={view === 'ar' ? oboePlayer : entry}
            mode={view}
            onPauseStage={session.pausePlayback}
            onClose={closeAr}
          />
        </Suspense>
      )}
      <div hidden={isAr}>
        <StageExperience
          view={returnView.current}
          suspended={isAr}
          onViewChange={setView}
          onOpenAr={() => setView('ar', 'oboe-player')}
          onOpenImageTest={() => setView('image-test', 'oboe-player')}
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
          currentScene={session.currentScene}
          sceneOptions={session.sceneOptions}
          onTogglePlayback={() => void session.togglePlayback()}
          onSeek={session.seek}
          onSelectMusician={session.selectMusician}
          onToggleMusicianInLineup={session.toggleMusician}
          onSceneChange={session.changeScene}
        />
        <details className="stage-extras">
          <summary>聆听设置与底座联动</summary>
          <label>
            总音量
            <input
              aria-label="总音量"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                session.setMasterVolume(v);
              }}
            />
          </label>
          <label>
            独奏声部
            <select
              aria-label="独奏声部"
              value={solo ?? ''}
              onChange={(e) => {
                const id = e.target.value || null;
                setSolo(id);
                session.setSoloStem(id);
              }}
            >
              <option value="">合奏</option>
              {musicians
                .filter((m) => session.snapshot.placedMusicianIds.includes(m.id))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.instrument}
                  </option>
                ))}
            </select>
          </label>
          <h3>{session.mode.name}</h3>
          <p>{session.mode.description}</p>
          <p>
            {session.snapshot.detectedCount} 位乐手 · {session.currentScene.name}
          </p>
          <details>
            <summary>底座连接详情</summary>
            <p>当前为模拟落子，可通过上方乐器按钮组合阵容。真实硬件接口已预留。</p>
            <pre>{JSON.stringify(session.nfcPreviewPayload, null, 2)}</pre>
          </details>
        </details>
      </div>
    </>
  );
}
