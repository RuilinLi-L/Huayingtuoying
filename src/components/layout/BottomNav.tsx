import { BookOpenText, House, MagicWand, ProjectorScreenChart } from '@phosphor-icons/react';
import { Link, useLocation } from 'react-router-dom';

const items = [
  { to: '/', label: '首页', icon: House },
  { to: '/stage', label: '舞台', icon: ProjectorScreenChart },
  { to: '/knowledge/instruments', label: '知识', icon: BookOpenText },
  { to: '/compose', label: '编创', icon: MagicWand },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="mobile-bottom-nav" aria-label="主导航">
      {items.map(({ to, label, icon: Icon }) => {
        const active = to === '/'
          ? pathname === '/'
          : to === '/knowledge/instruments'
            ? pathname.startsWith('/knowledge/')
            : pathname === to || pathname.startsWith(`${to}/`);
        return (
          <Link
            className={active ? 'mobile-bottom-nav__item mobile-bottom-nav__item--active' : 'mobile-bottom-nav__item'}
            to={to}
            key={to}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={25} weight={active ? 'fill' : 'regular'} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
