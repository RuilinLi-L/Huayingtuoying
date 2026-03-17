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
          <h3>乐理与叙事热点</h3>
          <p>点击 AR 热点或下方标签，可切换当前条目的知识卡片。</p>
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
          <small>{selectedCard.anchor}</small>
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
        <p className="empty-state">暂无知识卡片。</p>
      )}
    </section>
  );
}
