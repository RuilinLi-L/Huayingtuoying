import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';

export function MobileShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isTheoryPage = location.pathname.startsWith('/knowledge/theory/');
  const section = location.pathname === '/'
    ? 'home'
    : location.pathname.startsWith('/stage')
      ? 'stage'
      : location.pathname.startsWith('/knowledge')
        ? 'knowledge'
        : location.pathname.startsWith('/compose') ? 'compose' : 'knowledge';

  return (
    <div className={`mobile-shell mobile-shell--${section}`}>
      <TopBar />
      <main className="mobile-shell__main" key={isTheoryPage ? 'theory' : location.pathname}>{children}</main>
      {!isTheoryPage && <BottomNav />}
    </div>
  );
}
