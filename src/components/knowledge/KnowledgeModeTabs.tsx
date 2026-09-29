import { Link, useLocation } from 'react-router-dom';

export function KnowledgeModeTabs() {
  const { pathname } = useLocation();
  const theoryActive = pathname.startsWith('/knowledge/theory/');

  return (
    <nav className="knowledge-mode-tabs" aria-label="知识分类">
      <Link
        className={!theoryActive ? 'knowledge-mode-tabs__item is-active' : 'knowledge-mode-tabs__item'}
        aria-current={!theoryActive ? 'page' : undefined}
        to="/knowledge/instruments"
      >乐器</Link>
      <Link
        className={theoryActive ? 'knowledge-mode-tabs__item is-active' : 'knowledge-mode-tabs__item'}
        aria-current={theoryActive ? 'page' : undefined}
        to="/knowledge/theory/01"
      >乐理</Link>
    </nav>
  );
}
