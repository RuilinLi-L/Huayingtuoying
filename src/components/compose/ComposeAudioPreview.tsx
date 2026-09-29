import { ArrowCounterClockwise, Pause, Play, Waveform } from '@phosphor-icons/react';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';

type Props = {
  file: File;
  sourceLabel: string;
  url: string;
  disabled: boolean;
  onClear: () => void;
};

export function ComposeAudioPreview({ file, sourceLabel, url, disabled, onClear }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setPreviewError('');

    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
      }
    };
  }, [url]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
      setPreviewError('');
    } catch {
      setPreviewError('当前音频无法在浏览器中试听，请尝试替换文件。');
    }
  }

  return (
    <div className="cm-audio-preview" aria-label="当前动机">
      <div className="cm-audio-preview__heading">
        <span className="cm-audio-preview__icon"><Waveform size={20} weight="bold" /></span>
        <div className="cm-audio-preview__text">
          <span>当前动机</span>
          <strong title={sourceLabel}>{sourceLabel}</strong>
          <small>{formatFileSize(file.size)} · {duration ? formatTime(duration) : '时长读取中'}</small>
        </div>
        <button
          aria-label="重新录制或替换音频"
          className="cm-audio-preview__replace"
          disabled={disabled}
          onClick={onClear}
          type="button"
        >
          <ArrowCounterClockwise size={19} />
        </button>
      </div>
      <audio
        ref={audioRef}
        onDurationChange={(event) => {
          const next = event.currentTarget.duration;
          setDuration(Number.isFinite(next) ? next : 0);
        }}
        onEnded={() => setIsPlaying(false)}
        onError={() => setPreviewError('当前音频无法在浏览器中试听，请尝试替换文件。')}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        preload="metadata"
        src={url}
      />
      <div className="cm-audio-preview__player">
        <button
          aria-label={isPlaying ? '暂停当前动机' : '播放当前动机'}
          className="cm-audio-preview__play"
          onClick={() => void togglePlayback()}
          type="button"
        >
          {isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
        </button>
        <input
          aria-label="当前动机播放进度"
          disabled={!duration}
          max={duration || 1}
          min="0"
          onChange={(event) => {
            const next = Number(event.target.value);
            if (audioRef.current) audioRef.current.currentTime = next;
            setCurrentTime(next);
          }}
          step="0.1"
          style={{ '--cm-range-progress': `${duration ? (currentTime / duration) * 100 : 0}%` } as CSSProperties}
          type="range"
          value={Math.min(currentTime, duration || 1)}
        />
        <time>{formatTime(currentTime)} / {formatTime(duration)}</time>
      </div>
      {previewError ? <p className="cm-error" role="alert">{previewError}</p> : null}
    </div>
  );
}

function formatTime(seconds: number) {
  const total = Math.floor(Number.isFinite(seconds) ? seconds : 0);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
