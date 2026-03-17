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
      <div className="section-heading">
        <div>
          <h3>底座落子模拟</h3>
          <p>先在这里勾选演奏家，模拟底座通过 NFC 识别到当前摆件组合。</p>
        </div>
      </div>

      <div className="nfc-status-grid">
        <div className="nfc-status-chip">
          <small>Mock 适配器</small>
          <strong>{mockAdapter.mode}</strong>
        </div>
        <div className="nfc-status-chip">
          <small>预留硬件接口</small>
          <strong>{reservedAdapter.isAvailable ? '可探测' : '待接硬件'}</strong>
        </div>
        <div className="nfc-status-chip">
          <small>当前识别数量</small>
          <strong>{snapshot.detectedCount}</strong>
        </div>
      </div>

      <div className="deck-grid">
        {musicians.map((musician) => {
          const active = selectedIds.includes(musician.id);

          return (
            <button
              className={active ? 'deck-tile deck-tile--active' : 'deck-tile'}
              key={musician.id}
              onClick={() => onToggleMusician(musician.id)}
              type="button"
            >
              <span className="deck-tile__dot" style={{ backgroundColor: musician.color }} />
              <strong>{musician.instrument}</strong>
              <small>{musician.section}</small>
            </button>
          );
        })}
      </div>

      <div className="payload-panel">
        <small>识别结果</small>
        <strong>{describeLineup(snapshot.placedMusicianIds)}</strong>
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
      </div>
    </section>
  );
}
