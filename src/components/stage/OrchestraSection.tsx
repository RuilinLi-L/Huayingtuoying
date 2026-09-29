import type { MusicianProfile, MusicianSection } from '../../types/demo';

interface OrchestraSectionProps {
  section: MusicianSection;
  musicians: MusicianProfile[];
  selectedIds: string[];
  highlightIds: string[];
  focusedMusicianId: string | null;
  onSelectMusician: (musicianId: string) => void;
}

// The IDs describe the left-to-right positions in the existing artwork. Names,
// descriptions and lineup state still come from the shared musician catalog.
const artworkBySection: Record<MusicianSection, { image: string; title: string; ids: string[]; width: number; height: number }> = {
  strings: {
    image: '/assets/ui/stage/section-strings.png',
    title: 'STRING MUSIC',
    ids: ['violin', 'viola', 'cello', 'bass'],
    width: 393,
    height: 204,
  },
  woodwind: {
    image: '/assets/ui/stage/section-woodwinds.png',
    title: 'WOODWINDS',
    ids: ['clarinet', 'bassoon', 'flute', 'oboe'],
    width: 379,
    height: 206,
  },
  brass: {
    image: '/assets/ui/stage/section-brass.png',
    title: 'BRASS SECTION',
    ids: ['trumpet', 'horn', 'tuba', 'trombone'],
    width: 393,
    height: 205,
  },
};

export function OrchestraSection({
  section,
  musicians,
  selectedIds,
  highlightIds,
  focusedMusicianId,
  onSelectMusician,
}: OrchestraSectionProps) {
  const artwork = artworkBySection[section];
  const sectionMusicians = artwork.ids
    .map((id) => musicians.find((musician) => musician.id === id))
    .filter((musician): musician is MusicianProfile => Boolean(musician));
  const hasSpecificHighlight = highlightIds.length > 0 && highlightIds.length < musicians.length;

  return (
    <section className={`stage-mobile__section stage-mobile__section--${section}`} aria-label={artwork.title}>
      <h2 className="stage-mobile__sr-only">{artwork.title}</h2>
      <img src={artwork.image} alt="" width={artwork.width} height={artwork.height} loading="lazy" />
      <div className="stage-mobile__musicians">
        {sectionMusicians.map((musician) => {
          const isFocused = focusedMusicianId === musician.id;
          const isInLineup = selectedIds.includes(musician.id);
          const isDimmed = hasSpecificHighlight && !highlightIds.includes(musician.id) && !isFocused;

          return (
            <button
              className={[
                'stage-mobile__musician',
                isFocused ? 'stage-mobile__musician--focused' : '',
                isInLineup ? 'stage-mobile__musician--in-lineup' : 'stage-mobile__musician--out-of-lineup',
                isDimmed ? 'stage-mobile__musician--dimmed' : '',
              ].filter(Boolean).join(' ')}
              type="button"
              key={musician.id}
              onClick={() => onSelectMusician(musician.id)}
              aria-label={`${musician.instrument}，${isInLineup ? '已加入演奏' : '未加入演奏'}，点击查看详情`}
              aria-pressed={isFocused}
            />
          );
        })}
      </div>
    </section>
  );
}
