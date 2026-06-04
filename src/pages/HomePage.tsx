import {
  BookOpenText,
  Broadcast,
  CubeFocus,
  Headphones,
  Heart,
  HouseLine,
  List,
  MapPinArea,
  MaskHappy,
  MusicNote,
  MusicNotes,
  MusicNotesSimple,
  Path,
  PersonArmsSpread,
  Play,
  ProjectorScreenChart,
  QrCode,
  Scan,
} from '@phosphor-icons/react';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { instrumentEncyclopedia } from '../data/instrumentEncyclopedia';
import { fixedComposition, musicians } from '../data/orchestraDemo';
import { buildEntryPath, buildExperiencePath } from '../lib/entries';
import { parseLaunchSearchParams } from '../lib/launch';

interface ExhibitCard {
  id: string;
  title: string;
  subtitle: string;
  tone: string;
  to?: string;
  href?: string;
  icon: ReactNode;
  art: ReactNode;
}

const featureCards: ExhibitCard[] = [
  {
    id: 'instrument',
    title: '乐器百科',
    subtitle: '浏览12件乐器',
    tone: 'sage',
    to: '/learn/fundamentals#instrument-encyclopedia',
    icon: <BookOpenText size={28} weight="regular" />,
    art: <MusicNotes size={76} weight="duotone" />,
  },
  {
    id: 'stage',
    title: 'AR舞台',
    subtitle: '观看虚拟演出',
    tone: 'champagne',
    to: '/demo/base',
    icon: <CubeFocus size={28} weight="regular" />,
    art: <MaskHappy size={78} weight="duotone" />,
  },
  {
    id: 'stems',
    title: '分轨试听',
    subtitle: '单独聆听乐器声部',
    tone: 'mist',
    to: '/demo/base',
    icon: <Headphones size={28} weight="regular" />,
    art: <Broadcast size={78} weight="duotone" />,
  },
  {
    id: 'nfc',
    title: 'NFC导览',
    subtitle: '扫描实体展品互动',
    tone: 'stone',
    href: '#route',
    icon: <MapPinArea size={28} weight="regular" />,
    art: <Scan size={78} weight="duotone" />,
  },
];

const recommendationCards = [
  {
    id: 'composition',
    eyebrow: '推荐曲目',
    title: '睡美人圆舞曲',
    subtitle: '当前展览主题',
    to: '/demo/base',
    imageSrc: '/assets/posters/ensemble.svg',
    icon: <Play size={18} weight="fill" />,
  },
  {
    id: 'violin',
    eyebrow: '推荐乐器',
    title: '小提琴',
    subtitle: '乐团灵魂声部',
    to: '/learn/fundamentals#instrument-encyclopedia',
    imageSrc: '/assets/posters/violin.svg',
    icon: <MusicNotesSimple size={18} weight="regular" />,
  },
  {
    id: 'ar',
    eyebrow: '推荐AR场景',
    title: '宫廷舞会',
    subtitle: '沉浸式体验',
    to: '/demo/base',
    imageSrc: '/assets/posters/flute.svg',
    icon: <ProjectorScreenChart size={18} weight="regular" />,
  },
  {
    id: 'score',
    eyebrow: '推荐互动',
    title: '乐谱解析',
    subtitle: '知识探索集',
    to: '/learn/fundamentals',
    icon: <BookOpenText size={18} weight="regular" />,
  },
];

const routeSteps = [
  { label: '入口', hint: '开始参观', icon: <HouseLine size={20} weight="regular" /> },
  { label: '扫码', hint: 'NFC / 二维码', icon: <QrCode size={20} weight="regular" /> },
  { label: 'AR舞台', hint: '观看演出', icon: <CubeFocus size={20} weight="regular" /> },
  { label: '乐器探索', hint: '认识乐器', icon: <MusicNotes size={20} weight="regular" /> },
  { label: '分轨试听', hint: '聆听声部', icon: <Headphones size={20} weight="regular" /> },
  { label: '完成参观', hint: '收藏知识', icon: <Heart size={20} weight="regular" /> },
];

