import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import type { EntryManifest } from '../../types/manifest';
import { resolveWebArConfig } from '../../lib/webar';
import { getDeviceCapabilities } from '../../lib/device';
import { useProgressiveAudio } from '../../lib/audio/useProgressiveAudio';

const WorldArScene = lazy(() =>
  import('../ar/WorldArScene').then((m) => ({ default: m.WorldArScene })),
);
const MindArScene = lazy(() =>
  import('../ar/MindArScene').then((m) => ({ default: m.MindArScene })),
);
const ModelViewer = lazy(() =>
  import('../InstrumentModelViewer').then((m) => ({ default: m.InstrumentModelViewer })),
);
export function StageArPanel({
  entry,
  mode,
  onClose,
  onPauseStage,
}: {
  entry: EntryManifest;
  mode: 'ar' | 'image-test';
  onClose: () => void;
  onPauseStage: () => void;
}) {
  const [view, setView] = useState<'ready' | 'camera' | 'model' | 'suspended'>(
    mode === 'ar' ? 'camera' : 'ready',
  );
  const [status, setStatus] = useState(''),
    [error, setError] = useState('');
  const [capabilities] = useState(getDeviceCapabilities),
    audio = useProgressiveAudio();
  const stopAudio = audio.stop;
  useEffect(() => {
    onPauseStage();
    return stopAudio;
  }, [onPauseStage, stopAudio]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) {
        setView('suspended');
        stopAudio();
      }
    };
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, [stopAudio]);
  const onStatus = useCallback((value: string) => setStatus(value), []),
    onError = useCallback((value: string) => setError(value), []);
  const ignore = useCallback(() => {}, []);
  const cardScene = resolveWebArConfig(entry).scenes.find((s) => s.trackingMode === 'image-target');
  const labels: Record<string, string> = {
    loading: '正在准备识别与人物…',
    scanning: '请对准完整识别图',
    found: '已识别 · 移动手机观察人物',
    lost: '识别图离开画面，请重新对准',
    error: '识别未完成，请重试',
  };
  return (
    <section className="stage-ar-panel" aria-label={mode === 'ar' ? '实景 AR' : '识别卡测试'}>
      <div className="stage-ar-panel__heading">
        <div>
          <p className="knowledge-eyebrow">
            {mode === 'ar' ? 'IN YOUR SPACE' : 'IMAGE TRACKING · TEST'}
          </p>
          <h1>{mode === 'ar' ? '让演奏家来到身边' : '识别卡测试'}</h1>
        </div>
        <button className="button--ghost" onClick={onClose}>
          关闭体验
        </button>
      </div>
      <p>
        {entry.title} ·{' '}
        {mode === 'ar'
          ? '对准桌面或地面，放置后可从不同角度观察。'
          : '对准指定图片，人物将跟随卡片。'}
      </p>
      {!capabilities.canUseAr && (
        <p className="ar-status">
          当前环境无法使用相机，请使用 HTTPS 和手机 Safari 或 Chrome。仍可查看普通 3D 预览。
        </p>
      )}
      {capabilities.isEmbeddedBrowser && (
        <p className="ar-status">
          请在浏览器菜单中选择“在 {capabilities.isIPhone ? 'Safari' : 'Chrome'} 中打开”。
        </p>
      )}
      {view === 'suspended' && (
        <div className="ar-status">
          <p>已暂停并释放相机。返回后需重新确认放置位置。</p>
          <button className="button" onClick={() => setView(mode === 'ar' ? 'camera' : 'ready')}>
            继续体验
          </button>
        </div>
      )}
      <Suspense
        fallback={
          <p className="ar-status" role="status">
            正在准备体验…
          </p>
        }
      >
        {view === 'camera' &&
          capabilities.canUseAr &&
          (mode === 'ar' ? (
            <WorldArScene modelUrl={entry.modelUrl} />
          ) : cardScene ? (
            <>
              <p className="ar-status" role="status">
                {labels[status] || '正在准备…'}
              </p>
              <MindArScene
                entry={entry}
                scene={cardScene}
                onStatusChange={onStatus}
                onError={onError}
                onDebug={ignore}
                onSelectCard={ignore}
              />
            </>
          ) : (
            <p>该条目暂未配置识别卡。</p>
          ))}
        {view === 'model' && (
          <ModelViewer
            modelUrl={entry.modelUrl}
            title={entry.title}
            accentColor={entry.themeColor ?? '#65806b'}
          />
        )}
      </Suspense>
      {mode === 'image-test' && view === 'ready' && (
        <div className="ar-card-help">
          <img src={entry.targetImage} alt="识别测试卡" />
          <p>将测试卡平放在桌面，或显示在另一块屏幕上，保持光线均匀。</p>
        </div>
      )}
      {error && view !== 'camera' && <p role="alert">{error}</p>}
      <div className="mobile-action-row">
        {view !== 'camera' && capabilities.canUseAr && (
          <button
            className="button"
            onClick={() => {
              setError('');
              setView('camera');
            }}
          >
            {mode === 'ar' ? '打开实景 AR' : '开始扫描'}
          </button>
        )}
        {view === 'camera' && (
          <button className="button--ghost" onClick={() => setView('ready')}>
            关闭相机
          </button>
        )}
        {view !== 'model' && (
          <button className="button--ghost" onClick={() => setView('model')}>
            普通 3D 预览
          </button>
        )}
        {mode === 'image-test' && (
          <a className="button--ghost" href={entry.targetImage} download="AR测试卡.png">
            下载测试卡
          </a>
        )}
      </div>
      <div className="ar-listening">
        <h2>听见{entry.id === 'oboe-player' ? '双簧管' : entry.title}</h2>
        {entry.audioStems.map((stem) => (
          <button
            className="button--ghost"
            key={stem.id}
            aria-pressed={audio.url === stem.file && audio.status === 'playing'}
            onClick={() => audio.toggle(stem.file)}
          >
            {audio.url === stem.file && audio.status === 'loading'
              ? '正在缓冲…'
              : audio.url === stem.file && audio.status === 'playing'
                ? '暂停'
                : '试听'}{' '}
            · {stem.name}
          </button>
        ))}
        {audio.status === 'error' && <p role="alert">音频加载失败，请重新点击试听。</p>}
      </div>
      {entry.knowledgeCards.map((card) => (
        <details className="ar-knowledge" key={card.id}>
          <summary>{card.title}</summary>
          <p>{card.summary}</p>
          {card.media?.map((media) =>
            media.type === 'image' ? (
              <img key={media.src} src={media.src} alt={media.alt ?? ''} loading="lazy" />
            ) : media.type === 'audio' ? (
              <audio key={media.src} src={media.src} controls preload="none" />
            ) : (
              <a key={media.src} href={media.src}>
                {media.label}
              </a>
            ),
          )}
        </details>
      ))}
      {mode === 'ar' && (
        <p className="ar-attribution">
          8th Wall XR Engine · © 2026 Niantic Spatial, Inc. All rights reserved. 按{' '}
          <a href="/vendor/8thwall-1.0.0/LICENSE" target="_blank" rel="noreferrer">
            XR Engine License Agreement
          </a>{' '}
          使用；引擎按原样提供，无担保，详见许可说明。
        </p>
      )}
    </section>
  );
}
