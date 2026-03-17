import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const shouldEnterDemo =
      searchParams.has('lineup') ||
      searchParams.get('source') === 'nfc' ||
      searchParams.get('autostart') === '1';

    if (!shouldEnterDemo) {
      return;
    }

    navigate(`/demo/base?${searchParams.toString()}`, { replace: true });
  }, [navigate, searchParams]);

  return (
    <div className="page home-page">
      <section className="home-hero" id="overview">
        <div className="home-hero__content">
          <p className="eyebrow">实体文创 + 虚拟交互</p>
          <h1>让 12 位演奏家和一个智能底座，变成通往虚拟音乐厅的入口。</h1>
          <p className="home-hero__summary">
            当前版本先用占位素材做一个可演示的 Web demo，完整验证“落子识别 →
            扫码进入 → 乐团生成 → 曲目切换 → 乐手科普”的核心链路，并预留 NFC 接口。
          </p>
          <div className="hero__actions">
            <Link className="button" to="/demo/base">
              进入底座演示
            </Link>
            <a className="button button--ghost" href="#modes">
              查看玩法设计
            </a>
          </div>
        </div>

        <div className="home-hero__stack">
          <article className="card home-highlight">
            <small>12 + 1</small>
            <strong>12 位演奏家 + 1 个智能底座</strong>
            <p>每个摆件预留独立 NFC 身份，底座负责汇总组合与触发玩法。</p>
          </article>
          <article className="card home-highlight">
            <small>Web Demo</small>
            <strong>去 APP 化的轻量入口</strong>
            <p>先用浏览器完成体验闭环，后续再替换成真实 3D 角色、曲库和 NFC 硬件联动。</p>
          </article>
        </div>
      </section>

      <section className="info-grid" id="how-it-works">
        <article className="card">
          <h3>Place</h3>
          <p>把演奏家摆件放到底座上，系统识别当前放置的乐器身份与数量。</p>
        </article>
        <article className="card">
          <h3>Scan</h3>
          <p>手机扫描底座上的院徽锚点，进入 WebAR 会话并锚定虚拟舞台。</p>
        </article>
        <article className="card">
          <h3>Show</h3>
          <p>虚拟乐团在屏幕中生成，支持切歌、切景、点选乐手和查看数字名片。</p>
        </article>
      </section>

      <section className="card mode-gallery" id="modes">
        <div className="section-heading">
          <div>
            <p className="eyebrow">玩法层级</p>
            <h2>从单人聚焦，到组合探索，再到全员合奏</h2>
          </div>
        </div>
        <div className="mode-gallery__grid">
          <article className="mode-gallery__item">
            <small>Learn</small>
            <h3>独奏与深度科普</h3>
            <p>只放 1 位演奏家时，舞台聚焦单个乐手，并弹出对应乐器数字名片。</p>
          </article>
          <article className="mode-gallery__item">
            <small>Create</small>
            <h3>自由组合与创意探索</h3>
            <p>非标准组合会触发音色碰撞和声部拼贴，让用户直观感受配器变化。</p>
          </article>
          <article className="mode-gallery__item">
            <small>Unlock</small>
            <h3>提琴家族 / 木管五重奏</h3>
            <p>识别到关键组合后，自动切换到室内乐模式并解锁对应曲目与舞台效果。</p>
          </article>
          <article className="mode-gallery__item">
            <small>Finale</small>
            <h3>全员合奏</h3>
            <p>集齐 12 位演奏家后，进入完整音乐会场景，模拟新年音乐会的全景体验。</p>
          </article>
        </div>
      </section>

      <section className="card delivery-panel" id="demo">
        <div className="section-heading">
          <div>
            <p className="eyebrow">当前交付</p>
            <h2>这版先交“可演示结构”，再替换真实素材</h2>
          </div>
          <Link className="button" to="/demo/base">
            直接体验 demo
          </Link>
        </div>
        <ul className="feature-list">
          <li>12 位演奏家占位数据、组合规则、场景切换和曲目切换。</li>
          <li>模拟 NFC 适配器与预留硬件接口，后续只需要替换数据源。</li>
          <li>相机背景 + 虚拟乐团舞台，先验证 Web 端体验结构。</li>
          <li>数字名片、百科占位内容和后续 OTA 扩展入口。</li>
        </ul>
      </section>
    </div>
  );
}
