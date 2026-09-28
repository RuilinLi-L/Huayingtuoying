import { sleepingBeautyStemCatalog } from './sleepingBeauty';
import type { AudioStem } from '../types/manifest';

export type SymphonyFilter = 'all' | 'strings' | 'woodwind' | 'brass';

export interface SymphonyPreview {
  id: string;
  composer: string;
  composerLatin: string;
  title: string;
  description: string;
  section: Exclude<SymphonyFilter, 'all'>;
  stem: AudioStem;
}

export const symphonyFilters = [
  { id: 'all', label: '全部' },
  { id: 'strings', label: '弦乐声部' },
  { id: 'woodwind', label: '木管声部' },
  { id: 'brass', label: '铜管声部' },
] as const;

const featuredStemIds = ['violin', 'flute', 'cello', 'horn', 'clarinet', 'trumpet'] as const;
const descriptions: Record<(typeof featuredStemIds)[number], string> = {
  violin: '轻盈的旋律线条，从弦乐开始聆听',
  flute: '清澈明亮，捕捉舞步上方的空气感',
  cello: '温柔深沉，让旋律有更丰厚的底色',
  horn: '圆润宽广，连接木管与铜管的色彩',
  clarinet: '柔和灵活，在声部之间自由穿梭',
  trumpet: '明亮有力，为乐曲添上一束光',
};

export const symphonyPreviews: SymphonyPreview[] = featuredStemIds.map((id) => {
  const stem = sleepingBeautyStemCatalog.find((item) => item.id === id);
  if (!stem) throw new Error(`Missing orchestra stem: ${id}`);

  return {
    id,
    composer: '柴可夫斯基',
    composerLatin: 'Tchaikovsky',
    title: `《睡美人圆舞曲》· ${stem.name}`,
    description: descriptions[id],
    section: stem.section,
    stem: {
      id: stem.id,
      name: stem.name,
      file: stem.file,
      group: stem.group,
      defaultEnabled: true,
      stereoPan: stem.stereoPan,
      gain: stem.gain,
    },
  };
});
