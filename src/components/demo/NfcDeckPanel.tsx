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
          <p className="eyebrow">落子控制台</p>
          <h3>先在这里模拟底座识别，再把结果投到舞台</h3>
          <p>当前仍由 mock 适配器驱动，但页面结构已经按真实 NFC 会话的节奏组织好了。</p>
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
        <p>这段结果会继续被舞台模式、推荐场景与数字名片模块复用，不需要额外的中间转换层。</p>
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
