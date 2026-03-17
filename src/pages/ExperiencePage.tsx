import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { AudioMixer } from '../components/AudioMixer';
import { KnowledgePanel } from '../components/KnowledgePanel';
import { WebArScene } from '../components/ar/WebArScene';
import { AudioEngine } from '../lib/audio/AudioEngine';
import {
  getCameraErrorMessage,
  getDeviceCapabilities,
  requestCameraAccess,
} from '../lib/device';
import { buildEntryPath, getEntryById } from '../lib/entries';
import { parseLaunchSearchParams } from '../lib/launch';
import {
  getSourceLabel,
  getTrackingModeLabel,
  resolveWebArScene,
} from '../lib/webar';
import type { KnowledgeCard } from '../types/manifest';

type SceneStatus =
  | 'idle'
  | 'loading'
  | 'scanning'
  | 'found'
  | 'lost'
  | 'fallback'
  | 'error';

const statusTextMap: Record<SceneStatus, string> = {
  idle: '尚未启动',
  loading: '正在请求相机权限并初始化 WebAR 引擎',
  scanning: '请按提示完成识图或平面放置',
  found: '触发成功，3D 内容已显示',
  lost: '目标丢失，请重新对准或重新放置',
  fallback: '当前已降级到 2D 预览',
  error: 'AR 启动失败，请查看错误信息后重试',
};

function getLaunchTitle(trackingMode: string) {
  return trackingMode === 'surface-placement'
    ? '准备进入平面放置场景'
    : '准备进入识图触发场景';
}

function getLaunchDescription(
  sourceLabel: string,
  trackingMode: string,
  prompt?: string,
) {
  if (prompt) {
    return `${sourceLabel}已选中当前条目。${prompt}`;
  }

  if (trackingMode === 'surface-placement') {
    return `${sourceLabel}已选中当前条目。启动后请先允许相机权限，再在真实平面上放置 3D 模型。`;
  }

  return `${sourceLabel}已选中当前条目。启动后请将镜头对准可触发当前内容的识别图。`;
}

