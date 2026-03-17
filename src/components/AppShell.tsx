import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark">HU</span>
          <span>
            <strong>华音拓影</strong>
            <small>NFC + WebAR 校园音乐美育交互系统</small>
          </span>
        </Link>
        <nav className="topnav">
          <a href="#overview">产品概览</a>
          <a href="#modes">玩法模式</a>
          <a href="#demo">体验入口</a>
        </nav>
      </header>
      <main className="page-shell">{children}</main>
      <footer className="footer">
        <span>当前阶段先交付可演示的 Web demo，后续再接真实 NFC、3D 乐手和正式曲库。</span>
      </footer>
    </div>
  );
}
