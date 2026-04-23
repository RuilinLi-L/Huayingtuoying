import type { ReactNode } from 'react';
import {
  BookOpenText,
  CardsThree,
  Compass,
  HouseLine,
  MusicNotesSimple,
  ProjectorScreenChart,
} from '@phosphor-icons/react';
import { Link, useLocation } from 'react-router-dom';

function getCurrentLabel(pathname: string) {
  if (pathname.startsWith('/entry/')) {
    return '展签入口';
  }

  if (pathname.startsWith('/experience/')) {
    return 'AR 体验';
  }

  if (pathname.startsWith('/demo/base')) {
    return '底座演示';
  }

  if (pathname.startsWith('/learn/')) {
    return '节奏与乐理';
  }

  return '当前页面';
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isHomeRoute = location.pathname === '/' || location.pathname === '/home';
  const isLearnRoute = location.pathname.startsWith('/learn/');
  const isDemoRoute = location.pathname.startsWith('/demo/base');
  const shouldShowCurrentLabel =
    !isHomeRoute && !isLearnRoute && !isDemoRoute;

  return (
    <div className="app-shell">
      <div className="topbar-wrap">
        <header className="topbar">
          <div className="topbar__row">
            <Link className="brand" to="/">
              <span className="brand-mark" aria-hidden="true">
                <MusicNotesSimple size={24} weight="regular" />
              </span>
              <span>
                <strong>华音拓影</strong>
                <small>NFC + WebAR 校园音乐美育交互系统</small>
              </span>
            </Link>
            <div className="topbar__meta">
              <Compass size={16} weight="regular" />
              <span>校园展陈导览版</span>
            </div>
          </div>

          <nav className="topnav" aria-label="主导航">
            {isHomeRoute ? (
              <>
                <a className="topnav__link topnav__link--active" href="#overview">
                  <HouseLine size={16} weight="regular" />
                  <span>项目总览</span>
                </a>
                <a className="topnav__link" href="#learn">
                  <BookOpenText size={16} weight="regular" />
                  <span>节奏与乐理</span>
                </a>
                <a className="topnav__link" href="#entries">
                  <CardsThree size={16} weight="regular" />
                  <span>展陈条目</span>
                </a>
                <a className="topnav__link" href="#demo-entry">
                  <ProjectorScreenChart size={16} weight="regular" />
                  <span>底座演示</span>
                </a>
              </>
            ) : (
              <>
                <Link className="topnav__link" to="/">
                  <HouseLine size={16} weight="regular" />
                  <span>返回总览</span>
                </Link>
                <Link
                  className={isLearnRoute ? 'topnav__link topnav__link--active' : 'topnav__link'}
                  to="/learn/fundamentals"
                >
                  <BookOpenText size={16} weight="regular" />
                  <span>节奏与乐理</span>
                </Link>
                <Link
                  className={
                    isDemoRoute
                      ? 'topnav__link topnav__link--active'
                      : 'topnav__link'
                  }
                  to="/demo/base"
                >
                  <ProjectorScreenChart size={16} weight="regular" />
                  <span>底座演示</span>
                </Link>
                {shouldShowCurrentLabel ? (
                  <span className="topnav__link topnav__link--active">
                    <Compass size={16} weight="regular" />
                    <span>{getCurrentLabel(location.pathname)}</span>
                  </span>
                ) : null}
              </>
            )}
          </nav>
        </header>
      </div>

      <main className="page-shell">{children}</main>

      <footer className="footer">
        <p className="footer__note">
          当前版本聚焦校内展陈与开放日演示，保留 NFC、二维码、AR 启动、舞台联动与知识卡结构，便于后续替换正式素材与真实硬件。
        </p>
        <span className="footer__stamp">
          <MusicNotesSimple size={16} weight="regular" />
          <span>一期前端展陈壳层</span>
        </span>
      </footer>
    </div>
  );
}
