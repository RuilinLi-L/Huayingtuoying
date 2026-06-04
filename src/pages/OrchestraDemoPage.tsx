import { ProjectorScreenChart } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MusicianInsightPanel } from '../components/demo/MusicianInsightPanel';
import { NfcDeckPanel } from '../components/demo/NfcDeckPanel';
import { OrchestraStage } from '../components/demo/OrchestraStage';
import { fixedComposition, musicians } from '../data/orchestraDemo';
import { normalizeMusicianIds } from '../data/sleepingBeauty';
import { AudioEngine } from '../lib/audio/AudioEngine';
import { getCameraErrorMessage, getDeviceCapabilities } from '../lib/device';
import {
  buildNfcPreviewPayload,
  createMockNfcSessionAdapter,
  createReservedNfcSessionAdapter,
} from '../lib/nfcSession';
import {
  describeLineup,
  getMusicianById,
  getOrchestraScenes,
  getRecommendedSceneIds,
  getSceneById,
  resolveHighlightIds,
  resolveOrchestraMode,
} from '../lib/orchestraSession';
import type { NfcSessionSnapshot, OrchestraSceneId } from '../types/demo';
import type { AudioStem } from '../types/manifest';

const allScenes = getOrchestraScenes();

function getAudioErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function parseLineup(value: string | null) {
  if (!value) {
    return [];
  }

  return normalizeMusicianIds(value.split(',').map((item) => item.trim()));
}

