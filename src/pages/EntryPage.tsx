import { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { QrPreview } from '../components/QrPreview';
import { buildDeepLink, buildExperiencePath, getEntryById } from '../lib/entries';
import { parseLaunchSearchParams } from '../lib/launch';

export function EntryPage() {
  const { entryId } = useParams();
  const [searchParams] = useSearchParams();
  const entry = getEntryById(entryId);
  const [copied, setCopied] = useState(false);
  const launchContext = useMemo(
    () => parseLaunchSearchParams(searchParams),
    [searchParams],
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
    <div className="page detail-page">
      <section className="detail-hero">
        <img className="detail-hero__poster" src={entry.posterImage} alt={entry.title} />
        <div className="detail-hero__content">
          <p className="eyebrow">{entry.orchestraZone}</p>
          <h1>{entry.title}</h1>
          <p className="lead">{entry.subtitle}</p>
          <p>{entry.description}</p>
          <div className="detail-hero__actions">
            <Link
              className="button"
              to={buildExperiencePath(entry.id, {
                source: launchContext.source,
                autostart: launchContext.autostart,
              })}
            >
              进入 AR 场景
            </Link>
            <button className="button button--ghost" onClick={handleCopy} type="button">
              {copied ? '已复制 NFC 链接' : '复制 NFC / 写卡链接'}
            </button>
          </div>
          <code className="deep-link">{nfcDeepLink}</code>
        </div>
      </section>

      <section className="detail-grid">
        <article className="card">
          <h3>识别图预览</h3>
          <p>
            当前示例仍使用占位识别图。正式接入时，请为每个条目替换成独立的
            `marker` 图片和对应的 `.mind` 或第三方 WebAR 识别资源。
          </p>
          <img className="marker-image" src={entry.targetImage} alt={`${entry.title} 识别图`} />
        </article>

        <article className="card">
          <h3>扫码入口</h3>
          <p>iPhone 或不便写 NFC 的场景，可直接扫码打开同一个条目并自动启动体验。</p>
          <QrPreview label={`${entry.title} 二维码入口`} value={qrDeepLink} />
        </article>

        <article className="card">
          <h3>当前配置</h3>
          <ul className="feature-list">
            <li>{entry.audioStems.length} 条分轨音频，已按声部分组。</li>
            <li>{entry.knowledgeCards.length} 个知识热点，可映射到 AR 热点或侧栏标签。</li>
            <li>
              当前入口来源是
              {launchContext.source === 'nfc'
                ? 'NFC'
                : launchContext.source === 'qr'
                  ? '扫码'
                  : '手动'}
              ，正式接入后可按来源切换默认 WebAR 场景。
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}