const bottomNavItems = [
  { label: '首页', href: '#overview', icon: <HouseLine size={22} weight="regular" /> },
  { label: '舞台', href: '#stage', icon: <ProjectorScreenChart size={22} weight="regular" /> },
  { label: '乐器', href: '#instruments', icon: <MusicNotesSimple size={22} weight="regular" /> },
  { label: '导览', href: '#route', icon: <MapPinArea size={22} weight="regular" /> },
  { label: '我的收藏', href: '#favorites', icon: <Heart size={22} weight="regular" /> },
];

export function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const launchContext = useMemo(
    () => parseLaunchSearchParams(searchParams),
    [searchParams],
  );
  const orchestraSeats = useMemo(() => {
    const musicianMap = new Map(musicians.map((musician) => [musician.id, musician]));

    return instrumentEncyclopedia.map((instrument) => {
      const musician = musicianMap.get(instrument.id);

      return {
        ...instrument,
        position: musician?.position ?? { x: 50, y: 50, depth: 1 },
        roleSummary: musician?.roleSummary ?? instrument.orchestraRole,
      };
    });
  }, []);
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
    <div className="page home-page mobile-exhibit">
      <header className="mobile-exhibit-topbar" aria-label="展厅导航">
        <Link className="mobile-exhibit-brand" to="/" aria-label="古典音乐数字展厅">
          <span className="mobile-exhibit-brand__mark" aria-hidden="true">
            <MusicNotesSimple size={21} weight="regular" />
          </span>
          <span>Music Exhibition</span>
        </Link>
        <strong>古典音乐数字展厅</strong>
        <button className="mobile-exhibit-menu" type="button" aria-label="打开菜单">
          <List size={22} weight="bold" />
        </button>
      </header>

      <section className="mobile-exhibit-hero" id="overview">
        <div className="mobile-exhibit-hero__space" aria-hidden="true">
          <span className="mobile-exhibit-arch mobile-exhibit-arch--left" />
          <span className="mobile-exhibit-arch mobile-exhibit-arch--right" />
          <span className="mobile-exhibit-wave mobile-exhibit-wave--one" />
          <span className="mobile-exhibit-wave mobile-exhibit-wave--two" />
          <MusicNote className="mobile-exhibit-note mobile-exhibit-note--one" size={24} />
          <MusicNote className="mobile-exhibit-note mobile-exhibit-note--two" size={18} />
          <MusicNote className="mobile-exhibit-note mobile-exhibit-note--three" size={20} />
        </div>

        <div className="mobile-exhibit-hero__content" data-reveal>
          <div className="mobile-exhibit-kicker">
            <span>当前展览</span>
          </div>
          <div className="mobile-exhibit-stage" id="stage" aria-hidden="true">
            <span className="mobile-exhibit-stage__ring mobile-exhibit-stage__ring--outer" />
            <span className="mobile-exhibit-stage__ring mobile-exhibit-stage__ring--middle" />
            <span className="mobile-exhibit-stage__ring mobile-exhibit-stage__ring--inner" />
            <span className="mobile-exhibit-stage__conductor">
              <PersonArmsSpread size={34} weight="regular" />
            </span>
          </div>
          <div className="mobile-exhibit-title">
            <small>{fixedComposition.subtitle}</small>
            <h1>{fixedComposition.title}</h1>
            <p>The Sleeping Beauty Waltz</p>
          </div>

          <div className="mobile-exhibit-proof" aria-label="展览能力">
            <span>
              <MusicNotes size={17} weight="regular" />
              {fixedComposition.stems.length}件乐器参与
            </span>
            <span>
              <CubeFocus size={17} weight="regular" />
              AR互动体验
            </span>
            <span>
              <Broadcast size={17} weight="regular" />
              NFC导览支持
            </span>
          </div>

          <Link className="mobile-exhibit-primary" to="/demo/base">
            <span>进入数字舞台</span>
            <Play size={19} weight="fill" />
          </Link>
        </div>
      </section>

      <main className="mobile-exhibit-main">
        <section className="mobile-exhibit-section" id="instruments" aria-label="功能大厅">
          <div className="mobile-exhibit-feature-grid">
            {featureCards.map((card) => {
              const className = `mobile-feature-card mobile-feature-card--${card.tone}`;
              const body = (
                <>
                  <span className="mobile-feature-card__icon">{card.icon}</span>
                  <span className="mobile-feature-card__copy">
                    <strong>{card.title}</strong>
                    <small>{card.subtitle}</small>
                  </span>
                  <span className="mobile-feature-card__art" aria-hidden="true">
                    {card.art}
                  </span>
                  <span className="mobile-feature-card__arrow" aria-hidden="true">
                    <Path size={16} weight="regular" />
                  </span>
                </>
              );

              return card.to ? (
                <Link className={className} key={card.id} to={card.to}>
                  {body}
                </Link>
              ) : (
                <a className={className} href={card.href} key={card.id}>
                  {body}
                </a>
              );
            })}
          </div>
        </section>

        <section className="mobile-exhibit-section mobile-orchestra" aria-labelledby="orchestra-title">
          <div className="mobile-section-head">
            <div>
              <h2 id="orchestra-title">乐团总览</h2>
              <p>点击乐器，探索更多</p>
            </div>
            <Link to="/learn/fundamentals#instrument-encyclopedia">查看全部乐器</Link>
          </div>

          <div className="mobile-orchestra-map" aria-label="交响乐团座位图">
            <span className="mobile-orchestra-map__halo" aria-hidden="true" />
            <Link className="mobile-conductor" to="/demo/base">
              <PersonArmsSpread size={28} weight="regular" />
              <span>指挥</span>
            </Link>
            {orchestraSeats.map((instrument) => (
              <Link
                className="mobile-orchestra-seat"
                key={instrument.id}
                style={
                  {
                    '--seat-x': `${instrument.position.x}%`,
                    '--seat-y': `${instrument.position.y}%`,
                    '--seat-color': instrument.color,
                  } as CSSProperties
                }
                to="/learn/fundamentals#instrument-encyclopedia"
                aria-label={`${instrument.name}百科`}
              >
                <span className="mobile-orchestra-seat__dot">
                  {instrument.shortLabel}
                </span>
                <span className="mobile-orchestra-seat__label">{instrument.name}</span>
              </Link>
            ))}
          </div>
        </section>

        <section
          className="mobile-exhibit-section mobile-recommend"
          id="favorites"
          aria-labelledby="recommend-title"
        >
          <div className="mobile-section-head">
            <div>
              <h2 id="recommend-title">推荐体验</h2>
              <p>从当前展览继续探索</p>
            </div>
            <Link to="/demo/base">更多推荐</Link>
          </div>

          <div className="mobile-recommend-rail" aria-label="推荐体验列表">
            {recommendationCards.map((card) => (
              <Link className="mobile-recommend-card" key={card.id} to={card.to}>
                {card.imageSrc ? (
                  <img
                    className="mobile-recommend-card__poster"
                    src={card.imageSrc}
                    alt=""
                    aria-hidden="true"
                  />
                ) : null}
                <span className="mobile-recommend-card__overlay" aria-hidden="true" />
                <span className="mobile-recommend-card__badge">{card.eyebrow}</span>
                <span className="mobile-recommend-card__copy">
                  <strong>{card.title}</strong>
                  <small>{card.subtitle}</small>
                </span>
                <span className="mobile-recommend-card__play" aria-hidden="true">
                  {card.icon}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section
          className="mobile-exhibit-section mobile-route"
          id="route"
          aria-labelledby="route-title"
        >
          <div className="mobile-section-head">
            <div>
              <h2 id="route-title">展览路线</h2>
              <p>一眼理解完整流程</p>
            </div>
            <a href="#overview">了解完整流程</a>
          </div>

          <div className="mobile-route-map" aria-label="展览路线图">
            {routeSteps.map((step, index) => (
              <div
                className="mobile-route-step"
                key={step.label}
                style={{ '--step-index': index } as CSSProperties}
              >
                <span className="mobile-route-step__icon">{step.icon}</span>
                <strong>{step.label}</strong>
                <small>{step.hint}</small>
              </div>
            ))}
          </div>
        </section>
      </main>

      <nav className="mobile-exhibit-bottom-nav" aria-label="底部导航">
        {bottomNavItems.map((item, index) => (
          <a
            className={
              index === 0
                ? 'mobile-exhibit-bottom-nav__item mobile-exhibit-bottom-nav__item--active'
                : 'mobile-exhibit-bottom-nav__item'
            }
            href={item.href}
            key={item.label}
          >
            {item.icon}
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
