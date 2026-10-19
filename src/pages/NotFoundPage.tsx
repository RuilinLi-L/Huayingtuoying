import { Link } from 'react-router-dom';
export function NotFoundPage() { return <section className="knowledge-page entry-mobile"><p className="knowledge-eyebrow">404 · LOST IN MUSIC</p><h1>暂时找不到这张展签</h1><p>从首页重新探索，或回到舞台继续聆听。</p><div className="mobile-action-row"><Link className="button" to="/">返回首页</Link><Link className="button--ghost" to="/stage">前往舞台</Link></div></section>; }
