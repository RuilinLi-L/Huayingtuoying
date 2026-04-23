import {
  ArrowRight,
  BookOpenText,
  Copy,
  ProjectorScreenChart,
} from '@phosphor-icons/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { QrPreview } from '../components/QrPreview';
import {
  buildDeepLink,
  buildExperiencePath,
  getEntryById,
} from '../lib/entries';
import { parseLaunchSearchParams } from '../lib/launch';
import { resolveEntryTheme } from '../lib/theme';
import { buildTutorialPath, getTutorialSpotlightForEntry } from '../lib/tutorials';

function getLaunchSourceLabel(source: 'manual' | 'qr' | 'nfc') {
  if (source === 'nfc') {
    return 'NFC 触发';
  }

  if (source === 'qr') {
    return '扫码触发';
  }

  return '手动浏览';
}

export function EntryPage() {
  const { entryId } = useParams();
  const [searchParams] = useSearchParams();
  const entry = getEntryById(entryId);
  const [copied, setCopied] = useState(false);
  const launchContext = useMemo(
    () => parseLaunchSearchParams(searchParams),
    [searchParams],
  );
  const tutorialSpotlight = useMemo(
    () => (entry ? getTutorialSpotlightForEntry(entry.id) : null),
    [entry],
  );

  const nfcDeepLink = useMemo(() => {
    if (!entry) {
      return '';
    }

    return buildDeepLink(entry.id, window.location.origin, {
      source: 'nfc',
      autostart: true,
    });
  }, [entry]);

  const qrDeepLink = useMemo(() => {
    if (!entry) {
      return '';
    }

    return buildDeepLink(entry.id, window.location.origin, {
      source: 'qr',
      autostart: true,
    });
  }, [entry]);

  if (!entry) {
    return <Navigate replace to="/not-found" />;
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(nfcDeepLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="page detail-page" style={resolveEntryTheme(entry.themeColor)}>
      <section className="artifact-hero">
        <div className="panel artifact-hero__poster-frame" data-reveal>
          <img className="artifact-hero__poster" src={entry.posterImage} alt={entry.title} />
        </div>

        <div
          className="artifact-hero__content"
          data-reveal
          style={{ '--delay-index': '1' } as CSSProperties}
        >
          <p className="eyebrow">{entry.orchestraZone}</p>
          <h1>{entry.title}</h1>
          <p className="artifact-hero__summary">{entry.subtitle}</p>
          <p>{entry.description}</p>

          <div className="metric-grid">
            <div className="metric-chip">
              <small>进入方式</small>
              <strong>二维码 / NFC / 手动浏览</strong>
            </div>
            <div className="metric-chip">
              <small>内容结构</small>
              <strong>{entry.audioStems.length} 条音轨与 {entry.knowledgeCards.length} 张知识卡</strong>
            </div>
          </div>

          <div className="detail-hero__actions">
            <Link
              className="button"
              to={buildExperiencePath(entry.id, {
                source: launchContext.source,
                autostart: launchContext.autostart,
              })}
            >
              <ProjectorScreenChart size={18} weight="regular" />
              <span>进入 AR 场景</span>
            </Link>
            <button className="button--ghost" onClick={handleCopy} type="button">
              <Copy size={18} weight="regular" />
              <span>{copied ? 'NFC 链接已复制' : '复制 NFC 深链'}</span>
            </button>
          </div>

          <code className="deep-link">{nfcDeepLink}</code>
        </div>
      </section>

      <section className="artifact-grid">
        <div className="artifact-grid__main">
          <article className="artifact-note" data-reveal>
            <p className="eyebrow">装置说明</p>
            <div className="artifact-note__list">
              <div className="artifact-note__item">
                <strong>海报负责吸引停留，识别图负责保证稳定追踪</strong>
                <p>前端会把两类素材拆开呈现，避免观众把视觉海报误认为实际扫描目标。</p>
              </div>
              <div className="artifact-note__item">
                <strong>当前入口来源：{getLaunchSourceLabel(launchContext.source)}</strong>
                <p>后续接入真实硬件后，页面仍可根据来源决定默认启动方式与提示文案。</p>
              </div>
              <div className="artifact-note__item">
                <strong>当前体验支持自动进入与手动浏览两条路径</strong>
                <p>扫码或 NFC 默认直达体验页，手动浏览则保留展签说明，适合展陈与讲解并行使用。</p>
              </div>
            </div>
          </article>

          <article
            className="card artifact-catalog"
            data-reveal
            style={{ '--delay-index': '1' } as CSSProperties}
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">识别图预览</p>
                <h3>给观众看的追踪目标</h3>
              </div>
            </div>
            <div className="artifact-meta__preview">
              <p>正式接入时，请把当前占位识别图替换成纹理更丰富、对比更稳定的目标图与对应 `.mind` 文件。</p>
              <img className="marker-image" src={entry.targetImage} alt={`${entry.title} 识别图`} />
            </div>
          </article>
        </div>

        <aside className="artifact-grid__side">
          <article className="card artifact-utility" data-reveal>
            <div className="section-heading">
              <div>
                <p className="eyebrow">扫码入口</p>
                <h3>面向 iPhone 或轻量触达</h3>
              </div>
            </div>
            <div className="artifact-utility__stack">
              <p>同一条目既可以写入 NFC，也可以直接生成二维码入口，方便在不同展陈介质中共用。</p>
              <QrPreview label={`${entry.title} 二维码入口`} value={qrDeepLink} />
            </div>
          </article>

          <article
            className="artifact-catalog"
            data-reveal
            style={{ '--delay-index': '1' } as CSSProperties}
          >
            <p className="eyebrow">当前配置</p>
            <div className="artifact-catalog__list">
              <div className="artifact-catalog__item">
                <strong>音频层</strong>
                <p>{entry.audioStems.length} 条分轨已按声部组织，可继续扩展空间音频与静音/独奏控制。</p>
              </div>
              <div className="artifact-catalog__item">
                <strong>知识层</strong>
                <p>{entry.knowledgeCards.length} 张知识卡会同时服务侧栏说明与 AR 热点映射。</p>
              </div>
              <div className="artifact-catalog__item">
                <strong>启动层</strong>
                <p>默认保留手动进入、扫码自动进入与 NFC 自动进入三条路径，不改动现有查询参数语义。</p>
              </div>
            </div>
            <Link className="button" to={buildExperiencePath(entry.id)}>
              <ArrowRight size={18} weight="regular" />
              <span>继续进入体验页</span>
            </Link>
          </article>

          {tutorialSpotlight ? (
            <article
              className="card artifact-learning"
              data-reveal
              style={{ '--delay-index': '2' } as CSSProperties}
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">导学入口</p>
                  <h3>先补一点节奏与乐理，再回来看这个小人。</h3>
                </div>
                <BookOpenText size={18} weight="regular" />
              </div>
              <div className="artifact-learning__copy">
                <small className="catalog-label">{tutorialSpotlight.spotlight.label}</small>
                <strong>{tutorialSpotlight.spotlight.title}</strong>
                <p>{tutorialSpotlight.spotlight.summary}</p>
              </div>
              <div className="hero__actions">
                <Link
                  className="button"
                  to={buildTutorialPath(
                    tutorialSpotlight.module.id,
                    tutorialSpotlight.spotlight.chapterId,
                  )}
                >
                  <span>查看对应章节</span>
                </Link>
                <Link
                  className="button--ghost"
                  to={buildTutorialPath(tutorialSpotlight.module.id)}
                >
                  <span>打开完整导学</span>
                </Link>
              </div>
            </article>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
