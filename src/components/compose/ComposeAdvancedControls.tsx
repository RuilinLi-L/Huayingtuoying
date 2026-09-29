import { CaretDown, SlidersHorizontal } from '@phosphor-icons/react';
import type { CSSProperties } from 'react';
import { MODEL_OPTIONS } from './composeConfig';

type Props = {
  model: string;
  instrumental: boolean;
  audioWeight: number;
  styleWeight: number;
  negativeTags: string;
  onModelChange: (value: string) => void;
  onInstrumentalChange: (value: boolean) => void;
  onAudioWeightChange: (value: number) => void;
  onStyleWeightChange: (value: number) => void;
  onNegativeTagsChange: (value: string) => void;
};

export function ComposeAdvancedControls({
  model,
  instrumental,
  audioWeight,
  styleWeight,
  negativeTags,
  onModelChange,
  onInstrumentalChange,
  onAudioWeightChange,
  onStyleWeightChange,
  onNegativeTagsChange,
}: Props) {
  return (
    <details className="cm-advanced">
      <summary>
        <span><SlidersHorizontal size={19} weight="bold" aria-hidden="true" /> 高级设置</span>
        <span className="cm-advanced__summary-note">模型 · 影响力 · 排除特征</span>
        <CaretDown size={18} className="cm-advanced__chevron" aria-hidden="true" />
      </summary>
      <div className="cm-advanced__body">
        <div className="cm-advanced__row">
          <label className="cm-field cm-field--model">
            <span className="cm-field__label">模型</span>
            <select onChange={(event) => onModelChange(event.target.value)} value={model}>
              {MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="cm-switch">
            <span>生成纯音乐</span>
            <input
              checked={instrumental}
              onChange={(event) => onInstrumentalChange(event.target.checked)}
              role="switch"
              type="checkbox"
            />
            <span className="cm-switch__track" aria-hidden="true" />
          </label>
        </div>
        <div className="cm-advanced__sliders">
          <WeightSlider label="动机影响" value={audioWeight} onChange={onAudioWeightChange} />
          <WeightSlider label="风格影响" value={styleWeight} onChange={onStyleWeightChange} />
        </div>
        <label className="cm-field">
          <span className="cm-field__label">Negative tags <small>减少不希望出现的音乐特征</small></span>
          <input
            onChange={(event) => onNegativeTagsChange(event.target.value)}
            placeholder="例如：noisy recording, low quality"
            type="text"
            value={negativeTags}
          />
        </label>
      </div>
    </details>
  );
}

function WeightSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="cm-weight">
      <span>{label} <strong>{Math.round(value * 100)}%</strong></span>
      <input
        max="1"
        min="0.1"
        onChange={(event) => onChange(Number(event.target.value))}
        step="0.05"
        style={{ '--cm-range-progress': `${((value - 0.1) / 0.9) * 100}%` } as CSSProperties}
        type="range"
        value={value}
      />
    </label>
  );
}
