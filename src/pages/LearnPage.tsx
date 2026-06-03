import {
  ArrowRight,
  BookOpenText,
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
import { getTutorialModule } from '../lib/tutorials';
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
  const [activeSection, setActiveSection] = useState<InstrumentSectionFilter>('all');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState(
    instrumentEncyclopedia[0]?.id ?? 'flute',
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

    const hashId = location.hash.replace('#', '');

    if (!hashId) {
      return;
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

  const knowledgeCards = module.knowledgeCards ?? [];
  const knowledgeCardCount = knowledgeCards.length;

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
                <small>乐理卡片</small>
                <strong>{knowledgeCardCount} 张</strong>
              </div>
              <div className="metric-chip">
                <small>章节锚点</small>
                <strong>{module.chapters.length} 组</strong>
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

      {knowledgeCards.length ? (
        <section className="knowledge-card-board" data-reveal aria-label="乐理知识卡片">
          <div className="section-heading">
            <div>
              <p className="eyebrow">乐理知识卡片</p>
              <h2>把图片里的基础乐理要点直接铺开。</h2>
              <p>
                按卡片查阅即可：节奏、音程、和弦、调式、升降号和中国调式都整理成清单，不需要先进入单独章节。
              </p>
            </div>
          </div>

          <div className="knowledge-card-grid">
            {knowledgeCards.map((card, index) => (
              <article
                className="knowledge-topic-card panel"
                data-reveal
                id={card.id}
                key={card.id}
                style={{ '--delay-index': String(index) } as CSSProperties}
              >
                <div className="knowledge-topic-card__head">
                  <span className="tutorial-chapter__index">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <small className="catalog-label">{card.label}</small>
                    <h3>{card.title}</h3>
                    <p>{card.summary}</p>
                  </div>
                </div>

                <div className="knowledge-topic-card__sections">
                  {card.sections.map((section) => (
                    <section
                      className="knowledge-topic-card__section"
                      key={`${card.id}-${section.title}`}
                    >
                      <h4>{section.title}</h4>
                      <ul>
                        {section.items.map((item) => (
                          <li key={`${card.id}-${section.title}-${item.label ?? item.text}`}>
                            {item.label ? <strong>{item.label}</strong> : null}
                            <span>{item.text}</span>
                          </li>
                        ))}
                      </ul>
                      {section.note ? (
                        <p className="knowledge-topic-card__note">{section.note}</p>
                      ) : null}
                    </section>
                  ))}
                </div>

                {card.note ? (
                  <p className="knowledge-topic-card__footnote">{card.note}</p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

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
