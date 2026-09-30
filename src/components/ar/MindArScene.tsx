import { useEffect, useRef, useState } from 'react';
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

/** A disposable browsing context owns the camera, TF workers and A-Frame WebGL.
 * Removing it also cancels late permission/model requests from an old session.
 * This is necessary for MindAR 1.1.x, whose stop() doesn't dispose its workers.
 */
export function MindArScene(props: MindArSceneProps) {
  const { entry, scene, onStatusChange, onError, onDebug } = props;
  const latest = useRef(props);
  latest.current = props;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const config = JSON.stringify({ modelUrl: entry.modelUrl, scene,
    cards: entry.knowledgeCards.map(card => ({ id: card.id })) });

  useEffect(() => {
    if (error) return;
    const fail = (message: string) => {
      setError(message);
      latest.current.onError(message);
      latest.current.onStatusChange('error');
    };
    const timeout = window.setTimeout(() => fail('识图页面加载超时，请检查网络后重试。'), 40000);
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow ||
          event.data?.channel !== 'orchestra-ar') return;
      const { type, value } = event.data;
      if (type === 'status' && ['loading', 'scanning', 'found', 'lost'].includes(value)) {
        if (value !== 'loading') window.clearTimeout(timeout);
        latest.current.onStatusChange(value);
      }
      if (type === 'debug' && typeof value === 'string') latest.current.onDebug(value);
      if (type === 'error' && typeof value === 'string') {
        window.clearTimeout(timeout);
        fail(value);
      }
      if (type === 'card') {
        const card = latest.current.entry.knowledgeCards.find(item => item.id === value);
        if (card) latest.current.onSelectCard(card);
      }
    };
    window.addEventListener('message', receive);
    return () => { window.clearTimeout(timeout); window.removeEventListener('message', receive); };
  }, [attempt, error, config]);

  const retry = () => {
    setError(''); onError(''); onStatusChange('loading');
    onDebug('重新启动识图场景'); setAttempt(value => value + 1);
  };
  if (!scene.target) return <div className="fallback-box">当前场景缺少识别图。</div>;
  if (error) return <div className="fallback-box" role="alert">
    <p>{error}</p><button type="button" className="button" onClick={retry}>重新启动相机</button>
  </div>;
  return <iframe key={`${attempt}:${config}`} ref={frameRef} className="ar-runtime-frame"
    title={`${entry.title} 摄像头识图场景`} src="/ar/scene.html" allow="camera; fullscreen"
    onLoad={() => {
      onStatusChange('loading');
      frameRef.current?.contentWindow?.postMessage({ channel: 'orchestra-ar', type: 'start', config: JSON.parse(config) }, window.location.origin);
    }} />;
}
