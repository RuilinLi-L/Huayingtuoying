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

    void engine.preload(compositionStems).then(() => {
      setDuration(engine.getDuration());
    });

    return () => {
      engine.dispose();
      audioEngineRef.current = null;
    };
  }, [compositionStems]);

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

      await engine.setActiveStems(compositionStems, snapshot.placedMusicianIds);

      if (cancelled) {
        return;
      }

      setDuration(engine.getDuration());
      setPlaybackTime(engine.getCurrentTime());
      setIsPlaying(engine.isPlaying());
    };

    void syncSelectedStems();

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
        setCameraError('当前浏览器不支持相机访问，页面会继续展示静态舞台。');
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

    if (engine.isPlaying()) {
      engine.pause();
    } else {
      await engine.resume();
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
        <div className="orchestra-hero__content">
          <p className="eyebrow">Base Demo</p>
          <h1>智能底座 + 12 位演奏家 + WebAR 音乐会</h1>
          <p className="orchestra-hero__summary">
            这版 demo 已接入《睡美人圆舞曲》12 条真实分轨：每位乐器对应独立声部，插入后按同一全局时间轴同步播放，
            全部拔出时暂停，再次插入会从上次位置继续。
          </p>
          <div className="hero__actions">
            <button className="button" onClick={() => void openStage()} type="button">
              进入演示
            </button>
            <Link className="button button--ghost" to="/">
              返回概览
            </Link>
          </div>
        </div>
        <div className="orchestra-hero__status card">
          <div className="status-metric">
            <small>当前玩法</small>
            <strong>{mode.name}</strong>
          </div>
          <div className="status-metric">
            <small>识别结果</small>
            <strong>{snapshot.detectedCount} / 12</strong>
          </div>
          <div className="status-metric">
            <small>当前曲目</small>
            <strong>{fixedComposition.title}</strong>
          </div>
          <div className="status-metric">
            <small>当前场景</small>
            <strong>{currentScene.name}</strong>
          </div>
        </div>
      </section>

      <section className="orchestra-layout">
        <div className="orchestra-layout__main">
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

          <section className="card mode-overview">
            <div className="section-heading">
              <div>
                <h3>玩法联动说明</h3>
                <p>保留原有编制判定和场景推荐逻辑，并统一切到《睡美人圆舞曲》12 轨全局同步机制。</p>
              </div>
            </div>
            <div className="mode-overview__grid">
              <article className="mode-overview__card">
                <small>落子结果</small>
                <strong>{describeLineup(snapshot.placedMusicianIds)}</strong>
                <p>{mode.description}</p>
              </article>
              <article className="mode-overview__card">
                <small>高亮乐手</small>
                <strong>{highlightIds.length} 位</strong>
                <p>舞台会继续按当前组合规则突出展示重点乐手，其余角色自动弱化。</p>
              </article>
              <article className="mode-overview__card">
                <small>推荐场景</small>
                <strong>
                  {(recommendedScenes.length ? recommendedScenes : allScenes)
                    .map((scene) => scene.shortLabel)
                    .join(' / ')}
                </strong>
                <p>场景切换不影响全局播放进度，乐器插拔和拖动进度条都会继续使用同一时间轴。</p>
              </article>
            </div>
          </section>
        </div>

        <div className="orchestra-layout__side">
          <NfcDeckPanel
            mockAdapter={mockAdapterRef.current}
            onToggleMusician={toggleMusician}
            reservedAdapter={reservedAdapter}
            selectedIds={snapshot.placedMusicianIds}
            snapshot={snapshot}
          />

          <section className="card nfc-bridge-card">
            <div className="section-heading">
              <div>
                <h3>NFC 接口预留</h3>
                <p>页面仍由 mock adapter 驱动，后续接硬件时只需要替换适配器实现，不用改上层玩法逻辑。</p>
              </div>
            </div>
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
          </section>

          <MusicianInsightPanel
            composition={fixedComposition}
            mode={mode}
            musician={focusedMusician}
            scene={currentScene}
            selectedIds={snapshot.placedMusicianIds}
          />
        </div>
      </section>
    </div>
  );
}
