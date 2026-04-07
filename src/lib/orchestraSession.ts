import {
  comboRules,
  musicians,
  orchestraModes,
  orchestraScenes,
  tracks,
} from '../data/orchestraDemo';
import {
  normalizeMusicianId,
  normalizeMusicianIds,
} from '../data/sleepingBeauty';
import type {
  ComboRule,
  MusicianProfile,
  OrchestraModeDefinition,
  OrchestraModeId,
  OrchestraSceneId,
  TrackDefinition,
} from '../types/demo';

function uniqueSortedIds(musicianIds: string[]) {
  return normalizeMusicianIds(musicianIds);
}

function getInstrumentNames(musicianIds: string[]) {
  return uniqueSortedIds(musicianIds)
    .map((id) => getMusicianById(id)?.instrument)
    .filter((name): name is string => Boolean(name));
}

function getSectionCounts(musicianIds: string[]) {
  return uniqueSortedIds(musicianIds).reduce<Record<MusicianProfile['section'], number>>(
    (counts, musicianId) => {
      const section = getMusicianById(musicianId)?.section;

      if (section) {
        counts[section] += 1;
      }

      return counts;
    },
    {
      woodwind: 0,
      brass: 0,
      strings: 0,
    },
  );
}

function getDominantSectionLabel(musicianIds: string[]) {
  const sectionCounts = getSectionCounts(musicianIds);
  const entries = Object.entries(sectionCounts) as Array<
    [MusicianProfile['section'], number]
  >;
  const activeSections = entries.filter(([, count]) => count > 0);

  if (activeSections.length !== 1) {
    return null;
  }

  switch (activeSections[0][0]) {
    case 'strings':
      return '弦乐';
    case 'woodwind':
      return '木管';
    case 'brass':
      return '铜管';
    default:
      return null;
  }
}

function describeSectionMix(musicianIds: string[]) {
  const sectionCounts = getSectionCounts(musicianIds);
  const parts = [
    sectionCounts.strings ? `${sectionCounts.strings} 弦` : '',
    sectionCounts.woodwind ? `${sectionCounts.woodwind} 木管` : '',
    sectionCounts.brass ? `${sectionCounts.brass} 铜管` : '',
  ].filter(Boolean);

  return parts.join(' + ');
}

function createDynamicModePresentation(
  baseMode: OrchestraModeDefinition,
  musicianIds: string[],
): OrchestraModeDefinition {
  const instrumentNames = getInstrumentNames(musicianIds);
  const dominantSectionLabel = getDominantSectionLabel(musicianIds);
  const lineupSummary = instrumentNames.join('、');

  switch (baseMode.id) {
    case 'standby':
      return {
        ...baseMode,
        name: '等待放置乐器',
        title: '等待放置乐器',
        description: '请先放置至少 1 位演奏家，系统会自动识别当前编制并切换到对应玩法。',
      };
    case 'solo-focus': {
      const instrumentName = instrumentNames[0] ?? '单乐器';

      return {
        ...baseMode,
        name: `${instrumentName}独奏`,
        title: `${instrumentName}独奏`,
        description: `${instrumentName}作为当前唯一声部，舞台会聚焦该乐器，并突出单轨聆听与数字名片讲解。`,
      };
    }
    case 'creative-mix': {
      const count = instrumentNames.length;
      let name = '自由组合';
      let title = '自由组合';
      let description = `当前组合为 ${lineupSummary}，适合观察不同乐器之间的音色层次与配器变化。`;

      if (count === 2) {
        name = dominantSectionLabel ? `${dominantSectionLabel}二重奏` : '双人重奏';
        title = name;
        description =
          dominantSectionLabel && lineupSummary
            ? `${lineupSummary}组成当前${name}，适合对比两件乐器之间的音色呼应与线条关系。`
            : `${lineupSummary}组成当前双人重奏，适合对比两件乐器之间的音色呼应与线条关系。`;
      } else if (count === 3) {
        name = dominantSectionLabel ? `${dominantSectionLabel}三重奏` : '三重奏';
        title = name;
        description =
          dominantSectionLabel && lineupSummary
            ? `${lineupSummary}组成当前${name}，可以更清晰地听到主线、内声与支撑声部之间的配合。`
            : `${lineupSummary}组成当前三重奏，可以更清晰地听到主线、内声与支撑声部之间的配合。`;
      } else if (count >= 4) {
        name = dominantSectionLabel ? `${dominantSectionLabel}重奏` : '多人混编';
        title = name;
        const sectionMix = describeSectionMix(musicianIds);
        description = dominantSectionLabel
          ? `${lineupSummary}组成当前${name}，适合整体观察同一家族乐器的层次推进。`
          : `当前为 ${sectionMix} 的混编组合，由${lineupSummary}共同构成，适合观察不同声部之间的配器变化。`;
      }

      return {
        ...baseMode,
        name,
        title,
        description,
      };
    }
    case 'string-quartet':
      return {
        ...baseMode,
        name: '弦乐四重奏',
        title: '弦乐四重奏',
        description:
          '小提琴、中提琴、大提琴与低音提琴（Bass）已全部到位，当前组合构成标准弦乐四重奏。',
      };
    case 'wind-quintet':
      return {
        ...baseMode,
        name: '木管五重奏',
        title: '木管五重奏',
        description:
          '长笛、单簧管、双簧管、巴松与圆号已全部到位，当前组合构成标准木管五重奏。',
      };
    case 'full-orchestra':
      return {
        ...baseMode,
        name: '《睡美人圆舞曲》全编制合奏',
        title: '《睡美人圆舞曲》全编制合奏',
        description:
          '12 位演奏家全部就位，当前进入《睡美人圆舞曲》全编制合奏状态，可完整体验各声部同步联动。',
      };
    default:
      return baseMode;
  }
}

