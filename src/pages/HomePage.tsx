import {
  ArrowRight,
  BookOpenText,
  Broadcast,
  CardsThree,
  ProjectorScreenChart,
  QrCode,
  Waveform,
} from '@phosphor-icons/react';
import type { CSSProperties } from 'react';
import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { EntryCard } from '../components/EntryCard';
import {
  buildEntryPath,
  buildExperiencePath,
  getAllEntries,
} from '../lib/entries';
import { parseLaunchSearchParams } from '../lib/launch';
import { buildTutorialPath, getTutorialModule } from '../lib/tutorials';

export function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const launchContext = useMemo(
    () => parseLaunchSearchParams(searchParams),
    [searchParams],
  );
  const entries = useMemo(() => getAllEntries(), []);
  const learnModule = useMemo(() => getTutorialModule('fundamentals'), []);
  const learnSpotlights = useMemo(
    () =>
      learnModule?.entrySpotlights
        .map((spotlight) => {
          const entry = entries.find((item) => item.id === spotlight.entryId);

          if (!entry) {
            return null;
          }

          return {
            spotlight,
            entry,
          };
        })
        .filter((item) => item !== null) ?? [],
    [entries, learnModule],
  );

  useEffect(() => {
    if (launchContext.entryId) {
      navigate(
        launchContext.autostart
          ? buildExperiencePath(launchContext.entryId, {
              source: launchContext.source,
              autostart: launchContext.autostart,
            })
          : buildEntryPath(launchContext.entryId),
        { replace: true },
      );
      return;
    }

    const shouldEnterDemo =
      searchParams.has('lineup') ||
      searchParams.get('source') === 'nfc' ||
      searchParams.get('autostart') === '1';

    if (!shouldEnterDemo) {
      return;
    }

    navigate(`/demo/base?${searchParams.toString()}`, { replace: true });
  }, [launchContext, navigate, searchParams]);

  return (
    <div className="page home-page">
      <section className="home-hero" id="overview">
        <div className="home-hero__content" data-reveal>
          <p className="eyebrow">校园古典音乐美育展陈</p>
          <h1>让演奏家、底座与 AR 舞台组成一条能被看见的音乐入口。</h1>
          <p className="home-hero__summary">
            这套前端不是单纯的 WebAR 原型，而是一层面向开放日与校内展陈的数字导览壳层。观众可以从海报、二维码或 NFC 进入，顺着“落子识别、舞台生成、分轨聆听、知识导览”的路径理解项目价值。
          </p>
          <div className="hero__actions">
            <Link className="button" to="/demo/base">
              <ProjectorScreenChart size={18} weight="regular" />
              <span>进入底座演示</span>
            </Link>
            <a className="button--ghost" href="#entries">
              <CardsThree size={18} weight="regular" />
              <span>查看展陈条目</span>
            </a>
          </div>
        </div>

        <aside
          className="home-ledger"
          data-reveal
          style={{ '--delay-index': '1' } as CSSProperties}
        >
          <p className="eyebrow">导览板</p>
          <div className="home-ledger__list">
            <div className="home-ledger__item">
              <strong>当前展线由三个条目与一个底座 Demo 组成</strong>
              <p>单乐器入口负责建立认识，全编制舞台负责展示“可听见的编配结构”。</p>
            </div>
            <div className="home-ledger__item">
              <strong>统一入口支持 NFC、二维码与手动浏览</strong>
              <p>保留查询参数与自动启动逻辑，便于接入实体底座、海报与开放日现场导览。</p>
            </div>
            <div className="home-ledger__item">
              <strong>当前核心曲目为《睡美人圆舞曲》分轨演示</strong>
              <p>页面已预留分轨、场景与知识卡替换位，后续可替换成正式素材。</p>
            </div>
          </div>
        </aside>
      </section>

      <section className="home-route" id="journey">
        <article className="curation-note" data-reveal>
          <p className="eyebrow">体验路径</p>
          <div className="curation-note__list">
            <div className="curation-note__item">
              <strong>先看到入口，再理解它为何值得停留</strong>
              <p>首页负责讲清楚这是一个校园美育体验，不让用户直接掉进技术术语与参数。</p>
            </div>
            <div className="curation-note__item">
              <strong>展签页像实体装置旁的说明牌</strong>
              <p>海报、识别图、二维码与 NFC 链接分开讲清，降低首次体验门槛。</p>
            </div>
            <div className="curation-note__item">
              <strong>深色舞台只承担沉浸，不承担全部叙事</strong>
              <p>外层仍是浅色展陈壳层，用户不会在信息与控制之间迷路。</p>
            </div>
          </div>
        </article>

        <div
          className="home-route__map"
          data-reveal
          style={{ '--delay-index': '1' } as CSSProperties}
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">参观流程</p>
              <h2>从入口装置到音乐舞台，页面顺着现场动线展开。</h2>
            </div>
          </div>
          <div className="route-grid">
            <article className="route-card">
              <QrCode size={18} weight="regular" />
              <strong>入口触发</strong>
              <p>海报二维码与 NFC 深链进入同一条目，减少线下装置与线上页面的割裂感。</p>
            </article>
            <article className="route-card">
              <Broadcast size={18} weight="regular" />
              <strong>舞台生成</strong>
              <p>进入条目后可以继续打开 AR 场景，也可以在不支持相机时自动降级到 2D 预览。</p>
            </article>
            <article className="route-card">
              <Waveform size={18} weight="regular" />
              <strong>分轨聆听</strong>
              <p>观众能立刻感受到“少一个声部会发生什么”，这是最适合做成交互的美育知识点。</p>
            </article>
            <article className="route-card">
              <CardsThree size={18} weight="regular" />
              <strong>知识导览</strong>
              <p>知识卡和数字名片不只是补充说明，而是把校园叙事与乐理内容收拢成策展说明栏。</p>
            </article>
          </div>
        </div>
      </section>

      {learnModule ? (
        <section className="home-learn" id="learn">
          <div className="home-learn__hero" data-reveal>
            <div>
              <p className="eyebrow">数字导学层</p>
              <h2>{learnModule.homeTitle}</h2>
              <p>{learnModule.homeSummary}</p>
            </div>
            <div className="home-learn__note">
              <BookOpenText size={20} weight="regular" />
              <p>
                教程不是另一套脱离实体的课程，而是帮观众先听懂现有乐器小人和底座示例为什么值得继续看下去。
              </p>
            </div>
            <div className="hero__actions">
              <Link className="button" to={buildTutorialPath(learnModule.id)}>
                <BookOpenText size={18} weight="regular" />
                <span>进入节奏与乐理入门</span>
              </Link>
              <Link className="button--ghost" to="/demo/base">
                <ProjectorScreenChart size={18} weight="regular" />
                <span>先看底座 Demo</span>
              </Link>
            </div>
          </div>

          <div
            className="home-learn__grid"
            data-reveal
            style={{ '--delay-index': '1' } as CSSProperties}
          >
            {learnSpotlights.map(({ spotlight, entry }) => (
              <article className="home-learn__card" key={entry.id}>
                <img src={entry.posterImage} alt={`${entry.title} 海报`} />
                <div className="home-learn__card-copy">
                  <small className="catalog-label">{spotlight.label}</small>
                  <strong>{spotlight.title}</strong>
                  <p>{spotlight.summary}</p>
                </div>
                <div className="home-learn__card-actions">
                  <Link
                    className="button--ghost"
                    to={buildTutorialPath(learnModule.id, spotlight.chapterId)}
                  >
                    对应章节
                  </Link>
                  <Link className="button--quiet" to={buildEntryPath(entry.id)}>
                    查看条目
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="home-entries" id="entries">
        <div className="home-entries__head" data-reveal>
          <div>
            <p className="eyebrow">展陈条目</p>
            <h2>条目页负责把每一种入口都说清楚，再把观众交给舞台。</h2>
            <p>
              目前三组条目分别承担“单乐器导览、木管入口、全编制舞台”的不同角色，页面结构保持统一，便于后续继续扩展。
            </p>
          </div>
          <article className="story-card">
            <small className="catalog-label">策展提示</small>
            <strong>入口与识别图逻辑分离</strong>
            <p>
              海报更偏视觉展示，识别图优先保证追踪稳定；前端会把这两类信息分别放进不同区域，避免观众误解。
            </p>
          </article>
        </div>

        <div className="entry-grid">
          {entries.map((entry, index) => (
            <EntryCard entry={entry} key={entry.id} revealIndex={index} />
          ))}
        </div>
      </section>

      <section className="home-demo-band" id="demo-entry" data-reveal>
        <div className="home-demo-band__content">
          <p className="eyebrow">底座 Demo</p>
          <h2>如果只看一个页面，应该先看底座演示页。</h2>
          <p>
            它集中展示了“12 位演奏家 + 智能底座 + 同步分轨播放 + 场景切换 + 数字名片”的完整联动，是开放日、汇报和试点沟通时最有说服力的一段。
          </p>
          <div className="hero__actions">
            <Link className="button" to="/demo/base">
              <ArrowRight size={18} weight="regular" />
              <span>直接进入底座演示</span>
            </Link>
          </div>
        </div>
        <aside className="home-demo-band__aside">
          <div className="metric-grid">
            <div className="metric-chip">
              <small>落子结构</small>
              <strong>12 位演奏家 + 1 个智能底座</strong>
            </div>
            <div className="metric-chip">
              <small>演出内容</small>
              <strong>《睡美人圆舞曲》12 条分轨</strong>
            </div>
            <div className="metric-chip">
              <small>展示目标</small>
              <strong>开放日、展厅、课堂演示</strong>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