export function ExperiencePage() {
  const { entryId } = useParams();
  const [searchParams] = useSearchParams();
  const entry = getEntryById(entryId);
  const audioRef = useRef<AudioEngine | null>(null);
  const autoLaunchKeyRef = useRef('');
  const [selectedCard, setSelectedCard] = useState<KnowledgeCard | null>(
    entry?.knowledgeCards[0] ?? null,
  );
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});
  const [soloStemId, setSoloStemId] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.88);
  const [playing, setPlaying] = useState(false);
  const [sceneStarted, setSceneStarted] = useState(false);
  const [status, setStatus] = useState<SceneStatus>('idle');
  const [sceneKey, setSceneKey] = useState(0);
  const [startupError, setStartupError] = useState('');
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const capabilities = useMemo(() => getDeviceCapabilities(), []);
  const launchContext = useMemo(
    () => parseLaunchSearchParams(searchParams),
    [searchParams],
  );

  useEffect(() => {
    if (!entry) {
      return;
    }

    const defaultEnabledMap = Object.fromEntries(
      entry.audioStems.map((stem) => [stem.id, stem.defaultEnabled]),
    );

    setEnabledMap(defaultEnabledMap);
    setSelectedCard(entry.knowledgeCards[0] ?? null);
    setSoloStemId(null);
    setPlaying(false);
    setSceneStarted(false);
    setStatus('idle');
    setSceneKey(0);
    setStartupError('');
    setDebugMessages([]);
    audioRef.current = new AudioEngine();
    autoLaunchKeyRef.current = '';

    return () => {
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, [entry]);

  if (!entry) {
    return <Navigate replace to="/not-found" />;
  }

  const scene = resolveWebArScene(entry, launchContext.source);
  const canUseAr = capabilities.canUseAr;
  const isPlaying = playing;
  const sourceLabel = getSourceLabel(launchContext.source);
  const trackingModeLabel = getTrackingModeLabel(scene);

  const pushDebugMessage = useCallback((message: string) => {
    setDebugMessages((current) => {
      if (current[current.length - 1] === message) {
        return current;
      }

      return [...current.slice(-7), message];
    });
  }, []);

  const handleStatusChange = useCallback((nextStatus: string) => {
    setStatus(nextStatus as SceneStatus);
  }, []);

  const handleSceneError = useCallback((message: string) => {
    setStartupError(message);
  }, []);

  const startAudio = useCallback(async () => {
    await audioRef.current?.play(entry.audioStems);
    setPlaying(true);
  }, [entry.audioStems]);

  const launchExperience = useCallback(async () => {
    setStartupError('');
    setDebugMessages([]);
    pushDebugMessage(`开始启动 ${scene.provider} WebAR 场景`);

    if (!canUseAr) {
      setSceneStarted(true);
      void startAudio().catch((error) => {
        pushDebugMessage(
          `音频启动失败：${error instanceof Error ? error.message : String(error)}`,
        );
      });
      setStatus('fallback');
      pushDebugMessage('当前环境不满足 WebAR 条件，已切换到 2D 预览');
      return;
    }

    try {
      setStatus('loading');
      pushDebugMessage('开始预检相机权限');
      await requestCameraAccess({
        releaseDelayMs: capabilities.isIPhone ? 420 : 160,
      });
      pushDebugMessage('相机预检通过，准备挂载 WebAR 场景');
      setSceneStarted(true);
      void startAudio().catch((error) => {
        pushDebugMessage(
          `音频启动失败：${error instanceof Error ? error.message : String(error)}`,
        );
      });
    } catch (error) {
      setSceneStarted(false);
      setStatus('error');
      setStartupError(getCameraErrorMessage(error));
      pushDebugMessage(`相机预检失败：${getCameraErrorMessage(error)}`);
    }
  }, [canUseAr, capabilities.isIPhone, pushDebugMessage, scene.provider, startAudio]);

  useEffect(() => {
    if (!launchContext.autostart || sceneStarted) {
      return;
    }

    const autoLaunchKey = `${entry.id}:${launchContext.source}:${scene.id}`;

    if (autoLaunchKeyRef.current === autoLaunchKey) {
      return;
    }

    autoLaunchKeyRef.current = autoLaunchKey;
    void launchExperience();
  }, [
    entry.id,
    launchContext.autostart,
    launchContext.source,
    launchExperience,
    scene.id,
    sceneStarted,
  ]);

  const togglePlayback = async () => {
    if (!audioRef.current) {
      return;
    }

    if (audioRef.current.isPlaying()) {
      audioRef.current.stop();
      setPlaying(false);
      return;
    }

    await audioRef.current.play(entry.audioStems);
    setPlaying(true);
  };

  const toggleStem = (stemId: string) => {
    const nextEnabled = !(enabledMap[stemId] ?? false);
    setEnabledMap((current) => ({
      ...current,
      [stemId]: nextEnabled,
    }));
    audioRef.current?.setStemEnabled(stemId, nextEnabled);
  };

  const toggleSolo = (stemId: string) => {
    const nextSolo = soloStemId === stemId ? null : stemId;
    setSoloStemId(nextSolo);
    audioRef.current?.setSoloStem(nextSolo);
  };

  const handleVolumeChange = (nextVolume: number) => {
    setVolume(nextVolume);
    audioRef.current?.setMasterVolume(nextVolume);
  };

  const resetScene = async () => {
    setStartupError('');
    setDebugMessages([]);

    if (!sceneStarted) {
      await launchExperience();
      return;
    }

    setSceneKey((current) => current + 1);
    setStatus(canUseAr ? 'loading' : 'fallback');
    pushDebugMessage('已重置场景，准备重新初始化');
    void startAudio().catch((error) => {
      pushDebugMessage(
        `音频重启失败：${error instanceof Error ? error.message : String(error)}`,
      );
    });
  };

  return (
    <div className="page experience-page">
      <section className="experience-header">
        <div>
          <p className="eyebrow">{entry.orchestraZone}</p>
          <h1>{entry.title}</h1>
          <p>{entry.description}</p>
        </div>
        <div className="experience-header__actions">
          <Link className="button button--ghost" to={buildEntryPath(entry.id)}>
            返回入口页
          </Link>
          <button className="button" onClick={resetScene} type="button">
            重置场景
          </button>
        </div>
      </section>

      <section className="experience-layout">
        <div className="experience-stage card">
          <div className="stage-toolbar">
            <div>
              <strong>场景状态</strong>
              <p>{statusTextMap[status]}</p>
            </div>
            <div className="status-tags">
              <span className="status-tag">{canUseAr ? 'WebAR 可用' : '自动降级'}</span>
              <span className="status-tag">{sourceLabel}</span>
              <span className="status-tag">{trackingModeLabel}</span>
              <span className="status-tag">{scene.provider}</span>
            </div>
          </div>

          {startupError ? (
            <div className="status-message status-message--error">
              <strong>启动失败</strong>
              <p>{startupError}</p>
            </div>
          ) : null}

          {debugMessages.length ? (
            <div className="status-message status-message--debug">
              <strong>调试信息</strong>
              <ul className="debug-list">
                {debugMessages.map((message, index) => (
                  <li key={`${index}-${message}`}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {!sceneStarted ? (
            <div className="launch-panel">
              <img
                src={scene.target?.previewImage ?? entry.targetImage}
                alt={`${entry.title} 场景入口图`}
              />
              <div>
                <h2>{getLaunchTitle(scene.trackingMode)}</h2>
                <p>
                  {getLaunchDescription(
                    sourceLabel,
                    scene.trackingMode,
                    scene.placementPrompt,
                  )}
                </p>
                <button className="button" onClick={() => void launchExperience()} type="button">
                  启动体验
                </button>
              </div>
            </div>
          ) : canUseAr ? (
            <WebArScene
              entry={entry}
              source={launchContext.source}
              key={`${entry.id}-${scene.id}-${sceneKey}`}
              onDebug={pushDebugMessage}
              onError={handleSceneError}
              onSelectCard={setSelectedCard}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <div className="fallback-view">
              <img src={entry.posterImage} alt={entry.title} />
              <div>
                <h2>2D 预览模式</h2>
                <p>
                  当前环境未满足相机或安全上下文要求。你仍然可以验证分轨音频、知识热点和入口映射。
                </p>
                <div className="chip-row">
                  {entry.knowledgeCards.map((card) => (
                    <button
                      className={selectedCard?.id === card.id ? 'chip chip--active' : 'chip'}
                      key={card.id}
                      onClick={() => setSelectedCard(card)}
                      type="button"
                    >
                      {card.anchor}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="experience-side">
          <AudioMixer
            enabledMap={enabledMap}
            isPlaying={isPlaying}
            onSoloStem={toggleSolo}
            onTogglePlayback={togglePlayback}
            onToggleStem={toggleStem}
            onVolumeChange={handleVolumeChange}
            soloStemId={soloStemId}
            stems={entry.audioStems}
            volume={volume}
          />
          <KnowledgePanel
            entry={entry}
            selectedCard={selectedCard}
            onSelect={setSelectedCard}
          />
        </div>
      </section>
    </div>
  );
}
