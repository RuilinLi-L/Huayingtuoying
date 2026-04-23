import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { buildEntryPath, buildExperiencePath, getEntryById } from '../lib/entries';
import type { TutorialChapter } from '../types/tutorial';

interface TutorialChapterSectionProps {
  chapter: TutorialChapter;
  index: number;
  selectedConceptId: string;
  selectedExampleId: string;
  onSelectConcept: (chapterId: string, conceptId: string) => void;
  onSelectExample: (chapterId: string, exampleId: string) => void;
}

export function TutorialChapterSection({
  chapter,
  index,
  selectedConceptId,
  selectedExampleId,
  onSelectConcept,
  onSelectExample,
}: TutorialChapterSectionProps) {
  const selectedConcept =
    chapter.concepts.find((concept) => concept.id === selectedConceptId) ??
    chapter.concepts[0];
  const selectedExample =
    chapter.examples.find((example) => example.id === selectedExampleId) ??
    chapter.examples[0];
  const relatedEntries = selectedExample.relatedEntryIds
    .map((entryId) => getEntryById(entryId))
    .filter((entry) => entry !== undefined);

  return (
    <article
      className="tutorial-chapter panel"
      data-reveal
      id={chapter.id}
      style={{ '--delay-index': String(index) } as CSSProperties}
    >
      <div className="tutorial-chapter__rail">
        <div className="tutorial-chapter__index">{String(index + 1).padStart(2, '0')}</div>
        <div className="tutorial-chapter__rail-copy">
          <small className="catalog-label">{chapter.shortLabel}</small>
          <p>{chapter.reflection}</p>
        </div>
      </div>

      <div className="tutorial-chapter__main">
        <div className="section-heading">
          <div>
            <p className="eyebrow">章节 {String(index + 1).padStart(2, '0')}</p>
            <h2>{chapter.title}</h2>
            <p>{chapter.intro}</p>
          </div>
          <span className="tutorial-chapter__count">
            {chapter.concepts.length} 个概念锚点
          </span>
        </div>

        <div className="tutorial-chapter__grid">
          <section className="tutorial-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">概念卡</p>
                <h3>先抓住一个最容易听见的重点</h3>
              </div>
            </div>
            <div className="chip-row">
              {chapter.concepts.map((concept) => (
                <button
                  className={
                    selectedConcept.id === concept.id ? 'chip chip--active' : 'chip'
                  }
                  key={concept.id}
                  onClick={() => onSelectConcept(chapter.id, concept.id)}
                  type="button"
                >
                  {concept.label}
                </button>
              ))}
            </div>
            <article className="tutorial-concept">
              <small className="catalog-label">{selectedConcept.label}</small>
              <h3>{selectedConcept.title}</h3>
              <p>{selectedConcept.summary}</p>
              <p className="tutorial-concept__note">{selectedConcept.takeaway}</p>
            </article>
          </section>

          <section className="tutorial-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">实体例子</p>
                <h3>把概念放回现有乐器小人与底座里</h3>
              </div>
            </div>
            {chapter.examples.length > 1 ? (
              <div className="chip-row">
                {chapter.examples.map((example) => (
                  <button
                    className={
                      selectedExample.id === example.id ? 'chip chip--active' : 'chip'
                    }
                    key={example.id}
                    onClick={() => onSelectExample(chapter.id, example.id)}
                    type="button"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            ) : null}
            <article className="tutorial-example">
              <div className="tutorial-example__head">
                <div>
                  <small className="catalog-label">{selectedExample.label}</small>
                  <h3>{selectedExample.title}</h3>
                </div>
                <span className="tutorial-example__tag">
                  关联 {relatedEntries.length} 个实体入口
                </span>
              </div>
              <p>{selectedExample.description}</p>
              <p className="tutorial-example__observation">
                {selectedExample.observation}
              </p>

              {selectedExample.audioSrc ? (
                <div className="tutorial-example__audio">
                  <span className="mono-label">
                    {selectedExample.audioLabel ?? '示意音频'}
                  </span>
                  <audio controls src={selectedExample.audioSrc} />
                </div>
              ) : null}

              <div className="tutorial-entry-grid">
                {relatedEntries.map((entry) => (
                  <article className="tutorial-entry-card" key={entry.id}>
                    <img
                      className="tutorial-entry-card__poster"
                      src={entry.posterImage}
                      alt={`${entry.title} 海报`}
                    />
                    <div className="tutorial-entry-card__content">
                      <small className="catalog-label">{entry.orchestraZone}</small>
                      <strong>{entry.title}</strong>
                      <p>{entry.subtitle}</p>
                      <div className="tutorial-entry-card__actions">
                        <Link className="button--ghost" to={buildEntryPath(entry.id)}>
                          查看展签
                        </Link>
                        <Link className="button--quiet" to={buildExperiencePath(entry.id)}>
                          进入体验
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {selectedExample.links?.length ? (
                <div className="hero__actions">
                  {selectedExample.links.map((link) => (
                    <Link
                      className={link.variant === 'ghost' ? 'button--ghost' : 'button'}
                      key={`${selectedExample.id}-${link.to}`}
                      to={link.to}
                    >
                      <span>{link.label}</span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </article>
          </section>
        </div>

        <aside className="tutorial-continue">
          <div>
            <p className="eyebrow">继续回到项目</p>
            <h3>{chapter.continueTitle}</h3>
            <p>{chapter.continueDescription}</p>
          </div>
          <div className="hero__actions">
            {chapter.continueLinks.map((link) => (
              <Link
                className={link.variant === 'ghost' ? 'button--ghost' : 'button'}
                key={`${chapter.id}-${link.to}`}
                to={link.to}
              >
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </article>
  );
}
