import { normalizeMusicianIds } from '../data/sleepingBeauty';
import { getEntryById } from './entries';

/** Resolve printed QR links into local, current UI routes, including older exhibit links. */
export function resolveScanDestination(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim(), window.location.origin);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return null;

  const entryMatch = url.pathname.match(/^\/(?:entry|experience)\/([^/]+)\/?$/);
  const entryId = entryMatch?.[1] ?? url.searchParams.get('entry');
  const params = new URLSearchParams({ source: 'qr' });

  if (entryId) {
    const entry = getEntryById(entryId);
    if (!entry) return null;
    const ids = normalizeMusicianIds(entry.audioStems.map((stem) => stem.id));
    params.set('lineup', ids.join(','));
    if (ids.length === 1) params.set('highlight', ids[0]);
  } else if (['/', '/home', '/stage', '/demo/base'].includes(url.pathname)) {
    if (url.searchParams.has('lineup')) {
      const ids = normalizeMusicianIds((url.searchParams.get('lineup') ?? '').split(','));
      if (!ids.length) return null;
      params.set('lineup', ids.join(','));
    } else if (url.pathname !== '/stage' && url.pathname !== '/demo/base') {
      return null;
    }
    const scene = url.searchParams.get('scene');
    if (scene) params.set('scene', scene);
    const highlight = normalizeMusicianIds((url.searchParams.get('highlight') ?? '').split(','));
    if (highlight.length) params.set('highlight', highlight.join(','));
  } else {
    return null;
  }

  // The user can open AR from the stage. Decoding a QR must first release its camera.
  return `/stage?${params.toString()}`;
}
