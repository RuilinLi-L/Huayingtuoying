import { CaretDown, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { KnowledgeModeTabs } from '../../components/knowledge/KnowledgeModeTabs';
import { TheoryDial } from '../../components/knowledge/TheoryDial';
import { getTheoryTopic, theoryTopics } from '../../data/theoryTopics';
import type { TutorialKnowledgeCardSection } from '../../types/tutorial';
import '../../styles/theory-mobile.css';

interface TheorySectionProps {
  section: TutorialKnowledgeCardSection;
  sectionIndex: number;
  topicId: string;
}

function TheorySection({ section, sectionIndex, topicId }: TheorySectionProps) {
  const [expanded, setExpanded] = useState(sectionIndex === 0);
  const sectionId = `theory-${topicId}-section-${sectionIndex}`;

  return (
    <section className="theory-mobile__section">
      <h2 className="theory-mobile__section-heading">
        <button
          aria-controls={sectionId}
          aria-expanded={expanded}
          className="theory-mobile__section-toggle"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          <span>
            <small>{String(sectionIndex + 1).padStart(2, '0')} / {String(section.items.length).padStart(2, '0')} 个知识点</small>
            <strong>{section.title}</strong>
          </span>
          <CaretDown aria-hidden="true" className={expanded ? 'is-expanded' : ''} size={20} weight="bold" />
        </button>
      </h2>

      <div id={sectionId} className="theory-mobile__section-content" hidden={!expanded}>
        <ol className="theory-mobile__items">
          {section.items.map((item, itemIndex) => (
            <li className="theory-mobile__item" key={`${item.label ?? item.text}-${itemIndex}`}>
              <div className="theory-mobile__item-label">
                <strong>{item.label ?? String(itemIndex + 1).padStart(2, '0')}</strong>
                <small>{String(sectionIndex + 1).padStart(2, '0')} · {String(itemIndex + 1).padStart(2, '0')}</small>
              </div>
              <p>{item.text}</p>
            </li>
          ))}
        </ol>
        {section.note ? <p className="theory-mobile__section-note">{section.note}</p> : null}
      </div>
    </section>
  );
}

export function TheoryPage() {
  const { topicId } = useParams();
  const topic = getTheoryTopic(topicId);
  const [transition, setTransition] = useState({ index: topic?.index ?? 0, direction: 'forward' });
  if (topic && transition.index !== topic.index) {
    setTransition({ index: topic.index, direction: topic.index < transition.index ? 'backward' : 'forward' });
  }
  const direction = transition.direction;

  useEffect(() => {
    if (topic) {
      window.scrollTo(0, 0);
    }
  }, [topic?.id, topic?.index]);

  if (!topic) return <Navigate replace to="/not-found" />;

  const previous = theoryTopics[topic.index - 1];
  const next = theoryTopics[topic.index + 1];

  return (
    <div className="theory-mobile">
      <KnowledgeModeTabs />
      <article className={`theory-mobile__chapter theory-mobile__chapter--${direction}`} key={topic.id}>
        <header className="theory-mobile__hero">
          <span className="theory-mobile__eyebrow">THEORY · {topic.card.label}</span>
          <div className="theory-mobile__hero-title">
            <span className="theory-mobile__chapter-number" aria-hidden="true">{topic.id}</span>
            <h1>{topic.card.title}</h1>
          </div>
          <p>{topic.card.summary}</p>
          <img className="theory-mobile__hero-art" src={topic.illustration} alt="" width="112" height="112" />
        </header>

        <nav className="theory-mobile__chapters" aria-label="乐理章节">
          {theoryTopics.map((item) => {
            const card = getTheoryTopic(item.id)?.card;
            return (
              <Link
                aria-current={item.id === topic.id ? 'page' : undefined}
                className={item.id === topic.id ? 'theory-mobile__chapter-link is-active' : 'theory-mobile__chapter-link'}
                key={item.id}
                to={`/knowledge/theory/${item.id}`}
              >
                <span>{item.id}</span>
                <small>{card?.label}</small>
              </Link>
            );
          })}
        </nav>

        <div className="theory-mobile__content">
          {topic.card.sections.map((section, index) => (
            <div key={`${topic.id}-${section.title}`}>
              <TheorySection section={section} sectionIndex={index} topicId={topic.id} />
            </div>
          ))}
        </div>

        {topic.card.note ? <aside className="theory-mobile__takeaway"><strong>记忆提示</strong><p>{topic.card.note}</p></aside> : null}

        <nav className="theory-mobile__paging" aria-label="上一章和下一章">
          {previous ? (
            <Link to={`/knowledge/theory/${previous.id}`}><CaretLeft size={18} />上一章 · {previous.id}</Link>
          ) : <span />}
          {next ? (
            <Link to={`/knowledge/theory/${next.id}`}>下一章 · {next.id}<CaretRight size={18} /></Link>
          ) : <span />}
        </nav>
        <Link className="theory-mobile__legacy" to={`/learn/fundamentals#${topic.card.id}`}>在完整导学页阅读这张卡片</Link>
      </article>
      <TheoryDial activeId={topic.id} />
    </div>
  );
}
