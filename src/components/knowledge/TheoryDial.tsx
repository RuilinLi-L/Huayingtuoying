import { Link } from 'react-router-dom';
import { getTheoryTopic, theoryTopics, type TheoryTopicId } from '../../data/theoryTopics';

interface TheoryDialProps {
  activeId: TheoryTopicId;
}

export function TheoryDial({ activeId }: TheoryDialProps) {
  return (
    <nav className="theory-dial" aria-label="乐理章节圆盘导航">
      <div className="theory-dial__disc">
        <img
          className="theory-dial__art"
          src="/assets/ui/theory/harmony-wheel.png"
          alt=""
          loading="lazy"
          width="450"
          height="450"
        />
        <span className="theory-dial__center" aria-hidden="true">
          <small>THEORY</small>
          <strong>{activeId}</strong>
        </span>
        {theoryTopics.map((topic, index) => {
          const title = getTheoryTopic(topic.id)?.card.title ?? `第 ${topic.id} 章`;
          return (
            <Link
              aria-current={activeId === topic.id ? 'page' : undefined}
              aria-label={`第 ${topic.id} 章：${title}`}
              className={`theory-dial__button theory-dial__button--${index + 1}${activeId === topic.id ? ' theory-dial__button--active' : ''}`}
              key={topic.id}
              to={`/knowledge/theory/${topic.id}`}
            >
              {topic.id}
            </Link>
          );
        })}
      </div>
      <p>选择章节，继续探索乐理</p>
    </nav>
  );
}
