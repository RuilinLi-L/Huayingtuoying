import {
  MusicNote,
  MusicNotes,
  PianoKeys,
  SpeakerHifi,
} from '@phosphor-icons/react';

interface SplashScreenProps {
  enabled?: boolean;
}

export function SplashScreen({ enabled = true }: SplashScreenProps) {
  if (!enabled) {
    return null;
  }

  return (
    <section
      className="splash-screen"
      aria-label="交响视界开屏动画"
      aria-live="polite"
    >
      <div className="splash-screen__space" aria-hidden="true">
        <span className="splash-screen__paper-grain splash-screen__paper-grain--one" />
        <span className="splash-screen__paper-grain splash-screen__paper-grain--two" />
        <span className="splash-screen__light" />
        <span className="splash-screen__staff splash-screen__staff--one" />
        <span className="splash-screen__staff splash-screen__staff--two" />
        <span className="splash-screen__glass splash-screen__glass--nav" />
        <span className="splash-screen__glass splash-screen__glass--title" />
        <span className="splash-screen__glass splash-screen__glass--side" />
        <MusicNote className="splash-screen__note splash-screen__note--one" size={29} />
        <MusicNote className="splash-screen__note splash-screen__note--two" size={20} />
        <MusicNotes className="splash-screen__note splash-screen__note--three" size={24} />
        <MusicNote className="splash-screen__note splash-screen__note--four" size={18} />
      </div>

      <div className="splash-screen__instruments" aria-hidden="true">
        <span className="splash-screen__instrument splash-screen__instrument--violin">
          <span className="splash-screen__violin-body" />
          <span className="splash-screen__violin-neck" />
          <span className="splash-screen__violin-bow" />
        </span>
        <span className="splash-screen__instrument splash-screen__instrument--piano">
          <PianoKeys size={82} weight="duotone" />
        </span>
        <span className="splash-screen__instrument splash-screen__instrument--horn">
          <SpeakerHifi size={78} weight="duotone" />
        </span>
      </div>

      <div className="splash-screen__stage" aria-hidden="true">
        <span className="splash-screen__ring splash-screen__ring--outer" />
        <span className="splash-screen__ring splash-screen__ring--middle" />
        <span className="splash-screen__ring splash-screen__ring--inner" />
        <span className="splash-screen__conductor">
          <span className="splash-screen__conductor-head" />
          <span className="splash-screen__conductor-body" />
          <span className="splash-screen__conductor-arms" />
          <span className="splash-screen__conductor-legs" />
        </span>
      </div>

      <div className="splash-screen__brand">
        <p>校园古典音乐数字展厅</p>
        <h1>交响视界</h1>
      </div>

      <div className="splash-screen__action" aria-hidden="true">
        <span>进入展厅</span>
        <span className="splash-screen__play" />
      </div>
    </section>
  );
}
