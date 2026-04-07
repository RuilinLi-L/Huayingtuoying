import {
  createSleepingBeautyAudioStem,
  sleepingBeautyStemCatalog,
} from './sleepingBeauty';
import type { EntryManifest } from '../types/manifest';

const ensembleEntryStems = sleepingBeautyStemCatalog.map((stem) =>
  createSleepingBeautyAudioStem(stem.id),
);

export const entries: EntryManifest[] = [
  {
    id: 'violin-dialogue',
    title: '弦光小提琴',
    subtitle: '以《睡美人圆舞曲》单轨聆听小提琴主线',
    description:
      '入口聚焦《睡美人圆舞曲》中的小提琴分轨，保留单乐器讲解体验，适合作为 NFC/扫码链路的独立乐器示例。',
    orchestraZone: '弦乐组',
    themeColor: '#8b5cf6',
    sceneType: 'mindar-image',
    targetImage: '/assets/markers/default-card.png',
    trackingTargetSrc: '/assets/markers/default-card.mind',
    posterImage: '/assets/posters/violin.svg',
    modelUrl: '/assets/models/softmind/scene.gltf',
    fallbackMode: 'poster',
    audioStems: [
      createSleepingBeautyAudioStem('violin', {
        stereoPan: 0,
        gain: 1,
      }),
    ],
    knowledgeCards: [
      {
        id: 'violin-timbre',
        anchor: '小提琴音色',
        title: '为什么小提琴常承担主旋律',
        summary:
          '小提琴音区明亮、穿透力强，适合把主题旋律清晰地送到听众耳边，常位于舞台前排。',
        media: [
          {
            type: 'image',
            src: '/assets/posters/violin.svg',
            alt: '小提琴主题海报',
          },
        ],
      },
      {
        id: 'violin-bowing',
        anchor: '运弓技巧',
        title: '运弓如何改变音乐性格',
        summary:
          '本页仅保留《睡美人圆舞曲》中的小提琴单轨，更适合把注意力集中在连弓、顿弓和线条推进的差异上。',
      },
      {
        id: 'violin-campus',
        anchor: '校园叙事',
        title: '把演奏体验放回校园地标',
        summary:
          '后续正式内容可把青年园或音乐厅作为背景层，与演奏知识卡片一起构成校园美育 IP。',
      },
    ],
  },
  {
    id: 'flute-color',
    title: '风影长笛',
    subtitle: '以《睡美人圆舞曲》单轨聆听长笛音色',
    description:
      '示例聚焦《睡美人圆舞曲》中的长笛分轨，保留木管单乐器入口，突出呼吸感、句法和高音区色彩。',
    orchestraZone: '木管组',
    themeColor: '#0ea5e9',
    sceneType: 'mindar-image',
    targetImage: '/assets/markers/default-card.png',
    trackingTargetSrc: '/assets/markers/default-card.mind',
    posterImage: '/assets/posters/flute.svg',
    modelUrl: '/assets/models/softmind/scene.gltf',
    fallbackMode: 'poster',
    audioStems: [
      createSleepingBeautyAudioStem('flute', {
        stereoPan: 0,
        gain: 1,
      }),
    ],
    knowledgeCards: [
      {
        id: 'flute-breath',
        anchor: '呼吸控制',
        title: '长笛的呼吸感来自哪里',
        summary:
          '木管乐器的气息组织会直接影响线条流动感。适合在 AR 里结合乐手热点解释呼吸、句法和停顿。',
      },
      {
        id: 'flute-register',
        anchor: '高音区',
        title: '高音区为什么更容易被注意到',
        summary:
          '当前页面只保留《睡美人圆舞曲》长笛单轨，能更直观地理解高音区的通透感和“色彩性主角”的概念。',
      },
      {
        id: 'flute-campus',
        anchor: '展陈路径',
        title: '适合放在展厅和文创店的互动点',
        summary:
          '长笛条目适合配合扫码海报与实体底座，作为“木管入门”互动点，降低首次体验门槛。',
      },
    ],
  },
  {
    id: 'ensemble-stage',
    title: '华音合奏舞台',
    subtitle: '《睡美人圆舞曲》12 轨合奏与自由静音',
    description:
      '舞台条目接入《睡美人圆舞曲》全部 12 条分轨，支持按乐器静音、独奏与整体聆听，适合作为全编制示例入口。',
    orchestraZone: '全编制合奏',
    themeColor: '#f97316',
    sceneType: 'mindar-image',
    targetImage: '/assets/markers/default-card.png',
    trackingTargetSrc: '/assets/markers/default-card.mind',
    posterImage: '/assets/posters/ensemble.svg',
    modelUrl: '/assets/models/softmind/scene.gltf',
    fallbackMode: 'model',
    audioStems: ensembleEntryStems,
    knowledgeCards: [
      {
        id: 'ensemble-layout',
        anchor: '舞台站位',
        title: '为什么交响乐团要按声部分区站位',
        summary:
          '分区站位让听众更容易辨识声部来源，也方便在 WebAR 中为未来空间音频和乐手热点建立坐标基础。',
      },
      {
        id: 'ensemble-mix',
        anchor: '12 轨聆听',
        title: '通过静音听懂《睡美人圆舞曲》的配器关系',
        summary:
          '当用户关闭某一条声部时，能立刻感知《睡美人圆舞曲》织体的变化，这正是古典音乐美育里最适合做成交互的知识点之一。',
      },
      {
        id: 'ensemble-rollout',
        anchor: '试点场景',
        title: '适合后续试点的校园体验路径',
        summary:
          '当前底座可扩展为展厅、文创店、课堂演示三个入口场景，后续只需替换素材并增加清单项。',
      },
    ],
  },
];
