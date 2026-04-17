import {
  ArrowLeft,
  ArrowsClockwise,
  Camera,
  ProjectorScreenChart,
} from '@phosphor-icons/react';
import type { CSSProperties } from 'react';
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
import { resolveEntryTheme } from '../lib/theme';
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
  idle: '等待启动',
  loading: '正在准备相机权限与 WebAR 运行时',
  scanning: '请对准识别图或根据提示完成摆放',
  found: '识别成功，舞台内容已进入画面',
  lost: '目标暂时丢失，请重新对准',
  fallback: '当前环境已切换到 2D 预览',
  error: '启动失败，请查看提示后重试',
};

function getAudioErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getLaunchTitle(trackingMode: string) {
  return trackingMode === 'surface-placement'
    ? '准备进入平面放置场景'
    : '准备进入识别图触发场景';
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
    return `${sourceLabel}已选中当前条目。启动后请先允许相机，再在真实平面上放置模型。`;
  }

  return `${sourceLabel}已选中当前条目。启动后请将镜头对准识别图，让舞台内容在画面中稳定出现。`;
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
  const [audioError, setAudioError] = useState('');
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
    setAudioError('');
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
    setAudioError('');
    const nextAudioError = (await audioRef.current?.play(entry.audioStems)) ?? null;
    setPlaying(audioRef.current?.isPlaying() ?? false);

    if (nextAudioError) {
      setAudioError(nextAudioError);
      pushDebugMessage(`音频加载异常：${nextAudioError}`);
      return;
    }

    setAudioError('');
  }, [entry.audioStems, pushDebugMessage]);

  const launchExperience = useCallback(async () => {
    setStartupError('');
    setDebugMessages([]);
    pushDebugMessage(`开始挂载 ${scene.provider} 场景`);

    if (!canUseAr) {
      setSceneStarted(true);
      void startAudio().catch((error) => {
        const message = getAudioErrorMessage(error);
        setAudioError(message);
        pushDebugMessage(`音频启动失败：${message}`);
      });
      setStatus('fallback');
      pushDebugMessage('当前环境不满足 WebAR 条件，已切换到 2D 预览');
      return;
    }

    try {
      setStatus('loading');
      pushDebugMessage('开始请求相机权限');
      await requestCameraAccess({
        releaseDelayMs: capabilities.isIPhone ? 420 : 160,
      });
      pushDebugMessage('相机权限通过，准备进入场景');
      setSceneStarted(true);
      void startAudio().catch((error) => {
        const message = getAudioErrorMessage(error);
        setAudioError(message);
        pushDebugMessage(`音频启动失败：${message}`);
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

    const nextAudioError = await audioRef.current.play(entry.audioStems);
    setPlaying(audioRef.current.isPlaying());
    setAudioError(nextAudioError ?? '');

    if (nextAudioError) {
      pushDebugMessage(`音频加载异常：${nextAudioError}`);
    }
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
    setAudioError('');
    setDebugMessages([]);

    if (!sceneStarted) {
      await launchExperience();
      return;
    }

    setSceneKey((current) => current + 1);
    setStatus(canUseAr ? 'loading' : 'fallback');
    pushDebugMessage('场景已重置，准备重新初始化');
    void startAudio().catch((error) => {
      const message = getAudioErrorMessage(error);
      setAudioError(message);
      pushDebugMessage(`音频重启失败：${message}`);
    });
  };

  return (
    <div className="page experience-page" style={resolveEntryTheme(entry.themeColor)}>
      <section className="experience-overview">
        <div className="experience-overview__content" data-reveal>
          <p className="eyebrow">{entry.orchestraZone}</p>
          <h1>{entry.title}</h1>
          <p className="experience-overview__summary">{entry.description}</p>
          <div className="experience-header__actions">
            <Link className="button--ghost" to={buildEntryPath(entry.id)}>
              <ArrowLeft size={18} weight="regular" />
              <span>返回展签</span>
            </Link>
            <button className="button" onClick={resetScene} type="button">
              <ArrowsClockwise size={18} weight="regular" />
              <span>重置场景</span>
            </button>
          </div>
        </div>

        <aside
          className="experience-overview__meta"
          data-reveal
          style={{ '--delay-index': '1' } as CSSProperties}
        >
          <div className="metric-chip">
            <small>入口来源</small>
            <strong>{sourceLabel}</strong>
          </div>
          <div className="metric-chip">
            <small>追踪模式</small>
            <strong>{trackingModeLabel}</strong>
          </div>
          <div className="metric-chip">
            <small>当前引擎</small>
            <strong>{scene.provider}</strong>
          </div>
        </aside>
      </section>

      <section className="experience-layout">
        <div className="experience-stage card" data-reveal>
          <div className="section-heading">
            <div>
              <p className="eyebrow">舞台控制台</p>
              <h3>{statusTextMap[status]}</h3>
              <p>浅色壳层负责说明与控制，深色区专门负责沉浸舞台与相机画面。</p>
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
              <strong>场景启动失败</strong>
              <p>{startupError}</p>
            </div>
          ) : null}

          {audioError ? (
            <div className="status-message status-message--error">
              <strong>音频加载失败</strong>
              <p>{audioError}</p>
            </div>
          ) : null}

          {!canUseAr || status === 'fallback' ? (
            <div className="status-message status-message--info">
              <strong>已切换到 2D 预览</strong>
              <p>当前环境不能稳定使用相机或 WebAR，页面会保留音频、知识卡与入口映射，方便继续演示。</p>
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
              <div className="launch-panel__visual">
                <img
                  src={scene.target?.previewImage ?? entry.targetImage}
                  alt={`${entry.title} 场景入口图`}
                />
                {status === 'loading' ? (
                  <div className="loading-shell" aria-hidden="true">
                    <div className="loading-shell__line"></div>
                    <div className="loading-shell__line"></div>
                    <div className="loading-shell__line"></div>
                  </div>
                ) : null}
              </div>

              <div className="launch-panel__content">
                <div>
                  <p className="eyebrow">启动准备</p>
                  <h2>{getLaunchTitle(scene.trackingMode)}</h2>
                </div>
                <p>
                  {getLaunchDescription(
                    sourceLabel,
                    scene.trackingMode,
                    scene.placementPrompt,
                  )}
                </p>

                {launchContext.autostart ? (
                  <div className="autostart-shell">
                    <div className="autostart-shell__head">
                      <span className="autostart-shell__label">自动进入</span>
                      <Camera size={18} weight="regular" />
                    </div>
                    <p>当前入口带有自动启动参数，页面会在条件允许时直接进入体验，不需要再次确认。</p>
                  </div>
                ) : null}

                <div className="launch-panel__hint">
                  <button
                    className="button"
                    disabled={status === 'loading'}
                    onClick={() => void launchExperience()}
                    type="button"
                  >
                    <ProjectorScreenChart size={18} weight="regular" />
                    <span>{status === 'loading' ? '正在准备中' : '启动体验'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : canUseAr ? (
            <WebArScene
              entry={entry}
              key={`${entry.id}-${scene.id}-${sceneKey}`}
              onDebug={pushDebugMessage}
              onError={handleSceneError}
              onSelectCard={setSelectedCard}
              onStatusChange={handleStatusChange}
              source={launchContext.source}
            />
          ) : (
            <div className="fallback-view">
              <div className="fallback-view__visual">
                <img src={entry.posterImage} alt={entry.title} />
              </div>
              <div className="fallback-view__content">
                <div>
                  <p className="eyebrow">降级模式</p>
                  <h2>2D 预览仍然保留了核心说明与音频结构</h2>
                </div>
                <p>
                  当前浏览环境不能稳定满足相机或安全上下文要求，但你仍然可以验证分轨音频、知识卡切换与入口映射关系。
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
            isPlaying={playing}
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
            onSelect={setSelectedCard}
            selectedCard={selectedCard}
          />
        </div>
      </section>
    </div>
  );
}
