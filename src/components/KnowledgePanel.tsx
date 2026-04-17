import { BookOpenText } from '@phosphor-icons/react';
import type { EntryManifest, KnowledgeCard } from '../types/manifest';

interface KnowledgePanelProps {
  entry: EntryManifest;
  selectedCard: KnowledgeCard | null;
  onSelect: (card: KnowledgeCard) => void;
}

export function KnowledgePanel({
  entry,
  selectedCard,
  onSelect,
}: KnowledgePanelProps) {
  return (
    <section className="card knowledge-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">策展说明栏</p>
          <h3>乐理、叙事与入口说明汇总在这里</h3>
          <p>点击 AR 热点或下方标签，侧栏会切换到对应条目的知识卡，让信息阅读像展签延伸，而不是额外弹窗。</p>
        </div>
      </div>

      <div className="chip-row">
        {entry.knowledgeCards.map((card) => (
          <button
            className={selectedCard?.id === card.id ? 'chip chip--active' : 'chip'}
            key={card.id}
            onClick={() => onSelect(card)}
            type="button"
          >
            {card.anchor}
          </button>
        ))}
      </div>

      {selectedCard ? (
        <article className="knowledge-card">
          <small className="catalog-label">{selectedCard.anchor}</small>
          <h4>{selectedCard.title}</h4>
          <p>{selectedCard.summary}</p>
          {selectedCard.media?.map((media) => (
            <div className="knowledge-card__media" key={`${selectedCard.id}-${media.src}`}>
              {media.type === 'image' ? (
                <img src={media.src} alt={media.alt ?? selectedCard.title} />
              ) : media.type === 'link' ? (
                <a href={media.src} rel="noreferrer" target="_blank">
                  {media.label ?? media.src}
                </a>
              ) : (
                <audio controls src={media.src} />
              )}
            </div>
          ))}
        </article>
      ) : (
        <div className="empty-state">
          <strong>
            <BookOpenText size={18} weight="regular" /> 还没有选中知识卡
          </strong>
          <p>先从舞台热点或上方标签中选择一个锚点，页面会在这里展开对应说明。</p>
        </div>
      )}
    </section>
  );
}
