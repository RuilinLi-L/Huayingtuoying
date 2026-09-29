import { ArrowLeft, Cube } from '@phosphor-icons/react';
import { lazy, Suspense, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { InstrumentPreviewPlayer } from '../../components/knowledge/InstrumentPreviewPlayer';
import { KnowledgeModeTabs } from '../../components/knowledge/KnowledgeModeTabs';
import { instrumentEncyclopedia } from '../../data/instrumentEncyclopedia';
import type { MusicianSection } from '../../types/demo';

const InstrumentModelViewer = lazy(() =>
  import('../../components/InstrumentModelViewer').then((module) => ({ default: module.InstrumentModelViewer })),
);

const validSections: MusicianSection[] = ['woodwind', 'brass', 'strings'];

export function InstrumentDetailPage() {
  const { instrumentId } = useParams();
  const [searchParams] = useSearchParams();
  const [showModel, setShowModel] = useState(false);
  const instrument = instrumentEncyclopedia.find((item) => item.id === instrumentId);

  if (!instrument) return <Navigate replace to="/not-found" />;

  const requestedSection = searchParams.get('section') as MusicianSection | null;
  const section = requestedSection && validSections.includes(requestedSection)
    ? requestedSection
    : instrument.section;

  return (
    <article className="knowledge-page instrument-detail-page">
      <KnowledgeModeTabs />
      <Link className="instrument-detail-page__back" to={`/knowledge/instruments?section=${section}`}>
        <ArrowLeft size={18} weight="bold" /> 乐器列表 · {instrument.sectionLabel}
      </Link>
      <div className="instrument-detail-page__hero">
        <img
          src={`/assets/ui/instruments/optimized/${instrument.id}-detail.webp`}
          width="800"
          height="800"
          alt={instrument.name}
          fetchPriority="high"
        />
        <span>{instrument.sectionLabel} · {instrument.englishName}</span>
      </div>
      <InstrumentPreviewPlayer instrument={instrument} />
      <header className="instrument-detail-page__intro">
        <p className="knowledge-eyebrow">{instrument.sectionLabel} · INSTRUMENT STORY</p>
        <h1>{instrument.name}</h1>
        <small>{instrument.englishName}</small>
        <p>{instrument.summary}</p>
      </header>
      <div className="instrument-detail-page__sections">
        <section className="instrument-info-card">
          <div className="instrument-info-card__heading"><span>01</span><h2>结构与音色</h2></div>
          <p>{instrument.timbre}</p>
          <ul className="instrument-info-card__chips">
            {instrument.structure.map((part) => <li key={part}>{part}</li>)}
          </ul>
        </section>
        <section className="instrument-info-card">
          <div className="instrument-info-card__heading"><span>02</span><h2>乐队角色</h2></div>
          <p>{instrument.orchestraRole}</p>
        </section>
        <section className="instrument-info-card">
          <div className="instrument-info-card__heading"><span>03</span><h2>代表听点</h2></div>
          <p>{instrument.listeningGuide}</p>
        </section>
        <section className="instrument-info-card">
          <div className="instrument-info-card__heading"><span>04</span><h2>延伸曲目</h2></div>
          <ul className="instrument-info-card__works">
            {instrument.featuredWorks.map((work) => <li key={work}>{work}</li>)}
          </ul>
        </section>
      </div>
      <section className="instrument-detail-page__model">
        <div>
          <p className="knowledge-eyebrow">EXPLORE IN 3D</p>
          <h2>换个角度看看{instrument.name}</h2>
          <p>打开后可拖动旋转，观察乐器结构。</p>
        </div>
        {showModel ? (
          <Suspense fallback={<p className="instrument-detail-page__model-loading">正在准备 3D 模型…</p>}>
            <InstrumentModelViewer
              accentColor={instrument.color}
              modelUrl={instrument.modelUrl}
              title={instrument.name}
            />
          </Suspense>
        ) : (
          <button type="button" onClick={() => setShowModel(true)}><Cube size={21} /> 查看 3D 模型</button>
        )}
      </section>
    </article>
  );
}
