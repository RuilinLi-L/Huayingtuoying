import { useId, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { getTheoryTopic, theoryTopics, type TheoryTopicId } from '../../data/theoryTopics';

interface TheoryDialProps {
  activeId: TheoryTopicId;
}

const ornaments = ['rhythm-controls', 'dynamics', 'accidentals', 'guqin'];
const step = 32;

export function TheoryDial({ activeId }: TheoryDialProps) {
  const clipId = `dial-landscape-${useId().replace(/:/g, '')}`;
  const activeIndex = theoryTopics.findIndex((topic) => topic.id === activeId);
  const style = { '--dial-angle': `${-activeIndex * step}deg` } as CSSProperties;
  const position = (index: number): CSSProperties => {
    const angle = index * step * Math.PI / 180;
    return { left: `${50 + 36 * Math.sin(angle)}%`, top: `${50 - 36 * Math.cos(angle)}%` };
  };

  // Outside the animated route container: fixed navigation must not move with
  // the chapter or acquire a transformed ancestor as its containing block.
  return createPortal(
    <nav className="theory-dial" aria-label="乐理章节圆盘导航" style={style} data-active-topic={activeId}>
      <div className="theory-dial__disc">
        <svg className="theory-dial__base" viewBox="0 0 447 447" aria-hidden="true">
          <circle cx="223.5" cy="223.5" r="223.5" fill="#b6b7d0" />
          <path d="M223 58 C257 125 350 141 344 225 C339 303 273 349 208 344 C123 337 92 277 106 213 C115 165 192 121 223 58Z" fill="#a1b2c7" />
          <circle cx="223.5" cy="223.5" r="62" fill="#839fa6" stroke="#96afbc" strokeWidth="9" />
        </svg>
        <div className="theory-dial__orbit">
          <svg className="theory-dial__ticks" viewBox="0 0 447 447" aria-hidden="true">
            {Array.from({ length: 36 }, (_, index) => <path key={index} d={`M223.5 ${index % 3 ? 125 : 116} V137`} transform={`rotate(${index * 10} 223.5 223.5)`} stroke="#edf0ef" strokeWidth={index % 3 ? 2 : 3} strokeLinecap="round" />)}
          </svg>
          {theoryTopics.map((topic, index) => (
            <div className="theory-dial__node" style={position(index)} key={topic.id}>
              <div className="theory-dial__upright">
                <Link
                  aria-current={activeId === topic.id ? 'page' : undefined}
                  aria-label={`第 ${topic.id} 章：${getTheoryTopic(topic.id)?.card.title}`}
                  className={`theory-dial__button${activeId === topic.id ? ' theory-dial__button--active' : ''}`}
                  to={`/knowledge/theory/${topic.id}`}
                  onClick={(event) => { if (activeId === topic.id) event.preventDefault(); }}
                >
                  <img src={topic.illustration} alt="" width="44" height="44" />
                  <span>{topic.id}</span>
                </Link>
              </div>
            </div>
          ))}
          {ornaments.map((name, index) => (
            <div className="theory-dial__node theory-dial__ornament" style={position(index + 3)} key={name} aria-hidden="true">
              <div className="theory-dial__upright"><img src={`/assets/ui/theory/${name}.png`} alt="" width="44" height="44" /></div>
            </div>
          ))}
        </div>
        <span className="theory-dial__pointer" aria-hidden="true" />
        <svg className="theory-dial__landscape" viewBox="25 22 155 155" aria-hidden="true">
          <defs><clipPath id={clipId}><path d="M98 25 C139 24 159 44 164 62 L179 64 L161 88 C166 131 142 163 99 167 C53 165 31 134 33 93 C34 55 60 27 98 25Z" /></clipPath></defs>
          <image href="/assets/ui/theory/harmony-wheel.png" width="447" height="447" clipPath={`url(#${clipId})`} />
        </svg>
        <span className="theory-dial__center" aria-hidden="true"><small>THEORY</small><strong>{activeId}</strong></span>
      </div>
      <p className="sr-only">选择章节，继续探索乐理</p>
    </nav>,
    document.body,
  );
}
