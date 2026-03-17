import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MusicianInsightPanel } from '../components/demo/MusicianInsightPanel';
import { NfcDeckPanel } from '../components/demo/NfcDeckPanel';
import { OrchestraStage } from '../components/demo/OrchestraStage';
import { musicians } from '../data/orchestraDemo';
import { getCameraErrorMessage, getDeviceCapabilities } from '../lib/device';
import {
  buildNfcPreviewPayload,
  createMockNfcSessionAdapter,
  createReservedNfcSessionAdapter,
} from '../lib/nfcSession';
import {
  describeLineup,
  getDefaultTrackForMode,
  getMusicianById,
  getOrchestraScenes,
  getRecommendedSceneIds,
  getSceneById,
  getTrackById,
  getTracksForMode,
  resolveHighlightIds,
  resolveOrchestraMode,
} from '../lib/orchestraSession';
import type {
  NfcSessionSnapshot,
  OrchestraSceneId,
  TrackDefinition,
} from '../types/demo';

const allScenes = getOrchestraScenes();

function parseLineup(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => musicians.some((musician) => musician.id === item));
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [focusedMusicianId, setFocusedMusicianId] = useState<string | null>(
    initialLineup[0] ?? null,
  );
  const [isPlaying, setIsPlaying] = useState(false);

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

  const mode = useMemo(
    () => resolveOrchestraMode(snapshot.placedMusicianIds),
    [snapshot.placedMusicianIds],
  );
  const highlightIds = useMemo(
    () => resolveHighlightIds(snapshot.placedMusicianIds, mode),
    [mode, snapshot.placedMusicianIds],
  );
  const unlockedTracks = useMemo(() => getTracksForMode(mode.id), [mode.id]);
  const currentTrack = useMemo(
    () =>
      (currentTrackId ? getTrackById(currentTrackId) : null) ??
      getDefaultTrackForMode(mode.id),
    [currentTrackId, mode.id],
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
    if (!currentTrack || !audioRef.current) {
      setIsPlaying(false);
      return;
    }

    const audio = audioRef.current;

    if (audio.src !== new URL(currentTrack.audioSrc, window.location.origin).toString()) {
      audio.src = currentTrack.audioSrc;
      audio.load();
    }

    if (isPlaying) {
      void audio.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (!unlockedTracks.length) {
      setCurrentTrackId(null);
      setIsPlaying(false);
      return;
    }

    if (!currentTrackId || !unlockedTracks.some((track) => track.id === currentTrackId)) {
      setCurrentTrackId(unlockedTracks[0]?.id ?? null);
    }
  }, [currentTrackId, unlockedTracks]);

  useEffect(() => {
    if (!snapshot.placedMusicianIds.length) {
      setFocusedMusicianId(null);
      return;
    }

    if (focusedMusicianId && snapshot.placedMusicianIds.includes(focusedMusicianId)) {
      return;
    }

    setFocusedMusicianId(highlightIds[0] ?? snapshot.placedMusicianIds[0] ?? null);
  }, [focusedMusicianId, highlightIds, snapshot.placedMusicianIds]);

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
        setCameraError('当前浏览器不支持摄像头访问，demo 将仅展示静态舞台。');
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

  function togglePlayback() {
    if (!currentTrack) {
      return;
    }

    setIsPlaying((current) => !current);
  }

  function switchTrack(offset: number) {
    if (!unlockedTracks.length) {
      return;
    }

    const currentIndex = unlockedTracks.findIndex((track) => track.id === currentTrack?.id);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeIndex + offset + unlockedTracks.length) % unlockedTracks.length;
    const nextTrack = unlockedTracks[nextIndex];

    setCurrentTrackId(nextTrack?.id ?? null);
  }

  function handleSceneChange(sceneId: OrchestraSceneId) {
    setCurrentSceneId(sceneId);
  }

  return (
    <div className="page orchestra-page">
      <audio loop ref={audioRef} />

      <section className="orchestra-hero">
        <div className="orchestra-hero__content">
          <p className="eyebrow">Base Demo</p>
          <h1>智能底座 + 12 位演奏家 + WebAR 音乐会</h1>
          <p className="orchestra-hero__summary">
            这个 demo 用占位素材把最终产品的交互结构先跑通：落子识别、扫码进入、
            12 人乐团排位、玩法联动、曲目切换、场景切换和数字名片。
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
            <strong>{currentTrack?.title ?? '待解锁'}</strong>
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
            currentScene={currentScene}
            currentTrack={currentTrack}
            focusedMusicianId={focusedMusicianId}
            highlightIds={highlightIds}
            isPlaying={isPlaying}
            mode={mode}
            musicians={musicians}
            onCloseStage={stopStage}
            onNextTrack={() => switchTrack(1)}
            onOpenStage={() => void openStage()}
            onPreviousTrack={() => switchTrack(-1)}
            onSceneChange={handleSceneChange}
            onSelectMusician={setFocusedMusicianId}
            onTogglePlayback={togglePlayback}
            sceneOptions={recommendedScenes.length ? recommendedScenes : allScenes}
            selectedIds={snapshot.placedMusicianIds}
            videoRef={videoRef}
          />

          <section className="card mode-overview">
            <div className="section-heading">
              <div>
                <h3>玩法联动说明</h3>
                <p>当前组合会自动落入下面 4 类规则之一，后续真实 NFC 识别只需要替换数据来源。</p>
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
                <strong>{highlightIds.length ? highlightIds.length : 0} 位</strong>
                <p>舞台中会按当前规则自动高亮目标乐手，其余角色弱化或退到背景层。</p>
              </article>
              <article className="mode-overview__card">
                <small>推荐场景</small>
                <strong>
                  {(recommendedScenes.length ? recommendedScenes : allScenes)
                    .map((scene) => scene.shortLabel)
                    .join(' / ')}
                </strong>
                <p>正式版本中可按模式切换琴台、青年园、排练厅等校园地标背景。</p>
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
                <p>当前页面使用 mock adapter 驱动；后续接硬件时只替换适配器实现，不改上层玩法逻辑。</p>
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
            mode={mode}
            musician={focusedMusician}
            scene={currentScene}
            selectedIds={snapshot.placedMusicianIds}
            track={currentTrack as TrackDefinition | null}
          />
        </div>
      </section>
    </div>
  );
}
