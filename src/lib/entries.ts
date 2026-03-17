import { entries } from '../data/entries';
import { buildLaunchSearch, buildLaunchStateSearch } from './launch';
import type { EntryLaunchSource, EntryManifest } from '../types/manifest';

export function getAllEntries(): EntryManifest[] {
  return entries;
}

export function getEntryById(entryId?: string): EntryManifest | undefined {
  if (!entryId) {
    return undefined;
  }

  return entries.find((entry) => entry.id === entryId);
}

export function buildEntryPath(entryId: string): string {
  return `/entry/${entryId}`;
}

export function buildExperiencePath(
  entryId: string,
  options?: {
    source?: EntryLaunchSource;
    autostart?: boolean;
  },
): string {
  const search = buildLaunchStateSearch(options);
  return `/experience/${entryId}${search}`;
}

export function buildDeepLink(
  entryId: string,
  origin = window.location.origin,
  options?: {
    source?: EntryLaunchSource;
    autostart?: boolean;
  },
): string {
  const url = new URL(origin);
  const search = buildLaunchSearch(entryId, options);

  url.search = search;
  return url.toString();
}
