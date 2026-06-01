import { musicians } from '../../data/orchestraDemo';
import { describeLineup } from '../../lib/orchestraSession';
import type { NfcSessionAdapter, NfcSessionSnapshot } from '../../types/demo';

interface NfcDeckPanelProps {
  selectedIds: string[];
  snapshot: NfcSessionSnapshot;
  mockAdapter: NfcSessionAdapter;
  reservedAdapter: NfcSessionAdapter;
  onToggleMusician: (musicianId: string) => void;
}

export function NfcDeckPanel({
  selectedIds,
  snapshot,
  mockAdapter,
  reservedAdapter,
  onToggleMusician,
}: NfcDeckPanelProps) {
  return (
    <section className="card deck-panel">
      <div className="deck-panel__head">
        <div>
          <p className="eyebrow">落子控制台</p>
          <h3>选择底座上的演奏家</h3>
        </div>
        <strong>{snapshot.detectedCount} / {musicians.length}</strong>
      </div>

      <div className="deck-panel__meta" aria-label="底座适配器状态">
        <span>Mock：{mockAdapter.mode}</span>
        <span>硬件：{reservedAdapter.isAvailable ? '可探测' : '待接入'}</span>
        <span>来源：{snapshot.source}</span>
      </div>

      <div className="deck-grid">
        {musicians.map((musician) => {
          const active = selectedIds.includes(musician.id);

          return (
            <button
              className={active ? 'deck-tile deck-tile--active' : 'deck-tile'}
              aria-pressed={active}
              key={musician.id}
              onClick={() => onToggleMusician(musician.id)}
              type="button"
            >
              <span className="deck-tile__dot" style={{ backgroundColor: musician.color }} />
              <span className="deck-tile__copy">
                <strong>{musician.instrument}</strong>
                <small>{musician.section}</small>
              </span>
            </button>
          );
        })}
      </div>

      <details className="payload-panel">
        <summary>
          <span>识别结果</span>
          <strong>{describeLineup(snapshot.placedMusicianIds)}</strong>
        </summary>
        <p>这段结果会继续被舞台模式、推荐场景与数字名片模块复用。</p>
        <code className="payload-code">
          {JSON.stringify(
            {
              baseAnchorId: snapshot.baseAnchorId,
              musicianIds: snapshot.placedMusicianIds,
              count: snapshot.detectedCount,
              source: snapshot.source,
            },
            null,
            2,
          )}
        </code>
      </details>
    </section>
  );
}
