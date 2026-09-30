import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { baseAnchorId, fixedComposition } from '../../data/orchestraDemo';
import {
  getSleepingBeautyStemFile,
  normalizeMusicianIds,
  type SleepingBeautyAudioVariant,
} from '../../data/sleepingBeauty';
import { AudioEngine } from '../../lib/audio/AudioEngine';
import { getCameraErrorMessage, getDeviceCapabilities } from '../../lib/device';
import {
  buildNfcPreviewPayload,
  createMockNfcSessionAdapter,
  createReservedNfcSessionAdapter,
} from '../../lib/nfcSession';
import {
  getMusicianById,
  getOrchestraScenes,
  getRecommendedSceneIds,
  getSceneById,
  resolveHighlightIds,
  resolveOrchestraMode,
} from '../../lib/orchestraSession';
import type { NfcSessionSnapshot, OrchestraSceneId } from '../../types/demo';
import type { AudioStem } from '../../types/manifest';

const allScenes = getOrchestraScenes();
const EMPTY_LINEUP: string[] = [];
const PLAYBACK_STATE_SYNC_INTERVAL_MS = 200;

interface UseOrchestraSessionOptions {
  /** Used only when the URL has no lineup parameter. The legacy demo defaults to none. */
  defaultLineupIds?: string[];
  /** The mobile stage can defer large stem downloads until Play is pressed. */
  preloadSelectedStems?: boolean;
  /** The stage uses lighter files while the legacy demo keeps the original stems. */
  audioVariant?: SleepingBeautyAudioVariant;
  /** Expose every scene when the stage lets visitors switch freely. */
  showAllScenes?: boolean;
  enableCamera?: boolean;
}

function parseLineup(value: string | null, defaultLineupIds: string[]) {
  return normalizeMusicianIds(
    value === null ? defaultLineupIds : value.split(',').map((item) => item.trim()),
  );
}

function getAudioErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function parseSceneId(value: string | null): OrchestraSceneId {
  return allScenes.find((scene) => scene.id === value)?.id ?? 'qintai';
}

