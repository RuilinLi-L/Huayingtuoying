import { ArrowRight, Broadcast, MusicNotes, QrCode } from '@phosphor-icons/react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { buildEntryPath, buildExperiencePath } from '../lib/entries';
import { resolveEntryTheme } from '../lib/theme';
import type { EntryManifest } from '../types/manifest';

export function EntryCard({
  entry,
  revealIndex = 0,
}: {
  entry: EntryManifest;
  revealIndex?: number;
}) {
  return (
    <article
      className="card entry-card"
      data-reveal
      style={{
        ...resolveEntryTheme(entry.themeColor),
        '--delay-index': String(revealIndex),
      } as CSSProperties}
    >
      <div className="entry-card__frame">
        <div className="entry-card__head">
          <div className="entry-card__badge">{entry.orchestraZone}</div>
          <span className="mono-note">{entry.id}</span>
        </div>

        <img
          className="entry-card__poster"
          src={entry.posterImage}
          alt={`${entry.title} 海报`}
        />

        <div className="entry-card__content">
          <div className="catalog-label">条目展签</div>
          <h3>{entry.title}</h3>
          <p>{entry.subtitle}</p>
          <div className="entry-card__meta">
            <span>
              <MusicNotes size={16} weight="regular" />
              <span>{entry.audioStems.length} 条音轨</span>
            </span>
            <span>
              <Broadcast size={16} weight="regular" />
              <span>{entry.knowledgeCards.length} 张知识卡</span>
            </span>
            <span>
              <QrCode size={16} weight="regular" />
              <span>支持二维码 / NFC</span>
            </span>
          </div>
          <div className="entry-card__actions">
            <Link className="button--ghost" to={buildEntryPath(entry.id)}>
              <span>查看展签</span>
            </Link>
            <Link className="button" to={buildExperiencePath(entry.id)}>
              <ArrowRight size={18} weight="regular" />
              <span>进入体验</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
