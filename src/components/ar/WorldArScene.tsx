import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const labels: Record<string, string> = {
  'loading-engine': '正在准备空间追踪引擎与人物…',
  ready: '准备完成，点击画面中的按钮开启相机',
  permission: '请允许相机与运动访问',
  searching: '缓慢移动手机，让镜头看清有纹理的桌面或地面',
  'surface-ready': '位置已稳定，可以点击放置',
  placed: '人物已放置 · 移动手机观察不同角度',
  'tracking-lost': '暂时无法定位，请保持光线充足并缓慢移动手机',
  'searching-slow':
    '还未找到稳定平面。请对准光线充足、有纹理的桌面并缓慢移动，也可切换普通 3D 预览。',
};
export function WorldArScene({ modelUrl }: { modelUrl: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0),
    [status, setStatus] = useState('loading-engine'),
    [error, setError] = useState('');
  const [scale, setScale] = useState(0.2),
    [rotation, setRotation] = useState(0);
  const [progress, setProgress] = useState({
    engine: 'loading',
    model: 'downloading',
    received: 0,
    total: 0,
  });
  const command = (type: string, value?: unknown) =>
    frame.current?.contentWindow?.postMessage(
      { channel: 'orchestra-world-ar', type, value },
      location.origin,
    );
  useLayoutEffect(() => {
    const owner = frame.current?.contentWindow;
    return () => {
      owner?.dispatchEvent(new Event('orchestra-stop'));
    };
  }, [attempt, error]);
  useEffect(() => {
    if (error) return;
    const timer = window.setTimeout(() => setError('实景资源加载超时，请重试。'), 50000);
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== frame.current?.contentWindow ||
        event.data?.channel !== 'orchestra-world-ar'
      )
        return;
      if (event.data.type === 'status' && typeof event.data.value === 'string') {
        setStatus(event.data.value);
        if (event.data.value !== 'loading-engine') window.clearTimeout(timer);
      }
      if (event.data.type === 'error') {
        setError(String(event.data.value));
        window.clearTimeout(timer);
      }
      if (event.data.type === 'progress') setProgress(event.data.value);
    };
    window.addEventListener('message', receive);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('message', receive);
    };
  }, [attempt, error]);
  return (
    <div className="world-ar">
      <p className="ar-status" role="status">
        {error || labels[status] || '正在准备实景体验…'}
      </p>
      {!error && status === 'loading-engine' && (
        <p className="ar-progress">
          空间引擎：{progress.engine === 'ready' ? '就绪' : '加载中'} · 人物：
          {progress.model === 'ready'
            ? '就绪'
            : progress.model === 'parsing'
              ? '正在解析'
              : progress.total
                ? `${Math.min(100, Math.round((progress.received / progress.total) * 100))}%`
                : '下载中'}
        </p>
      )}
      {error ? (
        <button
          className="button"
          onClick={() => {
            setError('');
            setStatus('loading-engine');
            setScale(0.2);
            setRotation(0);
            setProgress({engine:'loading',model:'downloading',received:0,total:0});
            setAttempt((a) => a + 1);
          }}
        >
          重新启动实景 AR
        </button>
      ) : (
        <>
          <iframe
            key={attempt}
            ref={frame}
            src="/ar/world.html"
            title="双簧管空间 AR"
            className="world-ar__frame"
            allow="camera; accelerometer; gyroscope; fullscreen"
            onLoad={() => command('configure', { modelUrl })}
          />
          <div className="mobile-action-row">
            <button
              className="button"
              disabled={status !== 'surface-ready'}
              onClick={() => command('place')}
            >
              放置人物
            </button>
            <button
              className="button--ghost"
              disabled={!['placed','tracking-lost','searching-slow'].includes(status)}
              onClick={() => command('reset')}
            >
              {status==='searching-slow'?'重新寻找平面':'重新放置'}
            </button>
          </div>
          <div className="ar-adjustments">
            <label>
              人物大小
              <input
                disabled={status === 'loading-engine'}
                aria-label="人物大小"
                type="range"
                min="0.08"
                max="0.6"
                step="0.01"
                value={scale}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setScale(value);
                  command('scale', value);
                }}
              />
            </label>
            <label>
              人物方向
              <input
                disabled={status === 'loading-engine'}
                aria-label="人物方向"
                type="range"
                min="0"
                max="360"
                step="5"
                value={rotation}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setRotation(value);
                  command('rotate', value);
                }}
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}
