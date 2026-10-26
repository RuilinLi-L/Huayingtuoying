import type { CSSProperties } from 'react';
import type { SleepingBeautyStemId } from '../../data/sleepingBeauty';

export interface StageSprite {
  id: SleepingBeautyStemId;
  src: string;
  /** Coordinates on a 393 × 277 stage; list order is back to front. */
  x: number;
  y: number;
  width: number;
  height: number;
}

// Original 1079 × 1553 PNGs from 12人.zip, kept byte-for-byte. Bounds describe
// the full figure, including its instrument, so transparent margins do not
// change its apparent size or standing position. Portraits crop only in CSS.
const sourceSize = { width: 1079, height: 1553 };
interface OriginalMusician {
  id: SleepingBeautyStemId;
  bounds: [left: number, top: number, right: number, bottom: number];
  centerX: number;
  top: number;
  height: number;
  portrait: [left: number, top: number, width: number];
}
const originals: OriginalMusician[] = [
  { id: 'horn', bounds: [62, 58, 790, 1474], centerX: 139, top: 87, height: 108, portrait: [135, 35, 650] },
  { id: 'trumpet', bounds: [119, 139, 870, 1496], centerX: 255, top: 85, height: 110, portrait: [180, 115, 680] },
  { id: 'tuba', bounds: [176, 134, 1033, 1429], centerX: 311, top: 104, height: 115, portrait: [170, 110, 720] },
  { id: 'trombone', bounds: [33, 134, 1072, 1460], centerX: 105, top: 100, height: 118, portrait: [280, 110, 710] },
  { id: 'clarinet', bounds: [72, 96, 815, 1517], centerX: 350, top: 115, height: 117, portrait: [155, 75, 680] },
  { id: 'flute', bounds: [52, 84, 901, 1484], centerX: 60, top: 119, height: 115, portrait: [190, 60, 680] },
  { id: 'bassoon', bounds: [208, 100, 921, 1438], centerX: 166, top: 127, height: 116, portrait: [210, 75, 680] },
  { id: 'oboe', bounds: [188, 141, 837, 1437], centerX: 233, top: 128, height: 116, portrait: [190, 115, 670] },
  { id: 'viola', bounds: [168, 75, 983, 1502], centerX: 130, top: 148, height: 116, portrait: [195, 50, 680] },
  { id: 'bass', bounds: [211, 133, 878, 1443], centerX: 76, top: 160, height: 113, portrait: [205, 110, 690] },
  { id: 'violin', bounds: [280, 104, 1043, 1476], centerX: 270, top: 149, height: 121, portrait: [260, 80, 710] },
  { id: 'cello', bounds: [154, 142, 949, 1488], centerX: 323, top: 160, height: 114, portrait: [195, 115, 720] },
];

export const stageSprites: StageSprite[] = originals.map(({ id, bounds, centerX, top, height }) => {
  const [left, sourceTop, right, bottom] = bounds;
  const scale = height / (bottom - sourceTop);
  return {
    id,
    src: `/assets/ui/stage-v2/originals/${id}.png`,
    x: centerX - (right + left) / 2 * scale,
    y: top - sourceTop * scale,
    width: sourceSize.width * scale,
    height: sourceSize.height * scale,
  };
});

export function musicianArtwork(id: string) {
  return stageSprites.find(sprite => sprite.id === id)?.src;
}

export function musicianPortraitStyle(id: string): CSSProperties {
  const artwork = originals.find(sprite => sprite.id === id);
  if (!artwork) return {};
  const [left, top, width] = artwork.portrait;
  return {
    width: `${sourceSize.width / width * 100}%`,
    left: `${-left / width * 100}%`,
    transform: `translateY(${-top / sourceSize.height * 100}%)`,
  };
}
