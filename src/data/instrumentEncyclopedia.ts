import type { MusicianSection } from '../types/demo';
import { musicians } from './orchestraDemo';
import {
  sleepingBeautyStemCatalog,
  type SleepingBeautyStemId,
} from './sleepingBeauty';

export interface InstrumentSectionDefinition {
  id: MusicianSection;
  label: string;
  description: string;
}

export interface InstrumentEncyclopediaEntry {
  id: SleepingBeautyStemId;
  name: string;
  englishName: string;
  shortLabel: string;
  section: MusicianSection;
  sectionLabel: string;
  summary: string;
  timbre: string;
  orchestraRole: string;
  listeningGuide: string;
  structure: string[];
  featuredWorks: string[];
  audioSrc: string;
  modelUrl: string;
  color: string;
}

export const instrumentSections: InstrumentSectionDefinition[] = [
  {
    id: 'woodwind',
    label: '木管',
    description: '以气息、哨片和管身共鸣塑造线条，是乐队里最容易听见色彩变化的一组。',
  },
  {
    id: 'brass',
    label: '铜管',
    description: '依靠唇振和金属管体放大能量，常负责号召、高潮和厚重支撑。',
  },
  {
    id: 'strings',
    label: '弦乐',
    description: '用弓、弦和共鸣箱连接旋律与和声，是古典乐队最稳定的叙事骨架。',
  },
];

const sectionLabelMap: Record<MusicianSection, string> = {
  woodwind: '木管',
  brass: '铜管',
  strings: '弦乐',
};

const instrumentOrder: SleepingBeautyStemId[] = [
  'flute',
  'clarinet',
  'oboe',
  'bassoon',
  'horn',
  'trumpet',
  'trombone',
  'tuba',
  'violin',
  'viola',
  'cello',
  'bass',
];

const instrumentCopy: Record<
  SleepingBeautyStemId,
  {
    englishName: string;
    summary: string;
    timbre: string;
    orchestraRole: string;
    listeningGuide: string;
    structure: string[];
    featuredWorks?: string[];
  }
