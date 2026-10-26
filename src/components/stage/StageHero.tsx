import { ArrowsIn, ArrowsOut } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import type { MusicianProfile, OrchestraSceneDefinition } from '../../types/demo';
import { stageSprites } from './stageArtwork';

interface StageHeroProps {
  currentScene: OrchestraSceneDefinition;
  selectedIds: string[];
  highlightIds: string[];
  pulseIds: string[];
  musicians: MusicianProfile[];
  onToggleMusician: (id: string) => void;
}
interface HitMap { alpha: Uint8Array; width: number; height: number }
// Shared across mounts; contains only image alpha for pointer hit testing.
const alphaMaps = new Map<string, HitMap>();

function cacheAlpha(image: HTMLImageElement, src: string) {
  if (alphaMaps.has(src)) return;
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const alpha = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3];
  alphaMaps.set(src, { alpha, width: canvas.width, height: canvas.height });
}

export function StageHero({ currentScene, selectedIds, highlightIds, pulseIds, musicians, onToggleMusician }: StageHeroProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const sceneStyle = {
    '--scene-base': currentScene.palette.base,
    '--scene-glow': currentScene.palette.glow,
    '--scene-haze': currentScene.palette.haze,
  } as CSSProperties;

  useEffect(() => {
    const changed = () => setIsFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  useEffect(() => {
    if (!fallbackFullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setFallbackFullscreen(false); };
    document.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', escape); };
  }, [fallbackFullscreen]);

  async function toggleFullscreen() {
    if (fallbackFullscreen) { setFallbackFullscreen(false); return; }
    try {
      if (document.fullscreenElement === frameRef.current) await document.exitFullscreen();
      else if (frameRef.current?.requestFullscreen) await frameRef.current.requestFullscreen();
      else setFallbackFullscreen(true);
    } catch { setFallbackFullscreen(true); }
  }

  function hitTest(event: MouseEvent<HTMLDivElement>) {
    if (!sceneRef.current || event.detail === 0) return;
    // Ignore controls above the scene (fullscreen, labels, error notice).
    if ((event.target as Element).closest('.stage-mobile__fullscreen')) return;
    const box = sceneRef.current.getBoundingClientRect();
    const x = (event.clientX - box.left) * 393 / box.width;
    const y = (event.clientY - box.top) * 277 / box.height;
    for (const sprite of [...stageSprites].reverse()) {
      const map = alphaMaps.get(sprite.src);
      if (!map || failedImages.includes(sprite.id)) continue;
      // Images use object-fit:contain; account for letterboxing before lookup.
      const scale = Math.min(sprite.width / map.width, sprite.height / map.height);
      const offsetX = sprite.x + (sprite.width - map.width * scale) / 2;
      const offsetY = sprite.y + sprite.height - map.height * scale;
      const px = Math.floor((x - offsetX) / scale), py = Math.floor((y - offsetY) / scale);
      if (px >= 0 && px < map.width && py >= 0 && py < map.height && map.alpha[py * map.width + px] > 48) {
        onToggleMusician(sprite.id);
        return;
      }
    }
  }

  return (
    <div className={`stage-mobile__hero${fallbackFullscreen ? ' is-expanded' : ''}`} ref={frameRef} style={sceneStyle}>
      <div className="stage-mobile__hero-scene" ref={sceneRef} onClick={hitTest}>
        <img className="stage-mobile__hero-art" src="/assets/ui/stage-v2/background.png" alt="暖色灯光下的音乐厅舞台" width="1493" height="1054" fetchPriority="high" />
        <div className="stage-mobile__characters" role="group" aria-label="舞台乐手">
          {stageSprites.map(sprite => {
            const active = selectedIds.includes(sprite.id);
            const name = musicians.find(item => item.id === sprite.id)?.instrument ?? sprite.id;
            return (
              <button type="button" key={sprite.id} data-stage-character={sprite.id} data-active={active}
                aria-pressed={active} aria-label={`舞台上的${name}，${active ? '点击移出演奏' : '点击加入演奏'}`}
                className={`stage-mobile__character${active ? ' is-selected' : ''}${pulseIds.includes(sprite.id) ? ' is-pulsing' : ''}${highlightIds.includes(sprite.id) ? ' is-focused' : ''}`}
                style={{ left: `${sprite.x / 393 * 100}%`, top: `${sprite.y / 277 * 100}%`, width: `${sprite.width / 393 * 100}%`, height: `${sprite.height / 277 * 100}%` }}
                onClick={event => { if (event.detail === 0) { event.stopPropagation(); onToggleMusician(sprite.id); } }}>
                <img src={sprite.src} alt="" draggable={false} onLoad={event => cacheAlpha(event.currentTarget, sprite.src)}
                  onError={() => setFailedImages(ids => ids.includes(sprite.id) ? ids : [...ids, sprite.id])} />
              </button>
            );
          })}
        </div>
        <span className="stage-mobile__scene-label">当前舞台 · {currentScene.shortLabel}</span>
        <button className="stage-mobile__fullscreen" type="button" onClick={() => void toggleFullscreen()}
          aria-label={isFullscreen || fallbackFullscreen ? '退出全屏舞台' : '全屏查看舞台'}>
          {isFullscreen || fallbackFullscreen ? <ArrowsIn size={22} weight="bold" /> : <ArrowsOut size={22} weight="bold" />}
        </button>
        {failedImages.length > 0 && <span className="stage-mobile__art-error" role="status">部分人物图片未加载，可使用下方卡片选择乐手</span>}
      </div>
    </div>
  );
}
