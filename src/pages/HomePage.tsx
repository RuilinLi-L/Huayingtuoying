import {
  ArrowRight,
  BookOpenText,
  Broadcast,
  CardsThree,
  MagicWand,
  MicrophoneStage,
  MusicNotesPlus,
  ProjectorScreenChart,
  QrCode,
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
  const learnConceptCount = useMemo(
    () =>
      learnModule?.chapters.reduce(
        (count, chapter) => count + chapter.concepts.length,
        0,
      ) ?? 0,
    [learnModule],
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

      <section className="home-route home-route--compact" id="journey">
        <div className="home-route__intro" data-reveal>
          <p className="eyebrow">参观流程</p>
          <h2>保留三步主线：进入条目、打开舞台、回到底座。</h2>
          <p>
            首页只负责帮观众建立方向感。更细的节奏、拍号和乐理说明会放到独立导学入口，避免和项目总览挤在一起。
          </p>
        </div>

        <div
          className="route-flow"
          data-reveal
          style={{ '--delay-index': '1' } as CSSProperties}
        >
          <article className="route-step">
            <span className="route-step__icon" aria-hidden="true">
              <QrCode size={20} weight="regular" />
            </span>
            <small>01</small>
            <strong>扫码或 NFC 进入条目</strong>
            <p>每个实体入口先讲清对应乐器、识别图和体验方式。</p>
          </article>
          <article className="route-step">
            <span className="route-step__icon" aria-hidden="true">
              <Broadcast size={20} weight="regular" />
            </span>
            <small>02</small>
            <strong>进入 AR 或 2D 舞台</strong>
            <p>设备支持时打开相机，不支持时保留可演示的降级体验。</p>
          </article>
          <article className="route-step">
            <span className="route-step__icon" aria-hidden="true">
              <ProjectorScreenChart size={20} weight="regular" />
            </span>
            <small>03</small>
            <strong>到底座里听完整结构</strong>
            <p>把分轨、场景切换和知识卡集中到最有说服力的演示页。</p>
          </article>
        </div>
      </section>

      {learnModule ? (
        <section className="home-learn home-learn-gateway" id="learn" data-reveal>
          <div className="home-learn-gateway__copy">
            <div>
              <p className="eyebrow">独立导学入口</p>
              <h2>节奏与乐理入门单独进入，首页不再堆知识卡。</h2>
              <p>{learnModule.homeSummary}</p>
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

          <aside className="home-learn-gateway__panel">
            <div className="home-learn-gateway__panel-head">
              <BookOpenText size={24} weight="regular" />
              <div>
                <strong>入门内容已移到独立页面</strong>
                <p>从这里进入后再展开章节、概念和实体例子。</p>
              </div>
            </div>
            <div className="home-learn-gateway__stats" aria-label="导学内容概览">
              <span>
                <strong>{learnModule.chapters.length}</strong>
                <small>章路径</small>
              </span>
              <span>
                <strong>{learnConceptCount}</strong>
                <small>个概念</small>
              </span>
              <span>
                <strong>{learnModule.entrySpotlights.length}</strong>
                <small>个入口</small>
              </span>
            </div>
          </aside>
        </section>
      ) : null}

      <section className="home-compose-gateway" id="compose" data-reveal>
        <div className="home-compose-gateway__copy">
          <p className="eyebrow">音乐编创</p>
          <h2>把观众自己的哼唱动机，变成一次可听见的编曲实验。</h2>
          <p>
            这个入口负责连接“我听懂了什么”和“我能不能自己试着创作”。用户录入一段旋律，再用 prompt 约定风格、乐器与情绪，由 AI 生成可试听的编曲草图。
          </p>
          <div className="hero__actions">
            <Link className="button" to="/compose">
              <MagicWand size={18} weight="regular" />
              <span>进入音乐编创</span>
            </Link>
            <Link className="button--ghost" to={buildTutorialPath('fundamentals')}>
              <BookOpenText size={18} weight="regular" />
              <span>先补节奏与乐理</span>
            </Link>
          </div>
        </div>

        <aside className="home-compose-gateway__panel">
          <div className="home-compose-gateway__panel-head">
            <MicrophoneStage size={26} weight="regular" />
            <div>
              <strong>哼唱动机 + Prompt + AI 编曲</strong>
              <p>第一版聚焦即时生成，不做作品库和账号系统，适合开放日现场演示。</p>
            </div>
          </div>
          <div className="home-compose-gateway__steps" aria-label="音乐编创流程">
            <span>
              <MicrophoneStage size={18} weight="regular" />
              <strong>录入</strong>
            </span>
            <span>
              <MusicNotesPlus size={18} weight="regular" />
              <strong>描述</strong>
            </span>
            <span>
              <MagicWand size={18} weight="regular" />
              <strong>生成</strong>
            </span>
          </div>
        </aside>
      </section>

      <section className="home-entries" id="entries">
        <div className="home-entries__head" data-reveal>
          <div>
            <p className="eyebrow">展陈条目</p>
            <h2>条目页负责把每一种入口都说清楚，再把观众交给舞台。</h2>
            <p>
              目前三组条目分别承担“单乐器导览、木管入口、全编制舞台”的不同角色，页面结构保持统一，便于后续继续扩展。
            </p>
          </div>
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
