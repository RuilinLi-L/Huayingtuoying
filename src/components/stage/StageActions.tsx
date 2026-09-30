import { Camera } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import type { OrchestraSceneDefinition } from '../../types/demo';

interface StageActionsProps {
  selectedCount: number;
  currentScene: OrchestraSceneDefinition;
  sceneOptions: OrchestraSceneDefinition[];
  onSceneChange: (sceneId: OrchestraSceneDefinition['id']) => void;
}

export function StageActions({
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
        <Link className="stage-mobile__camera-action" to="/experience/oboe-player">
          <Camera size={18} aria-hidden="true" /><span>扫描体验 · 双簧管 AR</span>
        </Link>
      </div>
    </details>
  );
}
