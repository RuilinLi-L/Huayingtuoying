import { ArrowSquareOut, MusicNotes, Waveform } from '@phosphor-icons/react';
import type { MusicComposeTrack } from '../../lib/musicCompose';

export function ComposeResultList({ tracks }: { tracks: MusicComposeTrack[] }) {
  if (!tracks.length) {
    return (
      <div className="cm-results-empty">
        <Waveform size={25} weight="light" aria-hidden="true" />
        <p>作品生成后，可在这里试听完整编曲。</p>
      </div>
    );
  }

  return (
    <div className="cm-results-list">
      {tracks.map((track, index) => (
        <article className="cm-track" key={`${track.id}-${index}`}>
          <div className="cm-track__heading">
            {track.imageUrl ? (
              <img className="cm-track__cover" src={track.imageUrl} alt={`${track.title} 封面`} />
            ) : (
              <div className="cm-track__cover cm-track__cover--fallback" aria-label="默认音乐封面">
                <MusicNotes size={30} weight="duotone" />
              </div>
            )}
            <div className="cm-track__identity">
              <span>作品 {String(index + 1).padStart(2, '0')}{track.duration ? ` · ${formatDuration(track.duration)}` : ''}</span>
              <h3>{track.title}</h3>
              {track.style ? <p>{track.style}</p> : null}
            </div>
          </div>
          <audio aria-label={`试听${track.title}`} controls preload="none" src={track.audioUrl} />
          <a href={track.audioUrl} rel="noreferrer" target="_blank">
            打开音频链接 <ArrowSquareOut size={16} aria-hidden="true" />
          </a>
        </article>
      ))}
    </div>
  );
}

function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
