import { ArrowCounterClockwise, Pause, Play, SpinnerGap } from '@phosphor-icons/react';
import type { CSSProperties } from 'react';

interface StagePlayerProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isLoading: boolean;
  hasActiveMusicians: boolean;
  onTogglePlayback: () => void;
  onSeek: (timeInSeconds: number) => void;
}

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = Math.floor(safeSeconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export function StagePlayer({
  currentTime,
  duration,
  isPlaying,
  isLoading,
  hasActiveMusicians,
  onTogglePlayback,
  onSeek,
}: StagePlayerProps) {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeCurrentTime = Math.min(Math.max(0, currentTime), safeDuration);
  const progress = safeDuration ? (safeCurrentTime / safeDuration) * 100 : 0;

  return (
    <section className="stage-mobile__player" aria-label="乐团播放器" aria-busy={isLoading}>
      <button
        className="stage-mobile__player-button"
        type="button"
        onClick={onTogglePlayback}
        disabled={!hasActiveMusicians || isLoading}
        aria-label={isLoading ? '音频加载中' : isPlaying ? '暂停演奏' : '播放演奏'}
      >
        {isLoading ? (
          <SpinnerGap className="stage-mobile__spinner" size={24} aria-hidden="true" />
        ) : isPlaying ? (
          <Pause size={23} weight="fill" aria-hidden="true" />
        ) : (
          <Play size={23} weight="fill" aria-hidden="true" />
        )}
      </button>

      <div className="stage-mobile__progress">
        <label className="stage-mobile__sr-only" htmlFor="stage-playback-progress">播放进度</label>
        <input
          id="stage-playback-progress"
          type="range"
          min="0"
          max={safeDuration || 1}
          step="0.01"
          value={safeCurrentTime}
          onChange={(event) => onSeek(Number(event.currentTarget.value))}
          disabled={!safeDuration}
          style={{ '--progress': `${progress}%` } as CSSProperties}
          aria-valuetext={`${formatTime(safeCurrentTime)}，共 ${formatTime(safeDuration)}`}
        />
        <div className="stage-mobile__time" aria-hidden="true">
          <span>{formatTime(safeCurrentTime)}</span>
          <span>{formatTime(safeDuration)}</span>
        </div>
      </div>

      <button
        className="stage-mobile__player-button stage-mobile__player-button--restart"
        type="button"
        onClick={() => onSeek(0)}
        disabled={!safeDuration}
        aria-label="从头播放"
      >
        <ArrowCounterClockwise size={22} weight="bold" aria-hidden="true" />
      </button>
    </section>
  );
}
