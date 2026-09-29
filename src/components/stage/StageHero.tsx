import { ArrowsIn, ArrowsOut } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { OrchestraSceneDefinition } from '../../types/demo';

interface StageHeroProps {
  currentScene: OrchestraSceneDefinition;
}

export function StageHero({ currentScene }: StageHeroProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const sceneStyle = {
    '--scene-base': currentScene.palette.base,
    '--scene-glow': currentScene.palette.glow,
    '--scene-haze': currentScene.palette.haze,
  } as CSSProperties;

  useEffect(() => {
    setCanFullscreen(typeof frameRef.current?.requestFullscreen === 'function');
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    if (!frameRef.current?.requestFullscreen) return;
    try {
      if (document.fullscreenElement === frameRef.current) {
        await document.exitFullscreen();
      } else {
        await frameRef.current.requestFullscreen();
      }
    } catch {
      // Some mobile browsers expose the API but decline a particular request.
    }
  }

  return (
    <div className="stage-mobile__hero" ref={frameRef} style={sceneStyle}>
      <div className="stage-mobile__hero-scene">
        <img
          className="stage-mobile__hero-art"
          src="/assets/ui/stage/orchestra-hero.png"
          alt="十二位乐手在音乐厅舞台上演奏"
          width="393"
          height="345"
          fetchPriority="high"
        />
        <span className="stage-mobile__scene-label" aria-live="polite">当前舞台 · {currentScene.shortLabel}</span>
        {canFullscreen ? (
          <button
            className="stage-mobile__fullscreen"
            type="button"
            onClick={() => void toggleFullscreen()}
            aria-label={isFullscreen ? '退出全屏舞台' : '全屏查看舞台'}
          >
            {isFullscreen ? <ArrowsIn size={22} weight="bold" aria-hidden="true" /> : <ArrowsOut size={22} weight="bold" aria-hidden="true" />}
          </button>
        ) : (
          <span className="stage-mobile__fullscreen-cover" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
