import { ArrowLeft, MusicNotes, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const pageNames: Record<string, string> = {
  '/stage': '交响舞台',
  '/knowledge/instruments': '乐器知识',
  '/knowledge/guide': '完整知识导览',
  '/compose': '音乐编创',
};

export function TopBar() {
  const { pathname, search, state } = useLocation();
  const navigate=useNavigate();
  const isAr=pathname==='/stage'&&['ar','image-test'].includes(new URLSearchParams(search).get('view')??'');
  const arParams = new URLSearchParams(search); arParams.set('view', 'ar'); arParams.set('entry', 'oboe-player');
  const stageParams=new URLSearchParams(search);stageParams.set('view','orchestra');stageParams.delete('autostart');
  const [menuOpen, setMenuOpen] = useState(false);
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

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header className={isHome ? 'mobile-topbar mobile-topbar--home' : isStage ? 'mobile-topbar mobile-topbar--stage' : 'mobile-topbar'}>
      <div className="mobile-topbar__row">
        {isHome ? (
          <span className="mobile-topbar__avatar" aria-hidden="true"><MusicNotes size={29} weight="duotone" /></span>
        ) : isAr ? (
          <button className="mobile-topbar__back" aria-label="返回舞台" onClick={()=>state?.stageArEntry?navigate(-1):navigate(`/stage?${stageParams}`,{replace:true})}><ArrowLeft size={24}/></button>
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
          <Link className="mobile-topbar__icon" to={isStage ? `/stage?${arParams}` : '/entry/violin-dialogue'} replace={isAr} state={isStage&&!isAr?{stageArEntry:true}:isAr?state:null} aria-label={isStage ? '打开实景 AR' : '打开展签与扫码入口'}>
            <img src="/assets/ui/home/icon-scan.png" alt="" width="25" height="25" />
          </Link>
          {!isStage ? (
            <button className="mobile-topbar__icon" type="button" aria-label={menuOpen ? '关闭菜单' : '打开菜单'} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
              {menuOpen ? <X size={23} /> : <img src="/assets/ui/home/icon-settings.png" alt="" width="27" height="27" />}
            </button>
          ) : null}
        </div>
      </div>
      {menuOpen ? (
        <div className="mobile-topbar__menu">
          <Link to="/stage" onClick={() => setMenuOpen(false)}>交响舞台</Link>
          <Link to="/knowledge/guide" onClick={() => setMenuOpen(false)}>完整知识导览</Link>
          <Link to="/entry/violin-dialogue" onClick={() => setMenuOpen(false)}>NFC / QR 展签</Link>
        </div>
      ) : null}
    </header>
  );
}
