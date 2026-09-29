import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { InstrumentCard } from '../../components/knowledge/InstrumentCard';
import { InstrumentPreviewPlayer } from '../../components/knowledge/InstrumentPreviewPlayer';
import { InstrumentSectionTabs } from '../../components/knowledge/InstrumentSectionTabs';
import { useKnowledgeAudio } from '../../components/knowledge/KnowledgeAudio';
import { KnowledgeModeTabs } from '../../components/knowledge/KnowledgeModeTabs';
import { instrumentEncyclopedia, instrumentSections } from '../../data/instrumentEncyclopedia';
import type { MusicianSection } from '../../types/demo';

const sectionHeadings: Record<MusicianSection, string> = {
  woodwind: 'Woodwinds',
  brass: 'Brass section',
  strings: 'String music',
};

const sceneSpotlights: Record<MusicianSection, string> = {
  woodwind: 'flute',
  brass: 'trumpet',
  strings: 'cello',
};

function resolveSection(value: string | null): MusicianSection {
  return value === 'brass' || value === 'strings' ? value : 'woodwind';
}

export function InstrumentLibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const section = resolveSection(searchParams.get('section'));
  const previousSection = useRef(section);
  const [transition, setTransition] = useState({ section, direction: 'none' });
  if (transition.section !== section) {
    const index = (value: MusicianSection) => instrumentSections.findIndex((item) => item.id === value);
    setTransition({ section, direction: index(section) < index(transition.section) ? 'backward' : 'forward' });
  }
  const { instrumentId, stop } = useKnowledgeAudio();
  const sectionDefinition = instrumentSections.find((item) => item.id === section)!;
  const instruments = instrumentEncyclopedia.filter((instrument) => instrument.section === section);
  const featuredInstrument = instruments.find((instrument) => instrument.id === instrumentId)
    ?? instruments.find((instrument) => instrument.id === sceneSpotlights[section])
    ?? instruments[0];

  useEffect(() => {
    if (previousSection.current !== section) {
      stop();
      previousSection.current = section;
    }
  }, [section, stop]);

  const changeSection = (nextSection: MusicianSection) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('section', nextSection);
      return next;
    });
  };

  return (
    <div className="knowledge-page instrument-library-page" data-section-motion={transition.direction}>
      <header className="instrument-library-page__intro">
        <div className="instrument-library-page__topline">
          <p className="knowledge-eyebrow">INSTRUMENT LIBRARY <span>·</span> {sectionDefinition.label}</p>
          <KnowledgeModeTabs />
        </div>
        <h1 key={section}>{sectionHeadings[section]}</h1>
        <p>{sectionDefinition.description}</p>
      </header>
      <InstrumentSectionTabs section={section} onChange={changeSection} />
      <div className="instrument-library-page__body" key={section}>
        <div className="instrument-timeline" aria-label={`${sectionDefinition.label}乐器`}>
          {instruments.map((instrument) => (
            <InstrumentCard key={instrument.id} instrument={instrument} section={section} />
          ))}
        </div>
        <section className="instrument-scene" aria-label={`${sectionDefinition.label}试听`}>
          <div className="instrument-scene__art" aria-hidden="true">
            <img src={`/assets/ui/instruments/optimized/${section}-scene.webp`} alt="" loading="lazy" />
          </div>
          <InstrumentPreviewPlayer instrument={featuredInstrument} />
        </section>
      </div>
    </div>
  );
}
