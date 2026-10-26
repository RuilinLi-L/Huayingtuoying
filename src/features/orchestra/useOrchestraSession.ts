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
import type { MusicianSection, NfcSessionSnapshot, OrchestraSceneId } from '../../types/demo';
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
  playOnSelection?: boolean;
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
  playOnSelection = false,
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
  const playbackIntentRef = useRef(false);
  const manuallyPausedRef = useRef(false);
  const pendingRequestRef = useRef(false);
  const requestVersionRef = useRef(0);
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

  // One path handles gestures, adapter snapshots and resets. Only the latest
  // request may publish loading/error state after asynchronous audio decoding.
  const applyAudio = useCallback(async (ids: string[], shouldPlay: boolean) => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    const version = ++requestVersionRef.current;
    const isCurrent = () => mountedRef.current && audioEngineRef.current === engine && requestVersionRef.current === version;
    if (!ids.length) {
      playbackIntentRef.current = false;
      manuallyPausedRef.current = false;
      pendingRequestRef.current = false;
      engine.stop();
      setIsLoading(false);
      setIsPlaying(false);
      setPlaybackTime(0);
      setAudioError('');
      return;
    }
    if (!shouldPlay) engine.pause();
    pendingRequestRef.current = shouldPlay;
    setIsLoading(shouldPlay);
    setAudioError('');
    try {
      const error = await engine.setActiveStems(compositionStems, ids, {
        load: shouldPlay,
        playWhenReady: shouldPlay,
      });
      if (isCurrent()) setAudioError(error ?? '');
    } catch (error) {
      if (isCurrent()) setAudioError(getAudioErrorMessage(error));
    } finally {
      if (isCurrent()) {
        pendingRequestRef.current = false;
        playbackIntentRef.current = engine.isPlaying();
        setIsLoading(false);
        setIsPlaying(engine.isPlaying());
        setPlaybackTime(engine.getCurrentTime());
        setDuration(engine.getDuration());
      }
    }
  }, [compositionStems]);

  useEffect(() => {
    const engine = new AudioEngine();
    audioEngineRef.current = engine;

    return () => {
      requestVersionRef.current += 1;
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
          void applyAudio(nextSnapshot.placedMusicianIds, playbackIntentRef.current);
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
  }, [mockAdapter, applyAudio]);

  useEffect(() => {
    try {
      playbackIntentRef.current = false;
      manuallyPausedRef.current = false;
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
    if (streamRef.current || cameraOpeningRef.current) {
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
  }, [capabilities.canUseCamera]);

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

  const publishLineup = useCallback((ids: string[]) => {
    try {
      mockAdapter.pushSnapshot(ids, deepLinkSource);
      setNfcSnapshotError('');
    } catch (error) {
      setNfcSnapshotError(getAudioErrorMessage(error));
    }
  }, [mockAdapter, deepLinkSource]);

  const toggleMusician = useCallback((musicianId: string) => {
    if (!getMusicianById(musicianId)) return;
    const ids = snapshotRef.current.placedMusicianIds;
    const adding = !ids.includes(musicianId);
    if (adding && playOnSelection && !manuallyPausedRef.current) playbackIntentRef.current = true;
    publishLineup(adding ? [...ids, musicianId] : ids.filter(id => id !== musicianId));
  }, [playOnSelection, publishLineup]);

  const resetSection = useCallback((section: MusicianSection) => {
    publishLineup(snapshotRef.current.placedMusicianIds.filter(id => getMusicianById(id)?.section !== section));
  }, [publishLineup]);

  const resetAll = useCallback(() => {
    playbackIntentRef.current = false;
    manuallyPausedRef.current = false;
    setFocusedMusicianId(null);
    publishLineup([]);
  }, [publishLineup]);

  const togglePlayback = useCallback(async () => {
    const engine = audioEngineRef.current;
    const ids = snapshotRef.current.placedMusicianIds;
    if (!engine || !ids.length) return;
    const shouldPlay = !(engine.isPlaying() || pendingRequestRef.current);
    playbackIntentRef.current = shouldPlay;
    manuallyPausedRef.current = !shouldPlay;
    await applyAudio(ids, shouldPlay);
  }, [applyAudio]);

  const retryPlayback = useCallback(async () => {
    playbackIntentRef.current = true;
    manuallyPausedRef.current = false;
    await applyAudio(snapshotRef.current.placedMusicianIds, true);
  }, [applyAudio]);

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
    resetSection,
    resetAll,
    togglePlayback,
    retryPlayback,
    seek,
    changeScene,
    selectMusician,
  };
}
