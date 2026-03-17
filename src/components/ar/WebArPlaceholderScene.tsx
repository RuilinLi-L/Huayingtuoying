import { useEffect } from 'react';
import type { EntryManifest } from '../../types/manifest';
import type { ResolvedWebArScene } from '../../lib/webar';

interface WebArPlaceholderSceneProps {
  entry: EntryManifest;
  scene: ResolvedWebArScene;
  onStatusChange: (status: string) => void;
  onError: (message: string) => void;
  onDebug: (message: string) => void;
}

function getPlaceholderMessage(entry: EntryManifest, scene: ResolvedWebArScene) {
  if (scene.provider === 'mindar' && scene.trackingMode === 'surface-placement') {
    return `${entry.title} 当前被配置为平面放置模式，但现有 MindAR 运行时只覆盖识图追踪。请将该场景切到 8th Wall 等支持 SLAM 的 WebAR 引擎。`;
  }

  if (scene.provider === '8thwall') {
    return `${entry.title} 已切到 ${scene.provider} provider，但项目里还没有接入该引擎运行时。请按文档在 WebAR provider 层补齐 SDK 加载与场景挂载。`;
  }

  return `${entry.title} 的 WebAR 场景配置尚未完成，请检查 provider 和 trackingMode。`;
}

export function WebArPlaceholderScene({
  entry,
  scene,
  onStatusChange,
  onError,
  onDebug,
}: WebArPlaceholderSceneProps) {
  useEffect(() => {
    const message = getPlaceholderMessage(entry, scene);

    onStatusChange('error');
    onError(message);
    onDebug(message);
  }, [entry, onDebug, onError, onStatusChange, scene]);

  return (
    <div className="fallback-box">
      <p>{getPlaceholderMessage(entry, scene)}</p>
    </div>
  );
}
