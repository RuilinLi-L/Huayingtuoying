import { Link } from 'react-router-dom';
import { buildEntryPath, buildExperiencePath } from '../lib/entries';
import type { EntryManifest } from '../types/manifest';

export function EntryCard({ entry }: { entry: EntryManifest }) {
  return (
    <article className="card entry-card">
      <div
        className="entry-card__badge"
        style={{
          backgroundColor: `${entry.themeColor ?? '#6d28d9'}22`,
          color: entry.themeColor,
        }}
      >
        {entry.orchestraZone}
      </div>
      <img
        className="entry-card__poster"
        src={entry.posterImage}
        alt={`${entry.title} 海报`}
      />
      <div className="entry-card__content">
        <h3>{entry.title}</h3>
        <p>{entry.subtitle}</p>
        <div className="entry-card__meta">
          <span>{entry.audioStems.length} 条音轨</span>
          <span>{entry.knowledgeCards.length} 个知识热点</span>
        </div>
        <div className="entry-card__actions">
          <Link className="button button--ghost" to={buildEntryPath(entry.id)}>
            查看入口
          </Link>
          <Link className="button" to={buildExperiencePath(entry.id)}>
            直接体验
          </Link>
        </div>
      </div>
    </article>
  );
}
