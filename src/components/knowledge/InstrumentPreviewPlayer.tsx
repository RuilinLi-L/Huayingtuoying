import { Pause, Play, SpeakerHigh } from '@phosphor-icons/react';
import type { InstrumentEncyclopediaEntry } from '../../data/instrumentEncyclopedia';
import { useKnowledgeAudio } from './KnowledgeAudio';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function InstrumentPreviewButton({ instrument }: { instrument: InstrumentEncyclopediaEntry }) {
  const { instrumentId, status, toggle } = useKnowledgeAudio();
  const active = instrumentId === instrument.id;
  const isPlaying = active && status === 'playing';
  const isLoading = active && status === 'loading';

  return (
    <span className="instrument-preview-button-wrap">
      <button
        className="instrument-preview-button"
        type="button"
        aria-label={`${isPlaying ? '暂停' : isLoading ? '加载中，点击暂停' : '试听'}${instrument.name}`}
        aria-pressed={isPlaying}
        onClick={() => toggle(instrument)}
      >{isPlaying || isLoading ? <Pause size={17} weight="fill" /> : <Play size={17} weight="fill" />}</button>
      {active && status === 'error' ? <span className="instrument-preview-error" role="status">试听失败</span> : null}
    </span>
  );
}

export function InstrumentPreviewPlayer({ instrument }: { instrument: InstrumentEncyclopediaEntry }) {
  const { instrumentId, status, currentTime, duration, toggle, seek } = useKnowledgeAudio();
  const active = instrumentId === instrument.id;
  const isPlaying = active && status === 'playing';
  const isLoading = active && status === 'loading';
  const progress = active ? currentTime : 0;
  const total = active ? duration : 0;

  return (
    <div className="instrument-preview-player" aria-label={`${instrument.name}试听控制`}>
      <button
        className="instrument-preview-player__toggle"
        type="button"
        aria-label={`${isPlaying ? '暂停' : isLoading ? '加载中，点击暂停' : '播放'}${instrument.name}`}
        onClick={() => toggle(instrument)}
      >{isPlaying || isLoading ? <Pause size={19} weight="fill" /> : <Play size={19} weight="fill" />}</button>
      <div className="instrument-preview-player__track">
        <span>{instrument.name} · 睡美人圆舞曲</span>
        <input
          type="range"
          min="0"
          max={total > 0 ? total : 1}
          step="0.1"
          value={progress}
          aria-label={`${instrument.name}播放进度`}
          disabled={total <= 0}
          onChange={(event) => seek(Number(event.target.value))}
          style={{ '--audio-progress': `${total > 0 ? (progress / total) * 100 : 0}%` } as React.CSSProperties}
        />
      </div>
      <span className="instrument-preview-player__time">{formatTime(progress)}{total > 0 ? ` / ${formatTime(total)}` : ''}</span>
      <SpeakerHigh className="instrument-preview-player__speaker" size={19} aria-hidden="true" />
      {active && status === 'error' ? <p className="instrument-preview-player__error" role="status">音频加载失败，请稍后重试。</p> : null}
    </div>
  );
}
