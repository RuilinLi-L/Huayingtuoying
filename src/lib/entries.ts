import { stagePath } from './navigation';
import { entries } from '../data/entries';
import { buildLaunchSearch, buildLaunchStateSearch, type LaunchOptions } from './launch';
import type { EntryManifest } from '../types/manifest';

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
  options?: LaunchOptions,
): string {
  const search = buildLaunchStateSearch(options);
  return stagePath(entryId === 'oboe-player' ? 'ar' : 'image-test', entryId, search);
}

export function buildDeepLink(
  entryId: string,
  origin = window.location.origin,
  options?: LaunchOptions,
): string {
  const url = new URL(origin);
  const search = buildLaunchSearch(entryId, options);

  url.search = search;
  return url.toString();
}
