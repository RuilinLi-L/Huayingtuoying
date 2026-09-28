import { ArrowRight, BookOpenText } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { instrumentEncyclopedia, instrumentSections } from '../data/instrumentEncyclopedia';
import type { MusicianSection } from '../types/demo';

const instrumentImages: Record<string, string> = {
  flute: '/assets/ui/instruments/woodwind/flute.png',
  clarinet: '/assets/ui/instruments/woodwind/clarinet.png',
  oboe: '/assets/ui/instruments/woodwind/oboe.png',
  bassoon: '/assets/ui/instruments/woodwind/bassoon.png',
  horn: '/assets/ui/instruments/brass/horn.jpg',
  trumpet: '/assets/ui/instruments/brass/trumpet.jpg',
  trombone: '/assets/ui/instruments/brass/trombone.jpg',
  tuba: '/assets/ui/instruments/brass/tuba.jpg',
  violin: '/assets/ui/instruments/strings/violin.jpg',
  viola: '/assets/ui/instruments/strings/viola.jpg',
  cello: '/assets/ui/instruments/strings/cello.jpg',
  bass: '/assets/ui/instruments/strings/double-bass.jpg',
};

type Section = MusicianSection | 'all';

export function KnowledgePage() {
  const { instrumentId } = useParams();
  const [searchParams] = useSearchParams();
  const initialSection = searchParams.get('section');
  const [section, setSection] = useState<Section>(
    initialSection === 'strings' || initialSection === 'woodwind' || initialSection === 'brass'
      ? initialSection
      : 'all',
  );
  const selected = instrumentId
    ? instrumentEncyclopedia.find((item) => item.id === instrumentId)
    : null;

  if (instrumentId && !selected) return <Navigate to="/not-found" replace />;

  if (selected) {
    return (
      <article className="mobile-feature-page knowledge-detail">
        <Link className="knowledge-detail__back" to="/knowledge/instruments">← 全部乐器</Link>
        <img src={instrumentImages[selected.id]} alt={selected.name} width="1254" height="1254" />
        <p className="mobile-feature-page__eyebrow">{selected.sectionLabel} · {selected.englishName}</p>
        <h1>{selected.name}</h1>
        <p>{selected.summary}</p>
        <h2>听见它的声音</h2>
        <audio controls src={selected.audioSrc} preload="none" aria-label={`${selected.name}声部试听`} />
        <p>{selected.listeningGuide}</p>
        <Link className="mobile-feature-page__cta" to="/learn/fundamentals#instrument-encyclopedia">查看完整百科 <ArrowRight size={20} /></Link>
      </article>
    );
  }

  const visible = section === 'all'
    ? instrumentEncyclopedia
    : instrumentEncyclopedia.filter((instrument) => instrument.section === section);

  return (
    <div className="mobile-feature-page knowledge-library">
      <div className="mobile-feature-page__heading">
        <p>INSTRUMENT LIBRARY</p>
        <h1>乐器图鉴</h1>
        <span>探索交响乐团的 12 种声音。</span>
      </div>
      <div className="knowledge-library__filters" role="group" aria-label="乐器声部筛选">
        {[{ id: 'all' as const, label: '全部' }, ...instrumentSections].map((item) => (
          <button key={item.id} className={section === item.id ? 'is-active' : ''} type="button" aria-pressed={section === item.id} onClick={() => setSection(item.id)}>{item.label}</button>
        ))}
      </div>
      <div className="knowledge-library__grid">
        {visible.map((instrument) => (
          <Link to={`/knowledge/instruments/${instrument.id}`} key={instrument.id}>
            <img src={instrumentImages[instrument.id]} alt="" width="1254" height="1254" loading="lazy" />
            <strong>{instrument.name}</strong>
            <small>{instrument.englishName}</small>
          </Link>
        ))}
      </div>
      <Link className="knowledge-library__theory" to="/learn/fundamentals"><BookOpenText size={19} /> 乐理知识与完整百科 <ArrowRight size={18} /></Link>
    </div>
  );
}
