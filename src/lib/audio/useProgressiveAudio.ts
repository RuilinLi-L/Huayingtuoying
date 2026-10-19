import { useCallback, useEffect, useRef, useState } from 'react';

export function useProgressiveAudio() {
  const ref = useRef<HTMLAudioElement | null>(null),
    request = useRef(0);
  const [state, setState] = useState({
    url: '',
    status: 'idle' as 'idle' | 'loading' | 'playing' | 'paused' | 'error',
  });
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    ref.current = audio;
    const sync = () =>
      setState((s) => ({
        ...s,
        status: audio.error
          ? 'error'
          : audio.paused
            ? 'paused'
            : audio.readyState < 3
              ? 'loading'
              : 'playing',
      }));
    for (const event of ['playing', 'waiting', 'pause', 'ended', 'error'])
      audio.addEventListener(event, sync);
    return () => {
      request.current++;
      for (const event of ['playing', 'waiting', 'pause', 'ended', 'error'])
        audio.removeEventListener(event, sync);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      ref.current = null;
    };
  }, []);
  const stop = useCallback(() => {
    request.current++;
    const audio = ref.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setState({ url: '', status: 'idle' });
  }, []);
  const toggle = useCallback((url: string) => {
    const audio = ref.current;
    if (!audio) return;
    if (audio.getAttribute('src') === url && !audio.paused) {
      request.current++;
      audio.pause();
      return;
    }
    const id = ++request.current;
    if (audio.getAttribute('src') !== url) {
      audio.pause();
      audio.src = url;
      audio.load();
    }
    setState({ url, status: 'loading' });
    void audio.play().catch(() => {
      if (id === request.current) setState({ url, status: 'error' });
    });
  }, []);
  return { ...state, toggle, stop };
}
