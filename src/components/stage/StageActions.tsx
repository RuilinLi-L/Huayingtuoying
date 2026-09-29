import { Camera, CameraSlash } from '@phosphor-icons/react';
import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import type { OrchestraSceneDefinition } from '../../types/demo';

interface StageActionsProps {
  selectedCount: number;
  currentScene: OrchestraSceneDefinition;
  sceneOptions: OrchestraSceneDefinition[];
  cameraReady: boolean;
  cameraError: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  onSceneChange: (sceneId: OrchestraSceneDefinition['id']) => void;
  onOpenStage: () => void;
  onCloseStage: () => void;
}

export function StageActions({
  selectedCount,
  currentScene,
  sceneOptions,
  cameraReady,
  cameraError,
  videoRef,
  onSceneChange,
  onOpenStage,
  onCloseStage,
}: StageActionsProps) {
  return (
    <details className="stage-mobile__actions" open={cameraReady || Boolean(cameraError) || undefined}>
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
        <button className="stage-mobile__camera-action" type="button" onClick={cameraReady ? onCloseStage : onOpenStage}>
          {cameraReady ? <CameraSlash size={18} aria-hidden="true" /> : <Camera size={18} aria-hidden="true" />}
          <span>{cameraReady ? '关闭相机舞台' : '开启相机舞台'}</span>
        </button>
        <Link className="stage-mobile__ar-link" to="/experience/violin-dialogue">
          探索 AR 体验
        </Link>
        <video
          className={cameraReady ? 'stage-mobile__camera-video is-active' : 'stage-mobile__camera-video'}
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="相机舞台实时画面"
        />
      </div>
    </details>
  );
}