export function OrchestraDemoPage() {
  const [searchParams] = useSearchParams();
  const initialLineup = useMemo(
    () => parseLineup(searchParams.get('lineup')),
    [searchParams],
  );
  const initialSceneId = (searchParams.get('scene') as OrchestraSceneId | null) ?? 'qintai';
  const deepLinkSource = searchParams.get('source') === 'nfc' ? 'deep-link' : 'mock';
  const capabilities = useMemo(() => getDeviceCapabilities(), []);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const mockAdapterRef = useRef(createMockNfcSessionAdapter(initialLineup));
  const [reservedAdapter] = useState(() => createReservedNfcSessionAdapter());
  const [snapshot, setSnapshot] = useState<NfcSessionSnapshot>({
    baseAnchorId: 'hust-art-badge',
    placedMusicianIds: initialLineup,
    detectedCount: initialLineup.length,
    source: deepLinkSource,
    updatedAt: new Date().toISOString(),
  });
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [currentSceneId, setCurrentSceneId] = useState<OrchestraSceneId>(initialSceneId);
  const [focusedMusicianId, setFocusedMusicianId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState('');

  const compositionStems = useMemo<AudioStem[]>(
    () =>
      fixedComposition.stems.map((stem) => ({
        id: stem.id,
        name: stem.name,
        file: stem.file,
        defaultEnabled: true,
        group: getMusicianById(stem.musicianId)?.section ?? 'ensemble',
        stereoPan: stem.stereoPan,
        gain: stem.gain,
      })),
    [],
  );

  useEffect(() => {
    const engine = new AudioEngine();
    audioEngineRef.current = engine;

    return () => {
      engine.dispose();
      audioEngineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const adapter = mockAdapterRef.current;
    void adapter.connect();

    const unsubscribe = adapter.subscribe(setSnapshot);
    if (initialLineup.length) {
      adapter.pushSnapshot(initialLineup, deepLinkSource);
    }

    return () => {
      unsubscribe();
      adapter.disconnect();
    };
  }, [deepLinkSource, initialLineup]);

  useEffect(() => {
    let frameId = 0;

    const syncPlaybackState = () => {
      const engine = audioEngineRef.current;
      if (engine) {
        const nextDuration = engine.getDuration();
        const nextTime = engine.getCurrentTime();
        const nextPlaying = engine.isPlaying();

        setDuration((current) => (current === nextDuration ? current : nextDuration));
        setPlaybackTime((current) =>
          Math.abs(current - nextTime) < 0.01 ? current : nextTime,
        );
        setIsPlaying((current) => (current === nextPlaying ? current : nextPlaying));
      }

      frameId = window.requestAnimationFrame(syncPlaybackState);
    };

    frameId = window.requestAnimationFrame(syncPlaybackState);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncSelectedStems = async () => {
      const engine = audioEngineRef.current;
      if (!engine) {
        return;
      }

      const nextAudioError = await engine.setActiveStems(
        compositionStems,
        snapshot.placedMusicianIds,
        { load: engine.isPlaying() },
      );

      if (cancelled) {
        return;
      }

      setAudioError(nextAudioError ?? '');
      setDuration(engine.getDuration());
      setPlaybackTime(engine.getCurrentTime());
      setIsPlaying(engine.isPlaying());
    };

    void syncSelectedStems().catch((error) => {
      if (cancelled) {
        return;
      }

      setAudioError(getAudioErrorMessage(error));
      setDuration(audioEngineRef.current?.getDuration() ?? 0);
      setPlaybackTime(audioEngineRef.current?.getCurrentTime() ?? 0);
      setIsPlaying(audioEngineRef.current?.isPlaying() ?? false);
    });

    return () => {
      cancelled = true;
    };
  }, [compositionStems, snapshot.placedMusicianIds]);

  const mode = useMemo(
    () => resolveOrchestraMode(snapshot.placedMusicianIds),
    [snapshot.placedMusicianIds],
  );
  const highlightIds = useMemo(
    () => resolveHighlightIds(snapshot.placedMusicianIds, mode),
    [mode, snapshot.placedMusicianIds],
  );
  const currentScene = useMemo(
    () => getSceneById(currentSceneId) ?? allScenes[0],
    [currentSceneId],
  );
  const focusedMusician = focusedMusicianId ? getMusicianById(focusedMusicianId) ?? null : null;
  const recommendedSceneIds = getRecommendedSceneIds(mode.id);
  const recommendedScenes = allScenes.filter((scene) => recommendedSceneIds.includes(scene.id));
  const nfcPreviewPayload = buildNfcPreviewPayload(snapshot.placedMusicianIds);

  useEffect(() => {
    if (!recommendedSceneIds.includes(currentSceneId)) {
      setCurrentSceneId(recommendedSceneIds[0] ?? 'qintai');
    }
  }, [currentSceneId, recommendedSceneIds]);

  useEffect(() => {
    if (searchParams.get('autostart') === '1' || searchParams.get('source') === 'nfc') {
      void openStage();
    }

    return () => {
      stopStage();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openStage() {
    if (cameraReady || !capabilities.canUseCamera) {
      if (!capabilities.canUseCamera) {
        setCameraError('当前浏览器不能稳定访问相机，页面会继续保留静态舞台与控制台说明。');
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: {
            ideal: 'environment',
          },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraError('');
      setCameraReady(true);
    } catch (error) {
      setCameraReady(false);
      setCameraError(getCameraErrorMessage(error));
    }
  }

  function stopStage() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
  }

  function toggleMusician(musicianId: string) {
    const nextIds = snapshot.placedMusicianIds.includes(musicianId)
      ? snapshot.placedMusicianIds.filter((id) => id !== musicianId)
      : [...snapshot.placedMusicianIds, musicianId];

    mockAdapterRef.current.pushSnapshot(nextIds, deepLinkSource);
  }

  async function togglePlayback() {
    const engine = audioEngineRef.current;
    if (!engine || !snapshot.placedMusicianIds.length) {
      return;
    }

    try {
      if (engine.isPlaying()) {
        engine.pause();
      } else {
        setAudioError('');
        await engine.init();
        const nextAudioError = await engine.setActiveStems(
          compositionStems,
          snapshot.placedMusicianIds,
        );
        setAudioError(nextAudioError ?? '');
        if (nextAudioError && !engine.hasPlayableActiveStems()) {
          return;
        }
        await engine.resume();
      }
    } catch (error) {
      setAudioError(getAudioErrorMessage(error));
    }

    setPlaybackTime(engine.getCurrentTime());
    setIsPlaying(engine.isPlaying());
  }

  function handleSeek(timeInSeconds: number) {
    const engine = audioEngineRef.current;
    if (!engine) {
      return;
    }

    engine.seek(timeInSeconds);
    setPlaybackTime(engine.getCurrentTime());
    setDuration(engine.getDuration());
  }

  function handleSceneChange(sceneId: OrchestraSceneId) {
    setCurrentSceneId(sceneId);
  }

  function handleSelectMusician(musicianId: string) {
    setFocusedMusicianId((current) => (current === musicianId ? null : musicianId));
  }

  return (
    <div className="page orchestra-page">
      <section className="orchestra-hero">
        <div className="orchestra-hero__content" data-reveal>
          <div>
            <p className="eyebrow">Base Demo</p>
            <h1>智能底座演示</h1>
          </div>
          <p className="orchestra-hero__summary">
            落子识别、分轨播放、舞台切换和数字名片集中在同一座虚拟音乐厅里，适合展陈现场直接讲解。
          </p>
        </div>

        <div className="orchestra-hero__actions" data-reveal>
          <button className="button" onClick={() => void openStage()} type="button">
            <ProjectorScreenChart size={18} weight="regular" />
            <span>打开舞台</span>
          </button>
          <Link className="button--ghost" to="/">
            <span>返回总览</span>
          </Link>
        </div>

        <dl className="orchestra-hero__status" data-reveal>
          <div className="status-metric">
            <dt>当前玩法</dt>
            <dd>{mode.name}</dd>
          </div>
          <div className="status-metric">
            <dt>识别结果</dt>
            <dd>{snapshot.detectedCount} / 12</dd>
          </div>
          <div className="status-metric">
            <dt>当前场景</dt>
            <dd>{currentScene.shortLabel}</dd>
          </div>
        </dl>
      </section>

      <section className="orchestra-layout">
        <div className="orchestra-layout__main">
          {audioError ? (
            <div className="status-message status-message--error">
              <strong>音频加载失败</strong>
              <p>{audioError}</p>
            </div>
          ) : null}

          <OrchestraStage
            cameraError={cameraError}
            cameraReady={cameraReady}
            composition={fixedComposition}
            currentScene={currentScene}
            currentTime={playbackTime}
            duration={duration}
            focusedMusicianId={focusedMusicianId}
            highlightIds={highlightIds}
            isPlaying={isPlaying}
            mode={mode}
            musicians={musicians}
            onCloseStage={stopStage}
            onOpenStage={() => void openStage()}
            onSceneChange={handleSceneChange}
            onSeek={handleSeek}
            onSelectMusician={handleSelectMusician}
            onTogglePlayback={() => void togglePlayback()}
            sceneOptions={recommendedScenes.length ? recommendedScenes : allScenes}
            selectedIds={snapshot.placedMusicianIds}
            videoRef={videoRef}
          />
        </div>

        <div className="orchestra-layout__side">
          <NfcDeckPanel
            mockAdapter={mockAdapterRef.current}
            onToggleMusician={toggleMusician}
            reservedAdapter={reservedAdapter}
            selectedIds={snapshot.placedMusicianIds}
            snapshot={snapshot}
          />

          <MusicianInsightPanel
            composition={fixedComposition}
            mode={mode}
            musician={focusedMusician}
            scene={currentScene}
            selectedIds={snapshot.placedMusicianIds}
          />
        </div>
      </section>

      <section className="orchestra-details" aria-label="底座演示说明">
        <details className="demo-disclosure">
          <summary>
            <span>玩法联动</span>
            <small>查看识别结果如何驱动舞台、场景与解释层</small>
          </summary>
          <div className="mode-overview__grid">
            <article className="mode-overview__card">
              <small>落子结果</small>
              <strong>{describeLineup(snapshot.placedMusicianIds)}</strong>
              <p>{mode.description}</p>
            </article>
            <article className="mode-overview__card">
              <small>高亮乐手</small>
              <strong>{highlightIds.length} 位</strong>
              <p>舞台会按当前组合突出重点乐手，其余角色自动弱化，方便现场讲解。</p>
            </article>
            <article className="mode-overview__card">
              <small>推荐场景</small>
              <strong>
                {(recommendedScenes.length ? recommendedScenes : allScenes)
                  .map((scene) => scene.shortLabel)
                  .join(' / ')}
              </strong>
              <p>场景切换不会影响全局播放进度，方便在展示中快速对比不同视觉语境。</p>
            </article>
          </div>
        </details>

        <details className="demo-disclosure">
          <summary>
            <span>NFC 接口与 payload</span>
            <small>硬件替换边界和当前模拟识别数据</small>
          </summary>
          <div className="nfc-bridge-card__body">
            <p>NFC 只负责提供会话快照，页面继续复用同一套舞台、播放和数字名片逻辑。</p>
            <code className="payload-code">
              {`interface NfcSessionAdapter {
  connect(): Promise<void>
  getSnapshot(): Promise<NfcSessionSnapshot>
  subscribe(listener): () => void
}`}
            </code>
            <code className="payload-code">
              {JSON.stringify(nfcPreviewPayload, null, 2)}
            </code>
          </div>
        </details>
      </section>
    </div>
  );
}
