import { Info } from '@phosphor-icons/react';
import type { MusicianProfile, MusicianSection } from '../../types/demo';

interface OrchestraSectionProps {
  section: MusicianSection;
  musicians: MusicianProfile[];
  selectedIds: string[];
  pulseIds: string[];
  focusedMusicianId: string | null;
  onSelectMusician: (musicianId: string) => void;
  onToggleMusician: (musicianId: string) => void;
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
  pulseIds,
  focusedMusicianId,
  onSelectMusician,
  onToggleMusician,
}: OrchestraSectionProps) {
  const artwork = artworkBySection[section];
  const sectionMusicians = artwork.ids
    .map((id) => musicians.find((musician) => musician.id === id))
    .filter((musician): musician is MusicianProfile => Boolean(musician));

  return (
    <section className={`stage-mobile__section stage-mobile__section--${section}`} aria-label={artwork.title}>
      <h2 className="stage-mobile__sr-only">{artwork.title}</h2>
      <img src={artwork.image} alt="" width={artwork.width} height={artwork.height} loading="lazy" />
      <div className="stage-mobile__musicians">
        {sectionMusicians.map((musician) => {
          const isFocused = focusedMusicianId === musician.id;
          const isInLineup = selectedIds.includes(musician.id);

          return (
            <div className="stage-mobile__musician-slot" key={musician.id}>
              <button
                className={[
                  'stage-mobile__musician',
                  isFocused ? 'stage-mobile__musician--focused' : '',
                  isInLineup ? 'stage-mobile__musician--in-lineup' : 'stage-mobile__musician--out-of-lineup',
                  pulseIds.includes(musician.id) ? 'stage-mobile__musician--pulse' : '',
                ].filter(Boolean).join(' ')}
                type="button"
                data-musician-id={musician.id}
                onClick={() => onToggleMusician(musician.id)}
                aria-label={`${musician.instrument}，${isInLineup ? '已加入演奏，点击移出' : '未加入演奏，点击加入'}`}
                aria-pressed={isInLineup}
              />
              <button className="stage-mobile__musician-info" type="button" onClick={() => onSelectMusician(musician.id)}
                aria-label={`查看${musician.instrument}详情`} aria-haspopup="dialog"><Info size={18} weight="fill" aria-hidden="true" /></button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
