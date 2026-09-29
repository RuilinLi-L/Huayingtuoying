import { MusicNotes } from '@phosphor-icons/react';
import { STYLE_PRESETS } from './composeConfig';

type Props = {
  disabled?: boolean;
  prompt: string;
  style: string;
  title: string;
  onPromptChange: (value: string) => void;
  onStyleChange: (value: string) => void;
  onTitleChange: (value: string) => void;
};

export function ComposePromptPanel({
  disabled = false,
  prompt,
  style,
  title,
  onPromptChange,
  onStyleChange,
  onTitleChange,
}: Props) {
  return (
    <div className="cm-prompt-panel">
      <label className="cm-field cm-field--prompt">
        <span className="cm-field__label">Prompt <small>用文字描述想听到的作品</small></span>
        <textarea
          disabled={disabled}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder="例如：把这段哼唱发展成温暖的校园室内乐，保留旋律轮廓，加入钢琴与弦乐。"
          rows={5}
          value={prompt}
        />
      </label>
      <div className="cm-presets">
        <span className="cm-field__label">风格灵感 <small>轻点标签快速填入</small></span>
        <div className="cm-presets__list" aria-label="风格预设">
          {STYLE_PRESETS.map((preset) => (
            <button
              disabled={disabled}
              aria-pressed={style === preset.value}
              className={`cm-preset${style === preset.value ? ' is-selected' : ''}`}
              key={preset.id}
              onClick={() => onStyleChange(preset.value)}
              type="button"
            >
              <MusicNotes size={15} weight="fill" aria-hidden="true" />
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <label className="cm-field">
        <span className="cm-field__label">风格标签 <small>可直接修改预设内容</small></span>
        <input
          disabled={disabled}
          onChange={(event) => onStyleChange(event.target.value)}
          placeholder="例如：chamber ensemble, piano and strings"
          type="text"
          value={style}
        />
      </label>
      <label className="cm-field">
        <span className="cm-field__label">作品标题</span>
        <input
          disabled={disabled}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="例如：开放日主题动机"
          type="text"
          value={title}
        />
      </label>
    </div>
  );
}
