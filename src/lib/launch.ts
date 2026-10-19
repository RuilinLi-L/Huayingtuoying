import type { EntryLaunchSource } from '../types/manifest';

export interface LaunchContext {
  entryId?: string;
  source: EntryLaunchSource;
  autostart: boolean;
  lineup?: string;
  scene?: string;
  highlight?: string;
}

export interface LaunchOptions {
  source?: EntryLaunchSource;
  autostart?: boolean;
  lineup?: string;
  scene?: string;
  highlight?: string;
}

const launchSources = new Set<EntryLaunchSource>(['manual', 'qr', 'nfc']);

function appendLaunchOptions(
  searchParams: URLSearchParams,
  options: LaunchOptions = {},
) {
  const source = options.source ?? 'manual';
  const autostart = options.autostart ?? source !== 'manual';
  for (const key of ['lineup','scene','highlight'] as const) {
    if (options[key] !== undefined) searchParams.set(key, options[key]);
  }

  if (source !== 'manual') {
    searchParams.set('source', source);
  }

  if (autostart) {
    searchParams.set('autostart', '1');
  }
}

export function normalizeLaunchSource(
  value: string | null | undefined,
): EntryLaunchSource {
  if (!value) {
    return 'manual';
  }

  return launchSources.has(value as EntryLaunchSource)
    ? (value as EntryLaunchSource)
    : 'manual';
}

export function parseLaunchSearchParams(
  searchParams: URLSearchParams,
): LaunchContext {
  const source = normalizeLaunchSource(searchParams.get('source'));
  const autostartParam = searchParams.get('autostart');

  return {
    entryId: searchParams.get('entry') ?? undefined,
    lineup: searchParams.get('lineup') ?? undefined,
    scene: searchParams.get('scene') ?? undefined,
    highlight: searchParams.get('highlight') ?? undefined,
    source,
    autostart:
      autostartParam === '1' ||
      autostartParam === 'true' ||
      (autostartParam === null && source !== 'manual'),
  };
}

export function buildLaunchSearch(
  entryId: string,
  options: LaunchOptions = {},
): string {
  const searchParams = new URLSearchParams();

  searchParams.set('entry', entryId);
  appendLaunchOptions(searchParams, options);

  return `?${searchParams.toString()}`;
}

export function buildLaunchStateSearch(options: LaunchOptions = {}): string {
  const searchParams = new URLSearchParams();

  appendLaunchOptions(searchParams, options);

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}
