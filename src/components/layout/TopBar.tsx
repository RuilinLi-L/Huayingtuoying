import { ArrowLeft, GearSix, MusicNotes, Scan, X } from '@phosphor-icons/react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const ScanSheet = lazy(() => import('./ScanSheet').then((module) => ({ default: module.ScanSheet })));

const pageNames: Record<string, string> = {
  '/stage': '交响舞台',
  '/knowledge/guide': '完整知识导览',
  '/knowledge/instruments': '乐器知识',
  '/compose': '音乐编创',
};

export function TopBar() {
  const { pathname, key: locationKey } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const scanButtonRef = useRef<HTMLButtonElement>(null);
  const closeScan = () => {
    setScanOpen(false);
    scanButtonRef.current?.focus();
  };
  const isHome = pathname === '/';
  const isStage = pathname === '/stage';
  const date = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: 'numeric', day: 'numeric',
  }).format(new Date());
  const title = pathname.startsWith('/knowledge/instruments/')
    ? '乐器知识'
    : pathname.startsWith('/knowledge/theory/')
      ? '乐理知识'
    : pageNames[pathname] ?? '华音拓影';

  useEffect(() => {
    setMenuOpen(false);
    setScanOpen(false);
  }, [locationKey]);

  return (
    <header className={isHome ? 'mobile-topbar mobile-topbar--home' : isStage ? 'mobile-topbar mobile-topbar--stage' : 'mobile-topbar'}>
      <div className="mobile-topbar__row">
        {isHome ? (
          <span className="mobile-topbar__avatar" aria-hidden="true"><MusicNotes size={29} weight="duotone" /></span>
        ) : (
          <Link className="mobile-topbar__back" to="/" aria-label="返回首页"><ArrowLeft size={24} /></Link>
        )}
        {!isStage ? (
          <div className="mobile-topbar__identity">
            <strong>{isHome ? '华音拓影' : title}</strong>
            <small>{isHome ? date : '聆听 · 探索 · 创造'}</small>
          </div>
        ) : null}
        <div className="mobile-topbar__actions">
          <button ref={scanButtonRef} className="mobile-topbar__icon" type="button" aria-label="扫一扫" aria-haspopup="dialog" onClick={() => { setMenuOpen(false); setScanOpen(true); }}>
            <Scan size={26} weight="bold" />
          </button>
          {!isStage ? (
            <button className="mobile-topbar__icon" type="button" aria-label={menuOpen ? '关闭菜单' : '打开菜单'} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
              {menuOpen ? <X size={23} /> : <GearSix size={27} weight="bold" />}
            </button>
          ) : null}
        </div>
      </div>
      {menuOpen ? (
        <div className="mobile-topbar__menu">
          <Link to="/stage" onClick={() => setMenuOpen(false)}>交响舞台演示</Link>
          <Link to="/knowledge/guide" onClick={() => setMenuOpen(false)}>完整知识导览</Link>
          <button type="button" onClick={() => { setMenuOpen(false); setScanOpen(true); }}>扫一扫展签</button>
        </div>
      ) : null}
      {scanOpen ? <Suspense fallback={null}><ScanSheet onClose={closeScan} /></Suspense> : null}
    </header>
  );
}
