import { ArrowRight, Headphones, MusicNotes } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export function StagePage() {
  return (
    <div className="mobile-feature-page stage-landing">
      <div className="mobile-feature-page__heading">
        <p>IMMERSIVE EXPERIENCE</p>
        <h1>Orchestra</h1>
        <span>把乐团带到眼前，听见每一个声部。</span>
      </div>
      <img className="stage-landing__characters" src="/assets/ui/stage/orchestra-characters.png" alt="交响乐团演奏角色插画" width="365" height="205" />
      <Link className="mobile-feature-page__cta" to="/demo/base">
        <span><MusicNotes size={20} /> 进入交响舞台</span><ArrowRight size={20} />
      </Link>
      <p className="stage-landing__hint">现有舞台保留 NFC 阵容联动、音频分轨及相机体验。</p>
      <div className="stage-landing__sections" aria-label="乐团声部">
        <h2>认识乐团</h2>
        <Link to="/knowledge/instruments?section=strings"><img src="/assets/ui/stage/section-strings.png" alt="弦乐组：小提琴、中提琴、大提琴与低音提琴" width="393" height="204" /></Link>
        <Link to="/knowledge/instruments?section=woodwind"><img src="/assets/ui/stage/section-woodwinds.png" alt="木管组：单簧管、巴松、长笛与双簧管" width="379" height="206" /></Link>
        <Link to="/knowledge/instruments?section=brass"><img src="/assets/ui/stage/section-brass.png" alt="铜管组：小号、圆号、大号与长号" width="393" height="205" /></Link>
      </div>
      <Link className="stage-landing__listen" to="/demo/base"><Headphones size={19} /> 前往分轨试听</Link>
    </div>
  );
}
