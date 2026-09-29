import { CaretRight } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import type { InstrumentEncyclopediaEntry } from '../../data/instrumentEncyclopedia';
import type { MusicianSection } from '../../types/demo';
import { InstrumentPreviewButton } from './InstrumentPreviewPlayer';

export function InstrumentCard({ instrument, section }: { instrument: InstrumentEncyclopediaEntry; section: MusicianSection }) {
  const detailPath = `/knowledge/instruments/${instrument.id}?section=${section}`;

  return (
    <article className="instrument-card">
      <div className="instrument-card__visual">
        <Link to={detailPath} aria-label={`了解${instrument.name}`}>
          <img
            src={`/assets/ui/instruments/optimized/${instrument.id}-thumb.webp`}
            alt=""
            width="320"
            height="320"
            loading="lazy"
          />
        </Link>
        <InstrumentPreviewButton instrument={instrument} />
      </div>
      <Link className="instrument-card__link" to={detailPath}>
        <span className="instrument-card__copy">
          <strong>{instrument.name}</strong>
          <small>{instrument.englishName}</small>
          <span>{instrument.summary}</span>
        </span>
        <span className="instrument-card__arrow" aria-hidden="true"><CaretRight size={22} weight="bold" /></span>
      </Link>
    </article>
  );
}
