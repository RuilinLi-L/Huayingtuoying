import { Camera } from '@phosphor-icons/react';
import type { OrchestraSceneDefinition } from '../../types/demo';

interface StageActionsProps {
  onOpenAr:()=>void;
  onOpenImageTest:()=>void;
  selectedCount: number;
  currentScene: OrchestraSceneDefinition;
  sceneOptions: OrchestraSceneDefinition[];
  onSceneChange: (sceneId: OrchestraSceneDefinition['id']) => void;
}

export function StageActions({
  onOpenAr, onOpenImageTest,
  selectedCount,
  currentScene,
  sceneOptions,
  onSceneChange,
}: StageActionsProps) {
  return (
    <details className="stage-mobile__actions">
      <summary>
        <span>更多舞台体验</span>
        <small>{selectedCount} 位乐手 · {currentScene.shortLabel}</small>
      </summary>
      <div className="stage-mobile__actions-body">
        <div className="stage-mobile__scene-choices" role="group" aria-label="选择舞台场景">
          {sceneOptions.map((scene) => (
            <button
              className={scene.id === currentScene.id ? 'stage-mobile__scene is-active' : 'stage-mobile__scene'}
              key={scene.id}
              type="button"
              onClick={() => onSceneChange(scene.id)}
              aria-pressed={scene.id === currentScene.id}
            >
              {scene.shortLabel}
            </button>
          ))}
        </div>
        <button type="button" className="stage-mobile__camera-action" onClick={onOpenAr}>
          <Camera size={18} aria-hidden="true" /><span>实景 AR · 放置演奏家</span>
        </button>
        <button type="button" className="button--ghost" onClick={onOpenImageTest}>识别卡测试</button>
      </div>
    </details>
  );
}
