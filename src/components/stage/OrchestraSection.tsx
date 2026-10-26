import { ArrowCounterClockwise, Info } from '@phosphor-icons/react';
import type { MusicianProfile, MusicianSection } from '../../types/demo';
import { musicianArtwork, musicianPortraitStyle } from './stageArtwork';

interface OrchestraSectionProps {
  section: MusicianSection;
  musicians: MusicianProfile[];
  selectedIds: string[];
  pulseIds: string[];
  focusedMusicianId: string | null;
  onSelectMusician: (id: string) => void;
  onToggleMusician: (id: string) => void;
  onReset: (section: MusicianSection) => void;
}

const sections: Record<MusicianSection, { title: string; name: string; description: string; ids: string[] }> = {
  strings: { title: 'STRING MUSIC', name: '弦乐', description: '承托旋律，铺陈乐曲温暖而丰富的底色。', ids: ['violin', 'viola', 'cello', 'bass'] },
  woodwind: { title: 'WOODWINDS', name: '木管', description: '轻盈的音色交织，为旋律添上鲜明的色彩。', ids: ['clarinet', 'bassoon', 'flute', 'oboe'] },
  brass: { title: 'BRASS SECTION', name: '铜管', description: '明亮而浑厚的声音，奏出乐团的力量。', ids: ['trumpet', 'horn', 'tuba', 'trombone'] },
};

export function OrchestraSection({ section, musicians, selectedIds, pulseIds, focusedMusicianId, onSelectMusician, onToggleMusician, onReset }: OrchestraSectionProps) {
  const group = sections[section];
  return (
    <section className="stage-mobile__section" aria-label={`${group.name}声部`} data-section={section}>
      <header className="stage-mobile__section-heading">
        <div><h2>{group.title}</h2><p>{group.description}</p></div>
        <button type="button" className="stage-mobile__section-reset" onClick={() => onReset(section)}
          disabled={!group.ids.some(id => selectedIds.includes(id))} aria-label={`重置${group.name}声部`}>
          <ArrowCounterClockwise size={21} weight="bold" aria-hidden="true" /><span>重置</span>
        </button>
      </header>
      <div className="stage-mobile__musicians">
        {group.ids.map(id => {
          const musician = musicians.find(item => item.id === id)!;
          const active = selectedIds.includes(id);
          const label = id === 'bass' ? '低音提琴' : musician.instrument;
          return (
            <div className="stage-mobile__musician-slot" key={id}>
              <button type="button" data-musician-id={id} aria-pressed={active}
                aria-label={`${label}，${active ? '已加入演奏，点击移出' : '未加入演奏，点击加入'}`}
                className={`stage-mobile__musician${active ? ' is-selected' : ''}${pulseIds.includes(id) ? ' is-pulsing' : ''}${focusedMusicianId === id ? ' is-focused' : ''}`}
                onClick={() => onToggleMusician(id)}>
                <span className="stage-mobile__portrait"><img src={musicianArtwork(id)} style={musicianPortraitStyle(id)} alt="" draggable={false} /></span>
                <span className="stage-mobile__musician-name">{label}</span>
              </button>
              <button className="stage-mobile__musician-info" type="button" onClick={() => onSelectMusician(id)}
                aria-label={`查看${musician.instrument}详情`} aria-haspopup="dialog"><Info size={17} weight="fill" aria-hidden="true" /></button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
