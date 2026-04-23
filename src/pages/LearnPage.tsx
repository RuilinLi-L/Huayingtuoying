import {
  ArrowRight,
  BookOpenText,
  CardsThree,
  ProjectorScreenChart,
} from '@phosphor-icons/react';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { TutorialChapterSection } from '../components/TutorialChapterSection';
import { getEntryById } from '../lib/entries';
import { buildTutorialPath, getTutorialModule } from '../lib/tutorials';
import { resolveEntryTheme } from '../lib/theme';

export function LearnPage() {
  const { moduleId } = useParams();
  const location = useLocation();
  const module = getTutorialModule(moduleId);
  const [activeChapterId, setActiveChapterId] = useState('');
  const [selectedConcepts, setSelectedConcepts] = useState<Record<string, string>>({});
  const [selectedExamples, setSelectedExamples] = useState<Record<string, string>>({});

  const chapterCount = module?.chapters.length ?? 0;
  const conceptCount = useMemo(
    () =>
      module?.chapters.reduce((count, chapter) => count + chapter.concepts.length, 0) ?? 0,
    [module],
  );

  useEffect(() => {
    if (!module) {
      return;
    }

    setSelectedConcepts(
      Object.fromEntries(
        module.chapters.map((chapter) => [chapter.id, chapter.concepts[0]?.id ?? '']),
      ),
    );
    setSelectedExamples(
      Object.fromEntries(
        module.chapters.map((chapter) => [chapter.id, chapter.examples[0]?.id ?? '']),
      ),
    );
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

    if (!matchingChapter) {
      return;
    }

    setActiveChapterId(matchingChapter.id);

    window.requestAnimationFrame(() => {
      document.getElementById(matchingChapter.id)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [location.hash, module]);

  if (!module) {
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

  const handleSelectConcept = (chapterId: string, conceptId: string) => {
    setSelectedConcepts((current) => ({
      ...current,
      [chapterId]: conceptId,
    }));
  };

  const handleSelectExample = (chapterId: string, exampleId: string) => {
    setSelectedExamples((current) => ({
      ...current,
      [chapterId]: exampleId,
    }));
  };

  const handleJumpToChapter = (chapterId: string) => {
    setActiveChapterId(chapterId);
    window.history.replaceState(null, '', buildTutorialPath(module.id, chapterId));
    document.getElementById(chapterId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
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
            <Link className="button" to="/demo/base">
              <ProjectorScreenChart size={18} weight="regular" />
              <span>先看底座 Demo</span>
            </Link>
            <Link className="button--ghost" to="/">
              <CardsThree size={18} weight="regular" />
              <span>回到项目总览</span>
            </Link>
          </div>
        </div>

        <aside
          className="learn-hero__aside"
          data-reveal
          style={{ '--delay-index': '1' } as CSSProperties}
        >
          <div className="learn-hero__ledger">
            <p className="eyebrow">导学线索</p>
            <div className="learn-hero__notes">
              {module.heroNotes.map((note) => (
                <span className="status-tag learn-hero__tag" key={note}>
                  {note}
                </span>
              ))}
            </div>
            <div className="metric-grid">
              <div className="metric-chip">
                <small>章节数量</small>
                <strong>{chapterCount} 章</strong>
              </div>
              <div className="metric-chip">
                <small>概念锚点</small>
                <strong>{conceptCount} 个</strong>
              </div>
              <div className="metric-chip">
                <small>实体入口</small>
                <strong>{spotlightEntries.length} 个</strong>
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
            <p className="eyebrow">阅读方式</p>
            <h2>先挑一个实体入口，再按章节把听感补起来。</h2>
            <p>
              这条导学路径不是要求你按顺序背概念，而是帮助你在有限停留时间里，知道先听哪里、再看哪里，最后怎样回到展签与舞台。
            </p>
          </div>
          <div className="learn-outline__summary">
            <BookOpenText size={22} weight="regular" />
            <p>
              章节按钮会把你带到对应段落；每一章里都能切换概念卡和实体例子，再直接跳回条目页或底座 Demo。
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

      <section className="learn-chapters">
        {module.chapters.map((chapter, index) => (
          <TutorialChapterSection
            chapter={chapter}
            index={index}
            key={chapter.id}
            onSelectConcept={handleSelectConcept}
            onSelectExample={handleSelectExample}
            selectedConceptId={selectedConcepts[chapter.id] ?? chapter.concepts[0]?.id ?? ''}
            selectedExampleId={selectedExamples[chapter.id] ?? chapter.examples[0]?.id ?? ''}
          />
        ))}
      </section>

      <section className="learn-return panel" data-reveal>
        <div>
          <p className="eyebrow">回到项目路径</p>
          <h2>把刚才听懂的概念，立刻装回展签、AR 和底座。</h2>
          <p>
            当节奏、拍号、和声和织体有了入口之后，现有的小提琴、长笛和合奏底座就不再只是展示对象，而会变成一条更完整的数字导览路径。
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
