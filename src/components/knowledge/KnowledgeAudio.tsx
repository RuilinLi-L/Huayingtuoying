import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { InstrumentEncyclopediaEntry } from '../../data/instrumentEncyclopedia';

export type KnowledgeAudioStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface AudioSnapshot {
  instrumentId: string | null;
  status: KnowledgeAudioStatus;
  currentTime: number;
  duration: number;
}

interface KnowledgeAudioContextValue extends AudioSnapshot {
  toggle: (instrument: InstrumentEncyclopediaEntry) => void;
  seek: (seconds: number) => void;
  stop: () => void;
}

const initialSnapshot: AudioSnapshot = {
  instrumentId: null,
  status: 'idle',
  currentTime: 0,
  duration: 0,
};

const KnowledgeAudioContext = createContext<KnowledgeAudioContextValue | null>(null);

export function KnowledgeAudioProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef(0);
  const activeIdRef = useRef<string | null>(null);
  const [snapshot, setSnapshot] = useState<AudioSnapshot>(initialSnapshot);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audioRef.current = audio;

    const syncProgress = () => setSnapshot((current) => ({
      ...current,
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
    }));
    const handlePlaying = () => setSnapshot((current) => ({ ...current, status: 'playing' }));
    const handleWaiting = () => setSnapshot((current) => ({
      ...current,
      status: current.instrumentId ? 'loading' : 'idle',
    }));
    const handlePause = () => setSnapshot((current) => ({
      ...current,
      status: current.status === 'error' || !current.instrumentId ? current.status : 'paused',
    }));
    const handleEnded = () => {
      audio.currentTime = 0;
      setSnapshot((current) => ({ ...current, status: 'paused', currentTime: 0 }));
    };
    const handleError = () => setSnapshot((current) => ({
      ...current,
      status: current.instrumentId ? 'error' : 'idle',
    }));

    audio.addEventListener('timeupdate', syncProgress);
    audio.addEventListener('durationchange', syncProgress);
    audio.addEventListener('loadedmetadata', syncProgress);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      requestRef.current += 1;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
      audio.removeEventListener('timeupdate', syncProgress);
      audio.removeEventListener('durationchange', syncProgress);
      audio.removeEventListener('loadedmetadata', syncProgress);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    if (pathname.startsWith('/knowledge/')) return;
    requestRef.current += 1;
    activeIdRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setSnapshot(initialSnapshot);
  }, [pathname]);

  const toggle = useCallback((instrument: InstrumentEncyclopediaEntry) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (activeIdRef.current === instrument.id && !audio.paused) {
      requestRef.current += 1;
      audio.pause();
      setSnapshot((current) => ({ ...current, status: 'paused' }));
      return;
    }

    const request = ++requestRef.current;
    if (activeIdRef.current !== instrument.id) {
      audio.pause();
      activeIdRef.current = instrument.id;
      audio.src = instrument.audioSrc;
      audio.load();
      setSnapshot({ instrumentId: instrument.id, status: 'loading', currentTime: 0, duration: 0 });
    } else {
      setSnapshot((current) => ({ ...current, status: 'loading' }));
    }

    void audio.play().catch(() => {
      if (request === requestRef.current) {
        setSnapshot((current) => ({ ...current, status: 'error' }));
      }
    });
  }, []);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration));
    setSnapshot((current) => ({ ...current, currentTime: audio.currentTime }));
  }, []);

  const stop = useCallback(() => {
    requestRef.current += 1;
    activeIdRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setSnapshot(initialSnapshot);
  }, []);

  return (
    <KnowledgeAudioContext.Provider value={{ ...snapshot, toggle, seek, stop }}>
      {children}
    </KnowledgeAudioContext.Provider>
  );
}

export function useKnowledgeAudio() {
  const context = useContext(KnowledgeAudioContext);
  if (!context) throw new Error('Knowledge audio requires KnowledgeAudioProvider');
  return context;
}
