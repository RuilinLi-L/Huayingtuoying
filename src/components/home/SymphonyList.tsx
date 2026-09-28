import { Pause, Play } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import type { SymphonyPreview } from '../../data/symphonies';
import { AudioEngine } from '../../lib/audio/AudioEngine';

export function SymphonyList({ previews }: { previews: SymphonyPreview[] }) {
  const engineRef = useRef<AudioEngine | null>(null);
  const operationRef = useRef(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const engine = new AudioEngine();
    engineRef.current = engine;
    return () => {
      operationRef.current += 1;
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (activeId && !previews.some((preview) => preview.id === activeId)) {
      engineRef.current?.stop();
      setActiveId(null);
    }
  }, [activeId, previews]);

  async function togglePreview(preview: SymphonyPreview) {
    const engine = engineRef.current;
    if (!engine) return;

    setError('');
    if (activeId === preview.id) {
      engine.pause();
      setActiveId(null);
      return;
    }

    const operation = ++operationRef.current;
    setLoadingId(preview.id);
    try {
      const failure = await engine.play([preview.stem]);
      if (operation !== operationRef.current) return;
      if (failure || !engine.isPlaying()) {
        setError(failure || '音频暂时无法播放，请稍后重试。');
        setActiveId(null);
      } else {
        setActiveId(preview.id);
      }
    } catch {
      if (operation === operationRef.current) {
        setError('音频暂时无法播放，请稍后重试。');
        setActiveId(null);
      }
    } finally {
      if (operation === operationRef.current) setLoadingId(null);
    }
  }

  return (
    <>
      {error ? <p className="home-audio-error" role="alert">{error}</p> : null}
      <ul className="home-symphony-list">
        {previews.map((preview) => {
          const playing = activeId === preview.id;
          const loading = loadingId === preview.id;
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
                  disabled={loading}
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
