import type { MusicComposeStatus } from '../../lib/musicCompose';

export const STYLE_PRESETS = [
  {
    id: 'campus-chamber',
    label: '校园室内乐',
    value: 'warm chamber ensemble, classical crossover, piano and strings',
  },
  {
    id: 'orchestra-sketch',
    label: '管弦草图',
    value: 'cinematic orchestral sketch, woodwinds, strings, gentle percussion',
  },
  {
    id: 'music-education',
    label: '美育课堂',
    value: 'clear educational arrangement, simple motif development, elegant harmony',
  },
] as const;

export const MODEL_OPTIONS = [
  { label: 'V4.5 All', value: 'V4_5ALL' },
  { label: 'V4.5', value: 'V4_5' },
  { label: 'V4', value: 'V4' },
] as const;

export const STATUS_LABELS: Record<MusicComposeStatus, string> = {
  queued: '排队中',
  processing: '生成中',
  first: '已有初稿',
  complete: '生成完成',
  failed: '生成失败',
};