> = {
  flute: {
    englishName: 'Flute',
    summary: '长笛是木管组里最明亮、最轻盈的高音乐器之一，声音常像一束被吹亮的线条。',
    timbre: '没有哨片，靠气流切过吹孔发声，音色清澈、通透，高音区尤其有光泽。',
    orchestraRole: '常承担快速装饰、轻巧旋律和明亮色彩，也能在安静段落里制造漂浮感。',
    listeningGuide: '听《睡美人圆舞曲》长笛分轨时，可以先抓住它怎样把舞步上方的空气感点亮。',
    structure: ['吹孔', '按键系统', '金属管身', '高音区色彩'],
  },
  clarinet: {
    englishName: 'Clarinet',
    summary: '单簧管音域宽、性格变化大，可以从柔软低语走到明亮歌唱。',
    timbre: '单簧哨片让声音带有温润的颗粒感，低音区厚，中音区圆，高音区更亮。',
    orchestraRole: '常在木管与弦乐之间做连接，既能唱旋律，也能补足中声部的和声厚度。',
    listeningGuide: '听单簧管分轨时，注意它怎样把旋律边缘变得更圆滑，而不是只负责“更响”。',
    structure: ['单簧哨片', '吹嘴', '按键孔', '钟形口'],
  },
  oboe: {
    englishName: 'Oboe',
    summary: '双簧管声音集中、辨识度高，像一条带着鼻音光泽的细线。',
    timbre: '双簧哨片直接振动，音色带有穿透力和轻微紧张感，特别适合引出旋律轮廓。',
    orchestraRole: '常负责清楚的木管主题，也常被乐队用作调音参照。',
    listeningGuide: '听双簧管分轨时，留意它怎样在合奏里把一句旋律的边界标出来。',
    structure: ['双簧哨片', '细长管身', '按键系统', '集中音色'],
  },
  bassoon: {
    englishName: 'Bassoon',
    summary: '巴松管/大管，是木管乐器家族里的“大块头”，属于双簧管族。',
    timbre:
      '通过吹奏双簧片震动发声；低音区阴沉、庄严，中音区柔和饱满，高音区充满戏剧感、略带忧伤。快速断奏时，能发出“咔嗒”声。',
    orchestraRole:
      '因为音色表情夸张又灵活，巴松常被塑造成幽默丑角的形象，是乐队里的“小丑”和搞笑担当。',
    listeningGuide: '档案：出生地意大利，fagotto 意为“一捆柴”；身高 2.5 米以上，重约 3 公斤。',
    structure: ['双簧片', '低音区', '中音区', '高音区', '快速断奏'],
    featuredWorks: [
      '莫扎特《降B大调巴松协奏曲 K.191》',
      '韦伯《F大调巴松协奏曲 Op.75》',
      '维瓦尔第《e小调巴松协奏曲 RV 484》',
    ],
  },
  horn: {
    englishName: 'French Horn',
    summary: '圆号介于柔和与英雄感之间，能把木管的温度和铜管的开阔连接起来。',
    timbre: '盘绕管身和喇叭口带来圆润、远处传来的声感，强奏时会变得宽阔有力。',
    orchestraRole: '常承担和声桥梁、空间铺垫和庄重主题，是铜管中最适合“融进去”的声音。',
    listeningGuide: '听圆号分轨时，注意它不是一直站在前排，而是在给整体空间增加厚度。',
    structure: ['号嘴', '盘绕管身', '转阀', '喇叭口'],
  },
  trumpet: {
    englishName: 'Trumpet',
    summary: '小号明亮、直接、具有号召力，是乐队里最容易带来庆典感的铜管乐器。',
    timbre: '金属管体和小号嘴让声音集中而锋利，强奏时穿透力很强。',
    orchestraRole: '常负责主题强调、节庆号角和高潮推进，让音乐的前景瞬间变亮。',
    listeningGuide: '听小号分轨时，留意它何时把一段音乐从背景推到舞台正前方。',
    structure: ['号嘴', '活塞键', '调音管', '喇叭口'],
  },
  trombone: {
    englishName: 'Trombone',
    summary: '长号声音厚重、线条宽，滑管动作让它在铜管组里很有视觉和听觉辨识度。',
    timbre: '滑管改变管长，音色既能庄严饱满，也能做出带滑动感的特殊表情。',
    orchestraRole: '常强化和声支撑、低中频推进和宏大场面，是铜管厚度的重要来源。',
    listeningGuide: '听长号分轨时，可以感受它怎样让乐队的底部更有重量。',
    structure: ['号嘴', '滑管', '外管', '喇叭口'],
  },
  tuba: {
    englishName: 'Tuba',
    summary: '大号是铜管组的最低音支柱，负责让庞大的乐队有稳固地基。',
    timbre: '管身巨大，声音低沉、宽厚、带有金属共鸣，强奏时能推动整组低频。',
    orchestraRole: '常与低音弦乐一起稳住根音，让和声重心真正落下来。',
    listeningGuide: '听大号分轨时，不必找复杂旋律，先感受它怎样让音乐“站住”。',
    structure: ['大号嘴', '阀键', '宽管身', '大喇叭口'],
  },
  violin: {
    englishName: 'Violin',
    summary: '小提琴是弦乐组最高音的核心声部，最常承担清晰主旋律和快速线条。',
    timbre: '弓毛摩擦琴弦，声音明亮、灵活，既能歌唱也能快速跳动。',
    orchestraRole: '常作为旋律前景出现，也能通过齐奏形成整片弦乐光泽。',
    listeningGuide: '听小提琴分轨时，先跟住它的旋律起伏，再回头听其他声部怎样支撑它。',
    structure: ['琴弦', '琴弓', '琴桥', '共鸣箱'],
  },
  viola: {
    englishName: 'Viola',
    summary: '中提琴比小提琴更厚、更暗，常在旋律和低音之间承担温暖的内声部。',
    timbre: '琴体略大，音色更柔和、带一点阴影，特别适合填充和声中层。',
    orchestraRole: '常把上方旋律和下方低音粘合起来，是不抢眼但不可缺少的连接层。',
    listeningGuide: '听中提琴分轨时，注意它怎样让弦乐组不只剩下高音和低音。',
    structure: ['较大琴体', '中音琴弦', '琴弓', '内声部音色'],
  },
  cello: {
    englishName: 'Cello',
    summary: '大提琴音色接近人声，既能承担深情旋律，也能稳住中低音支撑。',
    timbre: '坐姿演奏，琴体共鸣大，声音温厚、歌唱性强，低音有稳定重量。',
    orchestraRole: '常连接旋律与低音地基，可以在前景唱歌，也可以在背景托住和声。',
    listeningGuide: '听大提琴分轨时，感受它怎样把情绪落点放得更深。',
    structure: ['琴弦', '尾针', '琴桥', '大型共鸣箱'],
  },
  bass: {
    englishName: 'Double Bass',
    summary: '低音提琴是弦乐组最低音声部，负责维持节拍、根音和乐队重心。',
    timbre: '琴体最大，声音低、厚、带木质颗粒，常让音乐有向下扎根的感觉。',
    orchestraRole: '常与大号、巴松等低音乐器共同搭建地基，是合奏秩序的重要支点。',
    listeningGuide: '听低音提琴分轨时，先感受每一次低音进入如何改变整体重量。',
    structure: ['大型琴体', '低音琴弦', '琴弓或拨弦', '根音支撑'],
  },
};

const musicianMap = new Map(musicians.map((musician) => [musician.id, musician]));
const stemMap = new Map(sleepingBeautyStemCatalog.map((stem) => [stem.id, stem]));

function buildInstrumentEntry(id: SleepingBeautyStemId): InstrumentEncyclopediaEntry {
  const stem = stemMap.get(id);
  const musician = musicianMap.get(id);
  const copy = instrumentCopy[id];

  if (!stem || !musician) {
    throw new Error(`Missing instrument encyclopedia source: ${id}`);
  }

  return {
    id,
    name: stem.name,
    englishName: copy.englishName,
    shortLabel: musician.shortLabel,
    section: stem.section,
    sectionLabel: sectionLabelMap[stem.section],
    summary: copy.summary,
    timbre: copy.timbre,
    orchestraRole: copy.orchestraRole,
    listeningGuide: copy.listeningGuide,
    structure: copy.structure,
    featuredWorks: copy.featuredWorks ?? musician.featuredWorks,
    audioSrc: stem.file,
    modelUrl: `/assets/models/${id}/scene.optimized.glb`,
    color: musician.color,
  };
}

export const instrumentEncyclopedia = instrumentOrder.map(buildInstrumentEntry);

export function getInstrumentsBySection(section: MusicianSection | 'all') {
  if (section === 'all') {
    return instrumentEncyclopedia;
  }

  return instrumentEncyclopedia.filter((instrument) => instrument.section === section);
}
