import { Pause, Play } from '@phosphor-icons/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SymphonyPreview } from '../../data/symphonies';
import { AudioEngine } from '../../lib/audio/AudioEngine';

type Playback = { id: string; status: 'loading' | 'playing' | 'paused' } | null;

export function SymphonyList({ previews }: { previews: SymphonyPreview[] }) {
  const engineRef = useRef<AudioEngine | null>(null);
  const operationRef = useRef(0);
  const playbackRef = useRef<Playback>(null);
  const [playback, setPlayback] = useState<Playback>(null);
  const [error, setError] = useState('');

  function updatePlayback(next: Playback) {
    playbackRef.current = next;
    setPlayback(next);
  }

  useEffect(() => {
    const engine = new AudioEngine();
    engineRef.current = engine;
    return () => {
      operationRef.current += 1;
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const current = playbackRef.current;
    if (current && !previews.some((preview) => preview.id === current.id)) {
      operationRef.current += 1;
      engineRef.current?.stop();
      updatePlayback(null);
    }
  }, [previews]);

  async function togglePreview(preview: SymphonyPreview) {
    const engine = engineRef.current;
    if (!engine) return;

    setError('');
    const current = playbackRef.current;
    if (current?.id === preview.id && current.status === 'playing') {
      operationRef.current += 1;
      engine.pause();
      updatePlayback({ id: preview.id, status: 'paused' });
      return;
    }

    const operation = ++operationRef.current;
    updatePlayback({ id: preview.id, status: 'loading' });
    try {
      const failure = current?.id === preview.id && current.status === 'paused'
        ? (await engine.resume(), null)
        : await engine.play([preview.stem]);
      if (operation !== operationRef.current) return;
      if (failure || !engine.isPlaying()) {
        setError(failure || '音频暂时无法播放，请稍后重试。');
        updatePlayback(null);
      } else {
        updatePlayback({ id: preview.id, status: 'playing' });
      }
    } catch {
      if (operation === operationRef.current) {
        setError('音频暂时无法播放，请稍后重试。');
        updatePlayback(null);
      }
    }
  }

  return (
    <>
      {error ? <p className="home-audio-error" role="alert">{error}</p> : null}
      <ul className="home-symphony-list">
        {previews.map((preview) => {
          const playing = playback?.id === preview.id && playback.status === 'playing';
          const loading = playback?.id === preview.id && playback.status === 'loading';
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