function hasAllIds(currentIds: string[], requiredIds: string[]) {
  return requiredIds.every((id) => currentIds.includes(id));
}

function matchesRule(rule: ComboRule, musicianIds: string[]) {
  const currentIds = uniqueSortedIds(musicianIds);

  if (typeof rule.exactCount === 'number' && currentIds.length !== rule.exactCount) {
    return false;
  }

  if (typeof rule.minCount === 'number' && currentIds.length < rule.minCount) {
    return false;
  }

  if (rule.requiredIds?.length && !hasAllIds(currentIds, rule.requiredIds)) {
    return false;
  }

  return true;
}

export function getMusicianById(musicianId: string) {
  const normalizedMusicianId = normalizeMusicianId(musicianId) ?? musicianId;

  return musicians.find((musician) => musician.id === normalizedMusicianId);
}

export function getStageMusicians() {
  return musicians;
}

export function getOrchestraScenes() {
  return orchestraScenes;
}

export function getSceneById(sceneId: OrchestraSceneId) {
  return orchestraScenes.find((scene) => scene.id === sceneId) ?? orchestraScenes[0];
}

export function getOrchestraModeById(modeId: OrchestraModeId) {
  return orchestraModes.find((mode) => mode.id === modeId) ?? orchestraModes[0];
}

export function resolveOrchestraMode(musicianIds: string[]): OrchestraModeDefinition {
  const currentIds = uniqueSortedIds(musicianIds);

  if (!currentIds.length) {
    return createDynamicModePresentation(getOrchestraModeById('standby'), currentIds);
  }

  const matchingRule = [...comboRules]
    .sort((left, right) => right.priority - left.priority)
    .find((rule) => matchesRule(rule, currentIds));

  if (!matchingRule) {
    return createDynamicModePresentation(getOrchestraModeById('creative-mix'), currentIds);
  }

  return createDynamicModePresentation(getOrchestraModeById(matchingRule.modeId), currentIds);
}

export function resolveHighlightIds(
  musicianIds: string[],
  mode: OrchestraModeDefinition,
): string[] {
  const currentIds = uniqueSortedIds(musicianIds);

  if (mode.id === 'solo-focus') {
    return currentIds.slice(0, 1);
  }

  if (mode.id === 'creative-mix') {
    return currentIds;
  }

  if (mode.highlightIds.length) {
    return mode.highlightIds;
  }

  return currentIds;
}

export function getTracksForMode(modeId: OrchestraModeId): TrackDefinition[] {
  const mode = getOrchestraModeById(modeId);

  return mode.trackIds
    .map((trackId) => tracks.find((track) => track.id === trackId))
    .filter((track): track is TrackDefinition => Boolean(track));
}

export function getTrackById(trackId: string) {
  return tracks.find((track) => track.id === trackId);
}

export function getDefaultTrackForMode(modeId: OrchestraModeId) {
  return getTracksForMode(modeId)[0] ?? null;
}

export function getUnlockedTracks(musicianIds: string[]) {
  return getTracksForMode(resolveOrchestraMode(musicianIds).id);
}

export function describeLineup(musicianIds: string[]) {
  const names = getInstrumentNames(musicianIds);

  if (!names.length) {
    return '尚未识别任何演奏家';
  }

  return names.join('、');
}

export function getSelectedMusicians(musicianIds: string[]): MusicianProfile[] {
  return uniqueSortedIds(musicianIds)
    .map((id) => getMusicianById(id))
    .filter((musician): musician is MusicianProfile => Boolean(musician));
}

export function getRecommendedSceneIds(modeId: OrchestraModeId): OrchestraSceneId[] {
  switch (modeId) {
    case 'solo-focus':
      return ['rehearsal-hall', 'qintai'];
    case 'string-quartet':
      return ['rehearsal-hall', 'youth-garden'];
    case 'wind-quintet':
      return ['rehearsal-hall', 'qintai'];
    case 'full-orchestra':
      return ['qintai', 'stadium'];
    case 'creative-mix':
      return ['youth-garden', 'stadium'];
    default:
      return ['qintai'];
  }
}
