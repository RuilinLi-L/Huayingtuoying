import {
  ArrowRight,
  BookOpenText,
  CardsThree,
  ProjectorScreenChart,
} from '@phosphor-icons/react';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { InstrumentModelViewer } from '../components/InstrumentModelViewer';
import {
  getInstrumentsBySection,
  instrumentEncyclopedia,
  instrumentSections,
} from '../data/instrumentEncyclopedia';
import type { MusicianSection } from '../types/demo';
import { getEntryById } from '../lib/entries';
import { buildTutorialPath, getTutorialModule } from '../lib/tutorials';
import { resolveEntryTheme } from '../lib/theme';

type InstrumentSectionFilter = MusicianSection | 'all';

const allSectionFilter = {
  id: 'all' as const,
  label: '全部',
  description: '一次浏览本项目《睡美人圆舞曲》用到的 12 件管弦乐器。',
};

export function LearnPage() {
  const { moduleId } = useParams();
  const location = useLocation();
  const module = getTutorialModule(moduleId);
  const [activeChapterId, setActiveChapterId] = useState('');
  const [activeSection, setActiveSection] = useState<InstrumentSectionFilter>('all');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState(
    instrumentEncyclopedia[0]?.id ?? 'flute',
  );

  const conceptCount = useMemo(
    () =>
      module?.chapters.reduce((count, chapter) => count + chapter.concepts.length, 0) ?? 0,
    [module],
  );

  const filteredInstruments = useMemo(
    () => getInstrumentsBySection(activeSection),
    [activeSection],
  );

  const selectedInstrument =
    instrumentEncyclopedia.find((instrument) => instrument.id === selectedInstrumentId) ??
    instrumentEncyclopedia[0];

  useEffect(() => {
    if (!module) {
      return;
    }

    setActiveChapterId(module.chapters[0]?.id ?? '');
  }, [module]);

  useEffect(() => {
    if (!module) {
      return;
    }

    const hashId = location.hash.replace('#', '');

    if (!hashId) {
      return;
    }

    const matchingChapter = module.chapters.find((chapter) => chapter.id === hashId);

    if (matchingChapter) {
      setActiveChapterId(matchingChapter.id);
    }

    window.requestAnimationFrame(() => {
      document.getElementById(hashId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [location.hash, module]);

  if (!module || !selectedInstrument) {
    return <Navigate replace to="/not-found" />;
  }

  const spotlightEntries = module.entrySpotlights
    .map((spotlight) => {
      const entry = getEntryById(spotlight.entryId);

      if (!entry) {
        return null;
      }

      return {
        spotlight,
        entry,
      };
    })
    .filter((item) => item !== null);

  const handleJumpToChapter = (chapterId: string) => {
    setActiveChapterId(chapterId);
    window.history.replaceState(null, '', buildTutorialPath(module.id, chapterId));
    document.getElementById(chapterId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleSelectSection = (sectionId: InstrumentSectionFilter) => {
    const nextInstruments = getInstrumentsBySection(sectionId);

    setActiveSection(sectionId);
    setSelectedInstrumentId(nextInstruments[0]?.id ?? instrumentEncyclopedia[0].id);
  };

  return (
    <div
      className="page learn-page"
      style={resolveEntryTheme('#6b7551') as CSSProperties}
    >
      <section className="learn-hero">
        <div className="learn-hero__content" data-reveal>
          <p className="eyebrow">{module.label}</p>
          <h1>{module.title}</h1>
          <p className="learn-hero__summary">{module.subtitle}</p>
          <p>{module.description}</p>
          <p className="learn-hero__preface">{module.preface}</p>
          <div className="hero__actions">
            <a className="button" href="#instrument-encyclopedia">
              <BookOpenText size={18} weight="regular" />
              <span>浏览 12 件乐器</span>
            </a>
            <Link className="button--ghost" to="/demo/base">
              <ProjectorScreenChart size={18} weight="regular" />
              <span>回到底座试听</span>
            </Link>
          </div>
        </div>

        <aside
          className="learn-hero__aside"
          data-reveal
          style={{ '--delay-index': '1' } as CSSProperties}
        >
          <div className="learn-hero__ledger">
            <p className="eyebrow">百科索引</p>
            <div className="learn-hero__notes">
              {module.heroNotes.map((note) => (
                <span className="status-tag learn-hero__tag" key={note}>
                  {note}
                </span>
              ))}
            </div>
            <div className="metric-grid">
              <div className="metric-chip">
                <small>乐理线索</small>
                <strong>{module.chapters.length} 组</strong>
              </div>
              <div className="metric-chip">
                <small>概念锚点</small>
                <strong>{conceptCount} 个</strong>
              </div>
              <div className="metric-chip">
                <small>乐器百科</small>
                <strong>{instrumentEncyclopedia.length} 件</strong>
              </div>
            </div>
          </div>

          <div className="learn-hero__entry-list">
            {spotlightEntries.map(({ spotlight, entry }) => (
              <article className="learn-hero__entry-card" key={entry.id}>
                <img src={entry.posterImage} alt={`${entry.title} 海报`} />
                <div>
                  <small className="catalog-label">{spotlight.label}</small>
                  <strong>{entry.title}</strong>
                  <p>{spotlight.summary}</p>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="learn-outline" data-reveal>
        <div className="learn-outline__head">
          <div>
            <p className="eyebrow">乐理速览</p>
            <h2>先用 3 组概念建立听觉地图。</h2>
            <p>
              这里不要求背术语，而是把音高、节奏和织体压缩成能直接用于展陈体验的观察方式。每一组都能回到展签、AR 或底座。
            </p>
          </div>
          <div className="learn-outline__summary">
            <CardsThree size={22} weight="regular" />
            <p>
              章节按钮会定位到对应概念；乐器百科则继续提供模型预览、分轨试听和具体角色介绍。
            </p>
          </div>
        </div>
        <div className="learn-outline__nav">
          {module.chapters.map((chapter) => (
            <button
              className={
                activeChapterId === chapter.id
                  ? 'learn-outline__link learn-outline__link--active'
                  : 'learn-outline__link'
              }
              key={chapter.id}
              onClick={() => handleJumpToChapter(chapter.id)}
              type="button"
            >
              <small>{chapter.shortLabel}</small>
              <strong>{chapter.title}</strong>
              <span>{chapter.intro}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="learn-theory-grid" aria-label="基础乐理概念">
        {module.chapters.map((chapter, index) => (
          <article
            className="theory-card panel"
            data-reveal
            id={chapter.id}
            key={chapter.id}
            style={{ '--delay-index': String(index) } as CSSProperties}
          >
            <div className="theory-card__head">
              <span className="tutorial-chapter__index">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <small className="catalog-label">{chapter.shortLabel}</small>
                <h3>{chapter.title}</h3>
              </div>
            </div>
            <p>{chapter.intro}</p>
            <div className="theory-card__concepts">
              {chapter.concepts.map((concept) => (
                <span className="chip" key={concept.id}>
                  {concept.label}
                </span>
              ))}
            </div>
            <div className="theory-card__example">
              <small className="catalog-label">{chapter.examples[0]?.label}</small>
              <strong>{chapter.examples[0]?.title}</strong>
              <p>{chapter.examples[0]?.observation}</p>
            </div>
            <div className="hero__actions">
              {chapter.continueLinks.slice(0, 2).map((link) => (
                <Link
                  className={link.variant === 'ghost' ? 'button--ghost' : 'button'}
                  key={`${chapter.id}-${link.to}`}
                  to={link.to}
                >
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section
        className="instrument-encyclopedia"
        data-reveal
        id="instrument-encyclopedia"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">12 乐器百科</p>
            <h2>按声部选择一件乐器，再看介绍、试听分轨和 3D 占位模型。</h2>
            <p>
              当前模型使用独立百科占位资源，不复用 AR 场景里的小人模型。后续正式乐器模型可以逐件替换到相同字段。
            </p>
          </div>
        </div>

        <div className="instrument-filter" aria-label="乐器声部筛选">
          {[allSectionFilter, ...instrumentSections].map((section) => (
            <button
              className={
                activeSection === section.id
                  ? 'chip chip--active instrument-filter__chip'
                  : 'chip instrument-filter__chip'
              }
              key={section.id}
              onClick={() => handleSelectSection(section.id)}
              type="button"
            >
              <span>{section.label}</span>
              <small>{section.description}</small>
            </button>
          ))}
        </div>

        <div className="instrument-browser">
          <div className="instrument-list" aria-label="乐器列表">
            {filteredInstruments.map((instrument) => (
              <button
                aria-pressed={selectedInstrument.id === instrument.id}
                className={
                  selectedInstrument.id === instrument.id
                    ? 'instrument-tile instrument-tile--active'
                    : 'instrument-tile'
                }
                key={instrument.id}
                onClick={() => setSelectedInstrumentId(instrument.id)}
                type="button"
              >
                <span
                  className="instrument-tile__swatch"
                  style={{ backgroundColor: instrument.color }}
                />
                <span>
                  <strong>{instrument.name}</strong>
                  <small>
                    {instrument.englishName} / {instrument.shortLabel}
                  </small>
                </span>
                <em>{instrument.sectionLabel}</em>
              </button>
            ))}
          </div>

          <article className="instrument-detail">
            <div className="instrument-detail__model panel">
              <InstrumentModelViewer
                accentColor={selectedInstrument.color}
                modelUrl={selectedInstrument.modelUrl}
                title={selectedInstrument.name}
              />
            </div>

            <div className="instrument-detail__copy panel">
              <div className="instrument-detail__title">
                <div>
                  <p className="eyebrow">{selectedInstrument.sectionLabel}</p>
                  <h2>{selectedInstrument.name}</h2>
                  <p>
                    {selectedInstrument.englishName} / {selectedInstrument.shortLabel}
                  </p>
                </div>
                <span
                  className="instrument-detail__mark"
                  style={{ backgroundColor: selectedInstrument.color }}
                  aria-hidden="true"
                />
              </div>

              <p className="instrument-detail__summary">{selectedInstrument.summary}</p>

              <div className="instrument-info-grid">
                <section>
                  <small className="catalog-label">结构与音色</small>
                  <p>{selectedInstrument.timbre}</p>
                  <div className="chip-row">
                    {selectedInstrument.structure.map((item) => (
                      <span className="chip" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </section>
                <section>
                  <small className="catalog-label">乐队角色</small>
                  <p>{selectedInstrument.orchestraRole}</p>
                </section>
                <section>
                  <small className="catalog-label">代表听点</small>
                  <p>{selectedInstrument.listeningGuide}</p>
                </section>
                <section>
                  <small className="catalog-label">延伸曲目</small>
                  <p>{selectedInstrument.featuredWorks.join(' / ')}</p>
                </section>
              </div>

              <div className="instrument-audio">
                <div>
                  <small className="catalog-label">项目分轨试听</small>
                  <strong>{selectedInstrument.name} · 睡美人圆舞曲</strong>
                </div>
                <audio controls src={selectedInstrument.audioSrc} />
              </div>

              <div className="hero__actions">
                <Link className="button" to="/demo/base">
                  <ArrowRight size={18} weight="regular" />
                  <span>到底座里组合试听</span>
                </Link>
                <Link className="button--ghost" to="/entry/ensemble-stage">
                  <span>查看全编制展签</span>
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="learn-return panel" data-reveal>
        <div>
          <p className="eyebrow">回到项目路径</p>
          <h2>把刚才认识的乐器，放回展签、AR 和底座。</h2>
          <p>
            当 12 件乐器的音色、声部和角色都有了入口之后，底座 Demo 里的分轨开关就不只是控制音量，而是在帮助观众看见一张完整的配器关系图。
          </p>
        </div>
        <div className="hero__actions">
          <Link className="button" to="/demo/base">
            <ArrowRight size={18} weight="regular" />
            <span>直接去看底座 Demo</span>
          </Link>
          <Link className="button--ghost" to="/entry/ensemble-stage">
            <span>回到合奏展签</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
