import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="page not-found">
      <div className="card">
        <h1>页面不存在</h1>
        <p>请返回首页重新进入产品概览，或直接打开底座 demo 页面继续查看当前交互方案。</p>
        <Link className="button" to="/">
          返回首页
        </Link>
      </div>
    </div>
  );
}
