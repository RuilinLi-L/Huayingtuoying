import { Link } from 'react-router-dom';
import { theoryTopics, getTheoryTopic } from '../../data/theoryTopics';
import { instrumentSections, instrumentEncyclopedia } from '../../data/instrumentEncyclopedia';
import '../../styles/knowledge-guide.css';

export function KnowledgeGuidePage() {
  return (
    <article className="knowledge-page knowledge-guide">
      <header>
        <p className="knowledge-eyebrow">EXPLORE MUSIC</p>
        <h1>完整知识导览</h1>
        <p>从一个声音开始，慢慢认识音乐。7 个乐理章节，12 件管弦乐器。</p>
      </header>
      <section>
        <h2>乐理 · 分章阅读</h2>
        <div className="guide-grid">
          {theoryTopics.map((topic) => (
            <Link className="guide-card" to={`/knowledge/theory/${topic.id}`} key={topic.id}>
              <img src={topic.illustration} alt="" width="56" height="56" loading="lazy" />
              <div>
                <small>CHAPTER {topic.id}</small>
                <h3>{getTheoryTopic(topic.id)?.card.title}</h3>
                <p>{getTheoryTopic(topic.id)?.card.summary}</p>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2>乐器 · 听见不同声部</h2>
        {instrumentSections.map((section) => (
          <div key={section.id} className="guide-section">
            <Link to={`/knowledge/instruments?section=${section.id}`}>
              <h3>{section.label} →</h3>
            </Link>
            <div className="guide-instruments">
              {instrumentEncyclopedia
                .filter((i) => i.section === section.id)
                .map((i) => (
                  <Link to={`/knowledge/instruments/${i.id}?section=${section.id}`} key={i.id}>
                    {i.name}
                    <small>{i.englishName}</small>
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </section>
    </article>
  );
}
