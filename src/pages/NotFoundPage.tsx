import { ArrowLeft } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="page not-found">
      <div className="panel not-found__panel" data-reveal>
        <p className="eyebrow">页面未找到</p>
        <h1>这张展签不在当前导览路径里。</h1>
        <p>
          你可以回到首页重新进入项目总览，或者直接打开底座 Demo 继续查看当前的交互方案与舞台效果。
        </p>
        <div className="hero__actions">
          <Link className="button" to="/">
            <ArrowLeft size={18} weight="regular" />
            <span>返回首页</span>
          </Link>
          <Link className="button--ghost" to="/demo/base">
            <span>进入底座演示</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