export function useOrchestraSession({
  defaultLineupIds = EMPTY_LINEUP,
  preloadSelectedStems = true,
  audioVariant = 'mobile',
  showAllScenes = false,
  enableCamera = true,
}: UseOrchestraSessionOptions = {}) {
  const compositionStems = useMemo<AudioStem[]>(
    () => fixedComposition.stems.map((stem) => ({
      id: stem.id,
      name: stem.name,
      file: getSleepingBeautyStemFile(stem.id, audioVariant),
      defaultEnabled: true,
      group: getMusicianById(stem.musicianId)?.section ?? 'ensemble',
      stereoPan: stem.stereoPan,
      gain: stem.gain,
    })),
    [audioVariant],
  );
  const [searchParams] = useSearchParams();
  const lineupParam = searchParams.get('lineup');
  const sceneParam = searchParams.get('scene');
  const highlightParam = searchParams.get('highlight');
  const sourceParam = searchParams.get('source');
  const autostartParam = searchParams.get('autostart');
  const defaultLineupKey = defaultLineupIds.join(',');
  const urlLineupIds = useMemo(
    () => parseLineup(lineupParam, defaultLineupIds),
    // A caller may construct the default array during render; its value is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lineupParam, defaultLineupKey],
  );
  const deepLinkSource = sourceParam === 'nfc' ? 'deep-link' : 'mock';
  const hasValidSceneQuery = allScenes.some((scene) => scene.id === sceneParam);
  const capabilities = useMemo(() => getDeviceCapabilities(), []);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraOpeningRef = useRef(false);
  const mountedRef = useRef(true);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const playbackRequestRef = useRef(false);
  const [mockAdapter] = useState(() => createMockNfcSessionAdapter(urlLineupIds));
  const [reservedAdapter] = useState(() => createReservedNfcSessionAdapter());
  const [snapshot, setSnapshot] = useState<NfcSessionSnapshot>(() => ({
    baseAnchorId,
    placedMusicianIds: urlLineupIds,
    detectedCount: urlLineupIds.length,
    source: deepLinkSource,
    updatedAt: new Date().toISOString(),
  }));
  const [nfcConnectionError, setNfcConnectionError] = useState('');
  // The adapter notifies synchronously, including multiple toggles before React renders.
  const snapshotRef = useRef(snapshot);
  const [nfcSnapshotError, setNfcSnapshotError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [currentSceneId, setCurrentSceneId] = useState<OrchestraSceneId>(() =>
    parseSceneId(sceneParam),
  );
  const [focusedMusicianId, setFocusedMusicianId] = useState<string | null>(() =>
    highlightParam === null
      ? null
      : normalizeMusicianIds(highlightParam.split(','))[0] ?? null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState('');

  useEffect(() => {
    const engine = new AudioEngine();
    audioEngineRef.current = engine;

    return () => {
      engine.dispose();
      audioEngineRef.current = null;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    try {
      unsubscribe = mockAdapter.subscribe((nextSnapshot) => {
        if (active) {
          snapshotRef.current = nextSnapshot;
          setSnapshot(nextSnapshot);
        }
      });
      void mockAdapter.connect().catch((error: unknown) => {
        if (active) {
          setNfcConnectionError(getAudioErrorMessage(error));
        }
      });
    } catch (error) {
      setNfcConnectionError(getAudioErrorMessage(error));
    }

    return () => {
      active = false;
      unsubscribe();
      mockAdapter.disconnect();
    };
  }, [mockAdapter]);

  useEffect(() => {
    try {
      mockAdapter.pushSnapshot(urlLineupIds, deepLinkSource);
      setNfcSnapshotError('');
    } catch (error) {
      setNfcSnapshotError(getAudioErrorMessage(error));
    }
  }, [deepLinkSource, mockAdapter, urlLineupIds]);

  useEffect(() => {
    setCurrentSceneId(parseSceneId(sceneParam));
  }, [sceneParam]);

  useEffect(() => {
    setFocusedMusicianId(
      highlightParam === null
        ? null
        : normalizeMusicianIds(highlightParam.split(','))[0] ?? null,
    );
  }, [highlightParam]);

  useEffect(() => {
    const syncPlaybackState = () => {
      const engine = audioEngineRef.current;
      if (!engine) {
        return;
      }

      const nextDuration = engine.getDuration();
      const nextTime = engine.getCurrentTime();
      const nextPlaying = engine.isPlaying();

      setDuration((current) => (current === nextDuration ? current : nextDuration));
      setPlaybackTime((current) =>
        Math.abs(current - nextTime) < 0.01 ? current : nextTime,
      );
      setIsPlaying((current) => (current === nextPlaying ? current : nextPlaying));
    };

    syncPlaybackState();
    const timerId = window.setInterval(syncPlaybackState, PLAYBACK_STATE_SYNC_INTERVAL_MS);
    return () => window.clearInterval(timerId);
  }, []);

  const lineupKey = snapshot.placedMusicianIds.join(',');
  useEffect(() => {
    let active = true;
    const engine = audioEngineRef.current;
    if (!engine) {
      return;
    }

    void engine
      .setActiveStems(compositionStems, snapshot.placedMusicianIds, {
        load: engine.isPlaying() || playbackRequestRef.current,
        playWhenReady: playbackRequestRef.current,
      })
      .then((nextAudioError) => {
        if (!active) {
          return;
        }
        setAudioError(nextAudioError ?? '');
        setDuration(engine.getDuration());
        setPlaybackTime(engine.getCurrentTime());
        setIsPlaying(engine.isPlaying());
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setAudioError(getAudioErrorMessage(error));
        setDuration(engine.getDuration());
        setPlaybackTime(engine.getCurrentTime());
        setIsPlaying(engine.isPlaying());
      });

    return () => {
      active = false;
    };
    // The primitive key tracks lineup changes without restarting for snapshot timestamps.
  }, [lineupKey, compositionStems]);

  useEffect(() => {
    if (!preloadSelectedStems || !snapshot.placedMusicianIds.length) {
      return;
    }
    const engine = audioEngineRef.current;
    if (!engine) {
      return;
    }

    const selectedIds = new Set(snapshot.placedMusicianIds);
    const selectedStems = compositionStems.filter((stem) => selectedIds.has(stem.id));
    void engine.preload(selectedStems).catch(() => {
      // Playback retries the selected stems on the next user gesture.
    });
  }, [lineupKey, preloadSelectedStems, compositionStems]);

  const mode = useMemo(
    () => resolveOrchestraMode(snapshot.placedMusicianIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lineupKey],
  );
  const highlightIds = useMemo(() => {
    if (highlightParam !== null) {
      return normalizeMusicianIds(highlightParam.split(','));
    }
    return resolveHighlightIds(snapshot.placedMusicianIds, mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightParam, lineupKey, mode]);
  const currentScene = useMemo(() => getSceneById(currentSceneId), [currentSceneId]);
  const focusedMusician = focusedMusicianId
    ? getMusicianById(focusedMusicianId) ?? null
    : null;
  const recommendedSceneIds = useMemo(() => getRecommendedSceneIds(mode.id), [mode.id]);
  const recommendedScenes = allScenes.filter((scene) => recommendedSceneIds.includes(scene.id));
  const sceneOptions = showAllScenes
    ? allScenes
    : hasValidSceneQuery && !recommendedScenes.some((scene) => scene.id === currentSceneId)
      ? [currentScene, ...recommendedScenes]
      : recommendedScenes.length
        ? recommendedScenes
        : allScenes;
  const nfcPreviewPayload = useMemo(
    () => buildNfcPreviewPayload(snapshot.placedMusicianIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lineupKey],
  );

  useEffect(() => {
    if (!showAllScenes && !hasValidSceneQuery && !recommendedSceneIds.includes(currentSceneId)) {
      setCurrentSceneId(recommendedSceneIds[0] ?? 'qintai');
    }
  }, [currentSceneId, hasValidSceneQuery, recommendedSceneIds, showAllScenes]);

  const stopStage = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const openStage = useCallback(async () => {
    if (!enableCamera || streamRef.current || cameraOpeningRef.current) {
      return;
    }
    if (!capabilities.canUseCamera) {
      setCameraError('当前浏览器不能稳定访问相机，仍可继续使用音乐舞台。');
      return;
    }

    cameraOpeningRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError('');
      setCameraReady(true);
    } catch (error) {
      if (mountedRef.current) {
        setCameraReady(false);
        setCameraError(getCameraErrorMessage(error));
      }
    } finally {
      cameraOpeningRef.current = false;
    }
  }, [capabilities.canUseCamera, enableCamera]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopStage();
    };
  }, [stopStage]);

  useEffect(() => {
    // Existing deep-link behavior enters the camera experience; it does not autoplay audio.
    if (autostartParam === '1' || sourceParam === 'nfc') {
      void openStage();
    }
  }, [autostartParam, openStage, sourceParam]);

  const toggleMusician = useCallback(
    (musicianId: string) => {
      const currentIds = snapshotRef.current.placedMusicianIds;
      const nextIds = currentIds.includes(musicianId)
        ? currentIds.filter((id) => id !== musicianId)
        : [...currentIds, musicianId];
      try {
        mockAdapter.pushSnapshot(nextIds, deepLinkSource);
        setNfcSnapshotError('');
      } catch (error) {
        setNfcSnapshotError(getAudioErrorMessage(error));
      }
    },
    [deepLinkSource, mockAdapter],
  );

  const togglePlayback = useCallback(async () => {
    const engine = audioEngineRef.current;
    if (!engine || !snapshotRef.current.placedMusicianIds.length || playbackRequestRef.current) {
      return;
    }

    if (engine.isPlaying()) {
      engine.pause();
      setPlaybackTime(engine.getCurrentTime());
      setIsPlaying(false);
      return;
    }

    playbackRequestRef.current = true;
    setIsLoading(true);
    setAudioError('');
    try {
      await engine.init();
      // Resuming an AudioContext can finish after navigation disposed this session.
      if (!mountedRef.current || audioEngineRef.current !== engine) return;
      const requestedIds = snapshotRef.current.placedMusicianIds;
      const nextAudioError = await engine.setActiveStems(
        compositionStems,
        requestedIds,
        { playWhenReady: true },
      );
      if (!mountedRef.current || audioEngineRef.current !== engine) return;
      if (requestedIds.join(',') === snapshotRef.current.placedMusicianIds.join(',')) {
        setAudioError(nextAudioError ?? '');
      }
      // setActiveStems starts the latest request. A superseded request must never
      // resume playback after the visitor has removed every voice or navigated.
    } catch (error) {
      if (mountedRef.current) {
        setAudioError(getAudioErrorMessage(error));
      }
    } finally {
      playbackRequestRef.current = false;
      if (mountedRef.current) {
        setPlaybackTime(engine.getCurrentTime());
        setDuration(engine.getDuration());
        setIsPlaying(engine.isPlaying());
        setIsLoading(false);
      }
    }
  }, [snapshot.placedMusicianIds, compositionStems]);

  const seek = useCallback((timeInSeconds: number) => {
    const engine = audioEngineRef.current;
    if (!engine) {
      return;
    }
    engine.seek(timeInSeconds);
    setPlaybackTime(engine.getCurrentTime());
    setDuration(engine.getDuration());
  }, []);

  const changeScene = useCallback((sceneId: OrchestraSceneId) => {
    setCurrentSceneId(sceneId);
  }, []);

  const selectMusician = useCallback((musicianId: string) => {
    setFocusedMusicianId((current) => (current === musicianId ? null : musicianId));
  }, []);

  return {
    snapshot,
    nfcError: nfcConnectionError || nfcSnapshotError,
    mockAdapter,
    reservedAdapter,
    nfcPreviewPayload,
    capabilities,
    videoRef,
    cameraReady,
    cameraError,
    openStage,
    stopStage,
    mode,
    highlightIds,
    currentScene,
    currentSceneId,
    sceneOptions,
    focusedMusician,
    focusedMusicianId,
    isPlaying,
    isLoading,
    playbackTime,
    duration,
    audioError,
    toggleMusician,
    togglePlayback,
    seek,
    changeScene,
    selectMusician,
  };
}
