import { useEffect, useMemo, useRef, useState } from 'react';
import { ensureMindArAssets } from '../../lib/mindar';
import type { ResolvedWebArScene } from '../../lib/webar';
import type { EntryManifest, KnowledgeCard } from '../../types/manifest';

interface MindArSceneProps {
  entry: EntryManifest;
  scene: ResolvedWebArScene;
  onSelectCard: (card: KnowledgeCard) => void;
  onStatusChange: (status: string) => void;
  onError: (message: string) => void;
  onDebug: (message: string) => void;
}

type MindArSceneElement = HTMLElement & {
  hasLoaded?: boolean;
  renderer?: unknown;
  systems?: Record<string, { start?: () => void }>;
};

const hotspotPositions = ['-0.36 0.18 0.08', '0 0.36 0.08', '0.36 0.18 0.08'];
const STARTUP_TIMEOUT_MS = 12000;

function formatUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function MindArScene({
  entry,
  scene,
  onSelectCard,
  onStatusChange,
  onError,
  onDebug,
}: MindArSceneProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const sceneRef = useRef<MindArSceneElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const modelRef = useRef<HTMLElement | null>(null);
  const lastVideoSnapshotRef = useRef('');

  const hotspotCards = useMemo(
    () => entry.knowledgeCards.slice(0, hotspotPositions.length),
    [entry.knowledgeCards],
  );
  const trackingTarget = scene.target;
  const modelPosition = `${scene.modelPosition.x} ${scene.modelPosition.y} ${scene.modelPosition.z}`;
  const modelScale = `${scene.modelScale.x} ${scene.modelScale.y} ${scene.modelScale.z}`;

  useEffect(() => {
    let disposed = false;

    onStatusChange('loading');
    onDebug('开始加载 A-Frame 与 MindAR 运行时');

    void ensureMindArAssets()
      .then(() => {
        if (disposed) {
          return;
        }

        onDebug('WebAR 运行时加载完成');
        setReady(true);
      })
      .catch((loadError: Error) => {
        if (disposed) {
          return;
        }

        const message = `WebAR 资源加载失败：${loadError.message}`;
        setError(message);
        onError(message);
        onStatusChange('error');
        onDebug(message);
      });

    return () => {
      disposed = true;
    };
  }, [onDebug, onError, onStatusChange]);

  useEffect(() => {
    if (!ready || !targetRef.current || !sceneRef.current || !trackingTarget) {
      return;
    }

    const sceneElement = sceneRef.current;
    const targetElement = targetRef.current;
    const modelElement = modelRef.current;
    let disposed = false;
    let sceneLoaded = false;
    let renderStarted = false;
    let mindArStarted = false;
    let arReady = false;
    let videoSeen = false;

    const emitDebug = (message: string) => {
      if (!disposed) {
        onDebug(message);
      }
    };

    const fail = (message: string) => {
      if (disposed || arReady) {
        return;
      }

      setError(message);
      onError(message);
      onStatusChange('error');
      emitDebug(`失败：${message}`);
    };

    const captureVideoState = () => {
      const video =
        sceneElement.parentElement?.querySelector<HTMLVideoElement>('video') ?? null;

      if (!video) {
        if (lastVideoSnapshotRef.current !== '尚未发现相机 video 元素') {
          lastVideoSnapshotRef.current = '尚未发现相机 video 元素';
          emitDebug(lastVideoSnapshotRef.current);
        }
        return;
      }

      videoSeen = true;
      const snapshot = `检测到相机 video：readyState=${video.readyState}，尺寸=${video.videoWidth}x${video.videoHeight}，paused=${video.paused}`;

      if (lastVideoSnapshotRef.current !== snapshot) {
        lastVideoSnapshotRef.current = snapshot;
        emitDebug(snapshot);
      }
    };

    const startMindAr = () => {
      if (disposed || mindArStarted) {
        return;
      }

      const mindArSystem = sceneElement.systems?.['mindar-image-system'];

      if (!mindArSystem?.start) {
        emitDebug('MindAR system 尚未准备好，继续等待');
        return;
      }

      mindArStarted = true;
      emitDebug('已调用 MindAR start()');

      try {
        mindArSystem.start();
      } catch (startError) {
        fail(`MindAR 启动异常：${formatUnknownError(startError)}`);
      }
    };

    const handleSceneLoaded = () => {
      sceneLoaded = true;
      emitDebug('A-Frame 场景已加载');
    };

    const handleRenderStart = () => {
      renderStarted = true;
      emitDebug('A-Frame renderstart 已触发');
      startMindAr();
    };

    const handleReady = () => {
      arReady = true;
      emitDebug(
        scene.placementPrompt ?? '识别引擎已就绪，请将镜头对准识别图以触发 3D 内容',
      );
      onStatusChange('scanning');
    };

    const handleArError = (event: Event) => {
      const detail = (event as CustomEvent<{ error?: string }>).detail;
      const message =
        detail?.error === 'VIDEO_FAIL'
          ? '摄像头启动失败，请确认当前站点已获得相机权限，且没有其他应用占用相机。'
          : `AR 初始化失败：${detail?.error ?? '未知错误'}`;

      fail(message);
    };

    const handleFound = () => onStatusChange('found');
    const handleLost = () => onStatusChange('lost');

    const handleCardClick = (event: Event) => {
      const currentTarget = event.currentTarget as HTMLElement | null;
      const cardId = currentTarget?.dataset.cardId;
      const card = entry.knowledgeCards.find((item) => item.id === cardId);

      if (card) {
        onSelectCard(card);
      }
    };

    const handleModelLoaded = () => {
      emitDebug('3D 模型加载完成');
    };

    const handleModelError = (event: Event) => {
      const detail = (event as CustomEvent<{ src?: string }>).detail;
      emitDebug(
        `3D 模型加载失败：${detail?.src ?? entry.modelUrl}，相机会继续保留用于排查`,
      );
    };

    const handleWindowError = (event: ErrorEvent) => {
      emitDebug(`页面异常：${event.message}`);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      emitDebug(`Promise 异常：${formatUnknownError(event.reason)}`);
    };

    sceneElement.addEventListener('loaded', handleSceneLoaded);
    sceneElement.addEventListener('renderstart', handleRenderStart);
    sceneElement.addEventListener('arReady', handleReady);
    sceneElement.addEventListener('arError', handleArError);
    targetElement.addEventListener('targetFound', handleFound);
    targetElement.addEventListener('targetLost', handleLost);
    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    if (modelElement) {
      modelElement.addEventListener('model-loaded', handleModelLoaded);
      modelElement.addEventListener('model-error', handleModelError);
    }

    const clickableElements = Array.from(
      targetElement.querySelectorAll<HTMLElement>('[data-card-id]'),
    );
    clickableElements.forEach((element) =>
      element.addEventListener('click', handleCardClick),
    );

    emitDebug('MindAR 场景节点已挂载');

    if (sceneElement.hasLoaded) {
      handleSceneLoaded();
    }

    if (sceneElement.renderer) {
      handleRenderStart();
    }

    captureVideoState();

    const videoPollTimer = window.setInterval(captureVideoState, 1500);
    const startupTimer = window.setTimeout(() => {
      captureVideoState();

      if (arReady) {
        return;
      }

      if (!sceneLoaded) {
        fail('A-Frame 场景未完成初始化，通常是脚本或资源加载被阻断。');
        return;
      }

      if (!renderStarted) {
        fail('AR 场景未进入渲染阶段，通常是运行时或模型初始化卡住。');
        return;
      }

      if (!videoSeen) {
        fail('MindAR 已启动，但页面里还没有建立相机预览。请结合调试信息继续排查。');
        return;
      }

      fail('相机预览已建立，但识别引擎初始化超时。请结合调试信息继续排查。');
    }, STARTUP_TIMEOUT_MS);

    return () => {
      disposed = true;
      window.clearInterval(videoPollTimer);
      window.clearTimeout(startupTimer);

      sceneElement.removeEventListener('loaded', handleSceneLoaded);
      sceneElement.removeEventListener('renderstart', handleRenderStart);
      sceneElement.removeEventListener('arReady', handleReady);
      sceneElement.removeEventListener('arError', handleArError);
      targetElement.removeEventListener('targetFound', handleFound);
      targetElement.removeEventListener('targetLost', handleLost);
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);

      if (modelElement) {
        modelElement.removeEventListener('model-loaded', handleModelLoaded);
        modelElement.removeEventListener('model-error', handleModelError);
      }

      clickableElements.forEach((element) =>
        element.removeEventListener('click', handleCardClick),
      );
    };
  }, [
    entry.knowledgeCards,
    entry.modelUrl,
    onDebug,
    onError,
    onSelectCard,
    onStatusChange,
    ready,
    scene.placementPrompt,
    trackingTarget,
  ]);

  if (!trackingTarget) {
    return <div className="fallback-box">当前 MindAR 场景缺少识别图资源。</div>;
  }

  if (error) {
    return <div className="fallback-box">{error}</div>;
  }

  if (!ready) {
    return <div className="fallback-box">正在加载 WebAR 运行时与识别资源…</div>;
  }

  return (
    <div className="ar-container">
      <a-scene
        ref={sceneRef}
        className="mindar-scene"
        mindar-image={`imageTargetSrc: ${trackingTarget.trackingTargetSrc}; autoStart: false; uiLoading: no; uiScanning: no; uiError: no;`}
        embedded
        background="color: transparent"
        color-space="sRGB"
        renderer="alpha: true; antialias: true; colorManagement: true; physicallyCorrectLights: true"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
      >
        <a-camera
          position="0 0 0"
          look-controls="enabled: false"
          cursor="rayOrigin: mouse"
          raycaster="objects: .clickable"
        ></a-camera>

        <a-entity light="type: ambient; intensity: 1.4"></a-entity>
        <a-entity light="type: directional; intensity: 0.7" position="0 1 1"></a-entity>

        <a-entity
          ref={targetRef}
          mindar-image-target={`targetIndex: ${trackingTarget.targetIndex ?? 0}`}
        >
          <a-plane
            material={`src: ${trackingTarget.previewImage}; transparent: true`}
            position="0 0 0"
            width="1"
            height="0.62"
          ></a-plane>

          <a-gltf-model
            ref={modelRef}
            src={entry.modelUrl}
            position={modelPosition}
            scale={modelScale}
            animation="property: position; to: 0 0.1 0.12; dur: 1400; easing: easeInOutQuad; loop: true; dir: alternate"
          ></a-gltf-model>

          <a-ring
            position="0 -0.18 0.08"
            radius-inner="0.34"
            radius-outer="0.36"
            color={scene.accentColor}
            opacity="0.45"
          ></a-ring>

          {hotspotCards.map((card, index) => (
            <a-sphere
              key={card.id}
              className="clickable"
              data-card-id={card.id}
              position={hotspotPositions[index]}
              radius="0.045"
              color={scene.accentColor}
              opacity="0.94"
              animation="property: scale; from: 1 1 1; to: 1.2 1.2 1.2; dur: 900; easing: easeInOutSine; dir: alternate; loop: true"
            ></a-sphere>
          ))}
        </a-entity>
      </a-scene>
    </div>
  );
}
