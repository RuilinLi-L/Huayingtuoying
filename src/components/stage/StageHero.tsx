import { ArrowsIn, ArrowsOut } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import type { OrchestraSceneDefinition } from '../../types/demo';
import { stageSilhouettes } from './stageArtwork';

interface StageHeroProps {
  currentScene: OrchestraSceneDefinition;
  selectedIds: string[];
  highlightIds: string[];
  pulseIds: string[];
}

export function StageHero({ currentScene, selectedIds, highlightIds, pulseIds }: StageHeroProps) {
  const maskPrefix = useId().replace(/:/g, '');
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
        <svg className="stage-mobile__character-layers" viewBox="0 0 393 345" aria-hidden="true">
          <defs>
            {/* The transparent character export matches the hero exactly at (13, 80).
                Intersect it with the per-person masks to leave the scenery untouched. */}
            <mask id={`${maskPrefix}-art-alpha`} maskUnits="userSpaceOnUse" x="0" y="0" width="393" height="345" style={{ maskType: 'alpha' }}>
              <image href="/assets/ui/stage/orchestra-characters.png" x="13" y="80" width="365" height="205" />
            </mask>
            {stageSilhouettes.map((silhouette, index) => (
              <mask id={`${maskPrefix}-${silhouette.id}`} key={silhouette.id} maskUnits="userSpaceOnUse" x="0" y="0" width="393" height="345" style={{ maskType: 'luminance' }}>
                <path d={silhouette.path} fill="white" />
                {stageSilhouettes.slice(index + 1).map((front) => <path d={front.path} fill="black" key={front.id} />)}
              </mask>
            ))}
          </defs>
          <g mask={`url(#${maskPrefix}-art-alpha)`}>
          {stageSilhouettes.map(({ id, path }) => (
            <g key={id} mask={`url(#${maskPrefix}-${id})`} data-stage-character={id} data-active={selectedIds.includes(id)}>
              <image href="/assets/ui/stage/orchestra-hero.png" width="393" height="345"
                className={`stage-mobile__character-dim${selectedIds.includes(id) ? '' : ' is-muted'}`} />
              {highlightIds.includes(id) && selectedIds.includes(id) ? <path d={path} className="stage-mobile__character-focus" /> : null}
              {pulseIds.includes(id) && selectedIds.includes(id) ? <path d={path} className="stage-mobile__character-pulse" /> : null}
            </g>
          ))}
          </g>
        </svg>
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
