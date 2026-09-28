import { BookOpenText, House, MagicWand, ProjectorScreenChart } from '@phosphor-icons/react';
import { NavLink, useLocation } from 'react-router-dom';

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
        const active = to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
        return (
          <NavLink
            className={active ? 'mobile-bottom-nav__item mobile-bottom-nav__item--active' : 'mobile-bottom-nav__item'}
            to={to}
            key={to}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={25} weight={active ? 'fill' : 'regular'} />
            <span>{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
