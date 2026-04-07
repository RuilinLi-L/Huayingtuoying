import { baseAnchorId } from '../data/orchestraDemo';
import { normalizeMusicianIds } from '../data/sleepingBeauty';
import type { NfcSessionAdapter, NfcSessionSnapshot, NfcSnapshotSource } from '../types/demo';

interface MockNfcSessionAdapter extends NfcSessionAdapter {
  pushSnapshot: (placedMusicianIds: string[], source?: NfcSnapshotSource) => void;
}

function createSnapshot(
  placedMusicianIds: string[],
  source: NfcSnapshotSource,
): NfcSessionSnapshot {
  const normalizedIds = normalizeMusicianIds(placedMusicianIds);

  return {
    baseAnchorId,
    placedMusicianIds: normalizedIds,
    detectedCount: normalizedIds.length,
    source,
    updatedAt: new Date().toISOString(),
  };
}

export function createMockNfcSessionAdapter(
  initialIds: string[] = [],
): MockNfcSessionAdapter {
  let snapshot = createSnapshot(initialIds, 'mock');
  const listeners = new Set<(nextSnapshot: NfcSessionSnapshot) => void>();

  const notify = () => {
    listeners.forEach((listener) => listener(snapshot));
  };

  return {
    mode: 'mock',
    isAvailable: true,
    async connect() {
      notify();
    },
    disconnect() {
      listeners.clear();
    },
    async getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot);

      return () => {
        listeners.delete(listener);
      };
    },
    pushSnapshot(placedMusicianIds, source = 'mock') {
      snapshot = createSnapshot(placedMusicianIds, source);
      notify();
    },
  };
}

export function createReservedNfcSessionAdapter(): NfcSessionAdapter {
  const isAvailable = typeof window !== 'undefined' && 'NDEFReader' in window;
  const snapshot = createSnapshot([], 'hardware');

  return {
    mode: 'reserved',
    isAvailable,
    async connect() {
      return;
    },
    disconnect() {
      return;
    },
    async getSnapshot() {
      return snapshot;
    },
    subscribe() {
      return () => {
        return;
      };
    },
  };
}

export function buildNfcPreviewPayload(placedMusicianIds: string[]) {
  const normalizedIds = normalizeMusicianIds(placedMusicianIds);

  return {
    baseAnchorId,
    musicianIds: normalizedIds,
    count: normalizedIds.length,
    anchorAction: 'launch-webar-session',
    timestamp: new Date().toISOString(),
  };
}
