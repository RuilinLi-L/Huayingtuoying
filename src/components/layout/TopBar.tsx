import { ArrowLeft, MusicNotes, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const pageNames: Record<string, string> = {
  '/stage': '交响舞台',
  '/knowledge/instruments': '乐器知识',
  '/compose': '音乐编创',
};

export function TopBar() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const isHome = pathname === '/';
  const date = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: 'numeric', day: 'numeric',
  }).format(now);
  const time = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now);
  const title = pathname.startsWith('/knowledge/instruments/')
    ? '乐器知识'
    : pageNames[pathname] ?? '华音拓影';

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header className={isHome ? 'mobile-topbar mobile-topbar--home' : 'mobile-topbar'}>
      <div className="mobile-topbar__status" aria-hidden="true">
        <span>{time}</span>
        <span className="mobile-topbar__signal">▮▮▮ <span>◕</span> ▰</span>
      </div>
      <div className="mobile-topbar__row">
        {isHome ? (
          <span className="mobile-topbar__avatar" aria-hidden="true"><MusicNotes size={29} weight="duotone" /></span>
        ) : (
          <Link className="mobile-topbar__back" to="/" aria-label="返回首页"><ArrowLeft size={24} /></Link>
        )}
        <div className="mobile-topbar__identity">
          <strong>{isHome ? '华音拓影' : title}</strong>
          <small>{isHome ? date : '聆听 · 探索 · 创造'}</small>
        </div>
        <div className="mobile-topbar__actions">
          <Link className="mobile-topbar__icon" to="/entry/violin-dialogue" aria-label="打开展签与扫码入口">
            <img src="/assets/ui/home/icon-scan.png" alt="" width="25" height="25" />
          </Link>
          <button className="mobile-topbar__icon" type="button" aria-label={menuOpen ? '关闭菜单' : '打开菜单'} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
            {menuOpen ? <X size={23} /> : <img src="/assets/ui/home/icon-settings.png" alt="" width="27" height="27" />}
          </button>
        </div>
      </div>
      {menuOpen ? (
        <div className="mobile-topbar__menu">
          <Link to="/demo/base" onClick={() => setMenuOpen(false)}>交响舞台演示</Link>
          <Link to="/learn/fundamentals" onClick={() => setMenuOpen(false)}>完整知识导览</Link>
          <Link to="/entry/violin-dialogue" onClick={() => setMenuOpen(false)}>NFC / QR 展签</Link>
        </div>
      ) : null}
    </header>
  );
}
