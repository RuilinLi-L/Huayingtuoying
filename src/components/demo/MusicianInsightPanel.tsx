import { BookOpenText } from '@phosphor-icons/react';
import { getSelectedMusicians } from '../../lib/orchestraSession';
import type {
  CompositionDefinition,
  MusicianProfile,
  OrchestraModeDefinition,
  OrchestraSceneDefinition,
} from '../../types/demo';

interface MusicianInsightPanelProps {
  musician: MusicianProfile | null;
  selectedIds: string[];
  mode: OrchestraModeDefinition;
  scene: OrchestraSceneDefinition;
  composition: CompositionDefinition | null;
}

export function MusicianInsightPanel({
  musician,
  selectedIds,
  mode,
  scene,
  composition,
}: MusicianInsightPanelProps) {
  const selectedMusicians = getSelectedMusicians(selectedIds);

  return (
    <section className="card insight-panel">
      <div className="insight-panel__head">
        <div>
          <p className="eyebrow">策展说明栏</p>
          <h3>{musician ? `${musician.instrument}数字名片` : '等待选中乐手'}</h3>
        </div>
      </div>

      {musician ? (
        <>
          <article className="musician-card">
            <div className="musician-card__header">
              <span className="musician-card__swatch" style={{ backgroundColor: musician.color }} />
              <div>
                <small className="catalog-label">{musician.section}</small>
                <h4>{musician.instrument}</h4>
              </div>
            </div>
            <p>{musician.knowledgeSummary}</p>
            <p>{musician.knowledgeDetail}</p>
            <div className="musician-card__meta">
              <span>{mode.name}</span>
              <span>{scene.name}</span>
              <span>{composition?.title ?? '固定乐曲示例'}</span>
            </div>
          </article>

          <details className="encyclopedia-card insight-panel__details">
            <summary>延伸阅读入口</summary>
            <p>正式版本可以在这里接入更完整的移动百科页，承载作曲家、演出史、校园叙事与馆藏素材。</p>
            <ul className="feature-list">
              {musician.featuredWorks.map((work) => (
                <li key={work}>{work}</li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <article className="encyclopedia-card">
          <p>先在落子控制台中放入演奏家，再点击舞台中的任一角色，这里会切换到对应数字名片。</p>
        </article>
      )}

      <article className="selection-summary">
        <h4>当前组合</h4>
        <p>{mode.title}</p>
        <div className="chip-row">
          {selectedMusicians.length ? (
            selectedMusicians.map((item) => (
              <span className="chip chip--active" key={item.id}>
                {item.instrument}
              </span>
            ))
          ) : (
            <span className="chip">
              <BookOpenText size={16} weight="regular" />
              <span>等待落子</span>
            </span>
          )}
        </div>
      </article>
    </section>
  );
}
