import type { CSSProperties } from 'react';
import { instrumentSections } from '../../data/instrumentEncyclopedia';
import type { MusicianSection } from '../../types/demo';
import { useKnowledgeAudio } from './KnowledgeAudio';

interface InstrumentSectionTabsProps {
  section: MusicianSection;
  onChange: (section: MusicianSection) => void;
}

export function InstrumentSectionTabs({ section, onChange }: InstrumentSectionTabsProps) {
  const { stop } = useKnowledgeAudio();

  return (
    <div className="instrument-section-tabs" role="group" aria-label="乐器声部"
      style={{ '--section-index': instrumentSections.findIndex((item) => item.id === section) } as CSSProperties}>
      {instrumentSections.map((item) => (
        <button
          key={item.id}
          className={item.id === section ? 'instrument-section-tabs__tab is-active' : 'instrument-section-tabs__tab'}
          type="button"
          aria-pressed={item.id === section}
          onClick={() => {
            if (item.id === section) return;
            stop();
            onChange(item.id);
          }}
        >{item.label}</button>
      ))}
    </div>
  );
}
