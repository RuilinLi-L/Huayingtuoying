import { useMemo } from 'react';
import { resolveWebArScene } from '../../lib/webar';
import type { EntryLaunchSource, EntryManifest, KnowledgeCard } from '../../types/manifest';
import { MindArScene } from './MindArScene';
import { WebArPlaceholderScene } from './WebArPlaceholderScene';

interface WebArSceneProps {
  entry: EntryManifest;
  source: EntryLaunchSource;
  onSelectCard: (card: KnowledgeCard) => void;
  onStatusChange: (status: string) => void;
  onError: (message: string) => void;
  onDebug: (message: string) => void;
}

export function WebArScene({
  entry,
  source,
  onSelectCard,
  onStatusChange,
  onError,
  onDebug,
}: WebArSceneProps) {
  const scene = useMemo(() => resolveWebArScene(entry, source), [entry, source]);

  if (scene.provider === 'mindar' && scene.trackingMode === 'image-target') {
    return (
      <MindArScene
        entry={entry}
        scene={scene}
        onDebug={onDebug}
        onError={onError}
        onSelectCard={onSelectCard}
        onStatusChange={onStatusChange}
      />
    );
  }

  return (
    <WebArPlaceholderScene
      entry={entry}
      scene={scene}
      onDebug={onDebug}
      onError={onError}
      onStatusChange={onStatusChange}
    />
  );
}
