import { useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { QrPreview } from '../components/QrPreview';
import { buildDeepLink, buildExperiencePath, getEntryById, getAllEntries } from '../lib/entries';
import { parseLaunchSearchParams } from '../lib/launch';
import { stagePath } from '../lib/navigation';

export function EntryPage() {
  const { entryId } = useParams(),
    [params] = useSearchParams(),
    [copy, setCopy] = useState('');
  const entry = getEntryById(entryId);
  if (!entry) return <Navigate replace to="/not-found" />;
  const launch = parseLaunchSearchParams(params);
  const nfc = buildDeepLink(entry.id, location.origin, {
    ...launch,
    source: 'nfc',
    autostart: true,
  });
  const qr = buildDeepLink(entry.id, location.origin, { ...launch, source: 'qr', autostart: true });
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(nfc);
      setCopy('已复制 NFC 链接');
    } catch {
      setCopy('复制失败，请长按下方链接复制');
    }
  };
  return (
    <article className="knowledge-page entry-mobile">
      <header>
        <p className="knowledge-eyebrow">MEET THE ORCHESTRA · {entry.orchestraZone}</p>
        <h1>{entry.title}</h1>
        <p>{entry.subtitle}</p>
      </header>
      <img className="entry-mobile__poster" src={entry.posterImage} alt={entry.title} />
      <p>{entry.description}</p>
      <div className="mobile-action-row">
        <Link className="button" to={buildExperiencePath(entry.id, launch)}>
          {entry.id === 'oboe-player' ? '打开实景 AR' : '进入识别卡体验'}
        </Link>
        <Link className="button--ghost" to={stagePath('orchestra', entry.id, params.toString())}>
          在舞台聆听
        </Link>
      </div>
      <section className="entry-mobile__card">
        <h2>扫码与 NFC 入口</h2>
        <p>分享这张展签，继续同一段音乐探索。</p>
        <QrPreview label={`${entry.title}二维码`} value={qr} />
        <button className="button--ghost" onClick={() => void copyLink()}>
          复制 NFC 链接
        </button>
        <p role="status">{copy}</p>
        <a className="entry-mobile__url" href={nfc}>
          {nfc}
        </a>
      </section>
      {entry.knowledgeCards.map((card) => (
        <details className="ar-knowledge" key={card.id}>
          <summary>{card.title}</summary>
          <p>{card.summary}</p>
        </details>
      ))}
      <details className="entry-mobile__card">
        <summary>识别卡测试</summary>
        <p>将指定图片放在另一块屏幕或打印在纸上，平放后扫描。</p>
        <img
          className="entry-mobile__marker"
          src={entry.targetImage}
          alt="测试识别图"
          loading="lazy"
        />
        <div className="mobile-action-row">
          <Link className="button--ghost" to={stagePath('image-test', entry.id, params.toString())}>
            打开测试
          </Link>
          <a className="button--ghost" href={entry.targetImage} download="AR测试卡.png">
            下载测试卡
          </a>
        </div>
      </details>
      <nav className="guide-instruments" aria-label="其他展签">
        {getAllEntries()
          .filter((e) => e.id !== entry.id)
          .map((e) => (
            <Link key={e.id} to={`/entry/${e.id}`}>
              {e.title}
            </Link>
          ))}
      </nav>
      <Link className="button--ghost" to="/knowledge/guide">
        完整知识导览
      </Link>
    </article>
  );
}
