import { tutorials } from '../data/tutorials';

export function getAllTutorialModules() {
  return tutorials;
}

export function getTutorialModule(moduleId?: string) {
  if (!moduleId) {
    return undefined;
  }

  return tutorials.find((module) => module.id === moduleId);
}

export function buildTutorialPath(moduleId: string, chapterId?: string) {
  return chapterId ? `/learn/${moduleId}#${chapterId}` : `/learn/${moduleId}`;
}

export function getTutorialSpotlightForEntry(entryId: string) {
  for (const module of tutorials) {
    const spotlight = module.entrySpotlights.find(
      (item) => item.entryId === entryId,
    );

    if (spotlight) {
      return {
        module,
        spotlight,
      };
    }
  }

  return null;
}
