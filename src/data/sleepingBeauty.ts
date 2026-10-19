import media from './mediaAssets.json';
import type {
  CompositionStemDefinition,
  MusicianSection,
} from '../types/demo';
import type { AudioStem } from '../types/manifest';

export type SleepingBeautyStemId =
  | 'flute'
  | 'clarinet'
  | 'oboe'
  | 'bassoon'
  | 'horn'
  | 'trumpet'
  | 'trombone'
  | 'tuba'
  | 'violin'
  | 'viola'
  | 'cello'
  | 'bass';

export type SleepingBeautyAudioVariant = 'mobile' | 'stage-mobile';

export interface SleepingBeautyStemDefinition {
  id: SleepingBeautyStemId;
  name: string;
  file: string;
  section: MusicianSection;
  group: string;
  defaultEnabled: boolean;
  stereoPan: number;
  gain: number;
}


export const sleepingBeautyStemCatalog: SleepingBeautyStemDefinition[] = [
  {
    id: 'flute',
    name: '长笛',
    file: media.audio.flute.file,
    section: 'woodwind',
    group: 'woodwind',
    defaultEnabled: true,
    stereoPan: -0.42,
    gain: 0.92,
  },
  {
    id: 'clarinet',
    name: '单簧管',
    file: media.audio.clarinet.file,
    section: 'woodwind',
    group: 'woodwind',
    defaultEnabled: true,
    stereoPan: -0.18,
    gain: 0.88,
  },
  {
    id: 'oboe',
    name: '双簧管',
    file: media.audio.oboe.file,
    section: 'woodwind',
    group: 'woodwind',
    defaultEnabled: true,
    stereoPan: -0.06,
    gain: 0.84,
  },
  {
    id: 'bassoon',
    name: '巴松',
    file: media.audio.bassoon.file,
    section: 'woodwind',
    group: 'woodwind',
    defaultEnabled: true,
    stereoPan: 0.12,
    gain: 0.82,
  },
  {
    id: 'horn',
    name: '圆号',
    file: media.audio.horn.file,
    section: 'brass',
    group: 'brass',
    defaultEnabled: true,
    stereoPan: 0.28,
    gain: 0.86,
  },
  {
    id: 'trumpet',
    name: '小号',
    file: media.audio.trumpet.file,
    section: 'brass',
    group: 'brass',
    defaultEnabled: true,
    stereoPan: 0.4,
    gain: 0.8,
  },
  {
    id: 'trombone',
    name: '长号',
    file: media.audio.trombone.file,
    section: 'brass',
    group: 'brass',
    defaultEnabled: true,
    stereoPan: 0.18,
    gain: 0.78,
  },
  {
    id: 'tuba',
    name: '大号',
    file: media.audio.tuba.file,
    section: 'brass',
    group: 'brass',
    defaultEnabled: true,
    stereoPan: 0.04,
    gain: 0.74,
  },
  {
    id: 'violin',
    name: '小提琴',
    file: media.audio.violin.file,
    section: 'strings',
    group: 'strings',
    defaultEnabled: true,
    stereoPan: -0.34,
    gain: 0.96,
  },
  {
    id: 'viola',
    name: '中提琴',
    file: media.audio.viola.file,
    section: 'strings',
    group: 'strings',
    defaultEnabled: true,
    stereoPan: -0.08,
    gain: 0.9,
  },
  {
    id: 'cello',
    name: '大提琴',
    file: media.audio.cello.file,
    section: 'strings',
    group: 'strings',
    defaultEnabled: true,
    stereoPan: 0.14,
    gain: 0.9,
  },
  {
    id: 'bass',
    name: '低音提琴（Bass）',
    file: media.audio.bass.file,
    section: 'strings',
    group: 'strings',
    defaultEnabled: true,
    stereoPan: 0.3,
    gain: 0.84,
  },
];

export function getSleepingBeautyManifest(id: string) {
  return media.audio[id as SleepingBeautyStemId]?.segmentManifest;
}

const sleepingBeautyStemMap = new Map(
  sleepingBeautyStemCatalog.map((stem) => [stem.id, stem]),
);

export function normalizeMusicianId(
  value: string | null | undefined,
): SleepingBeautyStemId | null {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  switch (normalizedValue) {
    case 'double-bass':
    case 'bass':
      return 'bass';
    case 'trumbone':
    case 'trombone':
      return 'trombone';
    default:
      return sleepingBeautyStemMap.has(normalizedValue as SleepingBeautyStemId)
        ? (normalizedValue as SleepingBeautyStemId)
        : null;
  }
}

export function normalizeMusicianIds(values: string[]): SleepingBeautyStemId[] {
  return [
    ...new Set(
      values
        .map((value) => normalizeMusicianId(value))
        .filter((value): value is SleepingBeautyStemId => Boolean(value)),
    ),
  ].sort();
}

export function getSleepingBeautyStem(stemId: string) {
  const normalizedStemId = normalizeMusicianId(stemId);

  if (!normalizedStemId) {
    return null;
  }

  return sleepingBeautyStemMap.get(normalizedStemId) ?? null;
}

export function getSleepingBeautyStemFile(
  stemId: string,
  variant: SleepingBeautyAudioVariant = 'mobile',
): string {
  const stem = getSleepingBeautyStem(stemId);

  if (!stem) {
    throw new Error(`Unknown Sleeping Beauty stem: ${stemId}`);
  }

  void variant;
  return stem.file;
}

export function createSleepingBeautyAudioStem(
  stemId: string,
  overrides: Partial<AudioStem> = {},
): AudioStem {
  const stem = getSleepingBeautyStem(stemId);

  if (!stem) {
    throw new Error(`Unknown Sleeping Beauty stem: ${stemId}`);
  }

  return {
    id: stem.id,
    name: stem.name,
    file: stem.file,
    segmentManifest: getSleepingBeautyManifest(stem.id),
    defaultEnabled: stem.defaultEnabled,
    group: stem.group,
    stereoPan: stem.stereoPan,
    gain: stem.gain,
    ...overrides,
  };
}

export const sleepingBeautyCompositionStems: CompositionStemDefinition[] =
  sleepingBeautyStemCatalog.map((stem) => ({
    id: stem.id,
    musicianId: stem.id,
    name: stem.name,
    file: stem.file,
    stereoPan: stem.stereoPan,
    gain: stem.gain,
  }));
