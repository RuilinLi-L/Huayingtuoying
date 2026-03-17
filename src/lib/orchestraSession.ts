import {
  comboRules,
  musicians,
  orchestraModes,
  orchestraScenes,
  tracks,
} from '../data/orchestraDemo';
import type {
  ComboRule,
  MusicianProfile,
  OrchestraModeDefinition,
  OrchestraModeId,
  OrchestraSceneId,
  TrackDefinition,
} from '../types/demo';

function uniqueSortedIds(musicianIds: string[]) {
  return [...new Set(musicianIds)].sort();
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
  return musicians.find((musician) => musician.id === musicianId);
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
    return getOrchestraModeById('standby');
  }

  const matchingRule = [...comboRules]
    .sort((left, right) => right.priority - left.priority)
    .find((rule) => matchesRule(rule, currentIds));

  if (!matchingRule) {
    return getOrchestraModeById('creative-mix');
  }

  return getOrchestraModeById(matchingRule.modeId);
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
  const names = uniqueSortedIds(musicianIds)
    .map((id) => getMusicianById(id)?.instrument)
    .filter((name): name is string => Boolean(name));

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
