import { Pause, Play } from '@phosphor-icons/react';
import { useEffect } from 'react';
import type { SymphonyPreview } from '../../data/symphonies';
import { useProgressiveAudio } from '../../lib/audio/useProgressiveAudio';
export function SymphonyList({ previews }: { previews: SymphonyPreview[] }) {
  const audio = useProgressiveAudio();
  const stop = audio.stop;
  useEffect(() => { if (audio.url && !previews.some(p => p.stem.file === audio.url)) stop(); }, [previews,audio.url,stop]);
  const error = audio.status === 'error' ? '音频加载失败，请重新点击播放。' : '';
  const togglePreview = (preview:SymphonyPreview) => audio.toggle(preview.stem.file);
  return (
    <>
      {error ? <p className="home-audio-error" role="alert">{error}</p> : null}
      <ul className="home-symphony-list">
        {previews.map((preview) => {
          const playing = audio.url === preview.stem.file && audio.status === 'playing';
          const loading = audio.url === preview.stem.file && audio.status === 'loading';
          return (
            <li className={playing ? 'home-symphony home-symphony--playing' : 'home-symphony'} key={preview.id}>
              <div className="home-symphony__composer">
                <strong>{preview.composer}</strong>
                <small>{preview.composerLatin}</small>
              </div>
              <div className="home-symphony__body">
                <div className="home-symphony__copy">
                  <strong>{preview.title}</strong>
                  <span>{preview.description}</span>
                </div>
                <button
                  className="home-symphony__play"
                  type="button"
                  aria-label={`${loading ? '加载中' : playing ? '暂停' : '播放'}${preview.title}`}
                  aria-pressed={playing}
                  onClick={() => void togglePreview(preview)}
                >
                  {playing ? <Pause size={13} weight="fill" /> : <Play size={13} weight="fill" />}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
