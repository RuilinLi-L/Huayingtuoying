import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';

export function MobileShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const mainRef = useRef<HTMLElement>(null);
  const previous = useRef({ path: location.pathname, historyIndex: Number(window.history.state?.idx ?? 0) });
  useLayoutEffect(() => {
    const prior = previous.current;
    const path = location.pathname;
    const historyIndex = Number(window.history.state?.idx ?? 0);
    previous.current = { path, historyIndex };
    // Query-only classification changes own their animation; direct loads do
    // not need a second entrance animation around the entire page.
    if (prior.path === path) return;
    window.scrollTo(0, 0);
    // Chapters animate their own content and keep the fixed dial alive.
    if (path.startsWith('/knowledge/theory/') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const backward = (navigationType === 'POP' && historyIndex < prior.historyIndex)
      || path === '/'
      || (prior.path.startsWith('/knowledge/instruments/') && path === '/knowledge/instruments');
    const element = mainRef.current;
    if (!element) return;
    element.dataset.motionDirection = backward ? 'backward' : 'forward';
    const animation = element.animate([
      { opacity: 0.25, transform: `translateX(${backward ? -28 : 28}px)` },
      { opacity: 1, transform: 'translateX(0)' },
    ], { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stopMotion = () => { if (motion.matches) animation.cancel(); };
    motion.addEventListener('change', stopMotion);
    return () => { animation.cancel(); motion.removeEventListener('change', stopMotion); };
  }, [location.pathname, navigationType]);
  const section = location.pathname === '/'
    ? 'home'
    : location.pathname.startsWith('/stage')
      ? 'stage'
      : location.pathname.startsWith('/knowledge')
        ? 'knowledge'
        : 'compose';

  return (
    <div className={`mobile-shell mobile-shell--${section}`}>
      <TopBar />
      <main className="mobile-shell__main" ref={mainRef}>{children}</main>
      <BottomNav />
    </div>
  );
}
