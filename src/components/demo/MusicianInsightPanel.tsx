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
      <div className="section-heading">
        <div>
          <h3>数字名片与百科</h3>
          <p>点击舞台中的任意乐手，可切换当前乐器名片和深度科普占位内容。</p>
        </div>
      </div>

      {musician ? (
        <>
          <article className="musician-card">
            <div className="musician-card__header">
              <span className="musician-card__swatch" style={{ backgroundColor: musician.color }} />
              <div>
                <small>{musician.section}</small>
                <h4>{musician.instrument}</h4>
              </div>
            </div>
            <p>{musician.knowledgeSummary}</p>
            <p>{musician.knowledgeDetail}</p>
            <div className="musician-card__meta">
              <span>当前模式：{mode.name}</span>
              <span>当前场景：{scene.name}</span>
              <span>当前曲目：{composition?.title ?? '固定乐曲示例'}</span>
            </div>
          </article>

          <article className="encyclopedia-card">
            <h4>深度链接占位</h4>
            <p>
              正式版本中，这里可接到独立的移动百科页，承载起源、发展史、名家名作和校内演出素材。
            </p>
            <ul className="feature-list">
              {musician.featuredWorks.map((work) => (
                <li key={work}>{work}</li>
              ))}
            </ul>
          </article>
        </>
      ) : (
        <article className="encyclopedia-card">
          <h4>等待选择乐手</h4>
          <p>先在右侧模拟底座落子，再点击舞台中的乐手查看对应数字名片。</p>
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
            <span className="chip">等待落子</span>
          )}
        </div>
      </article>
    </section>
  );
}
