import { Check, CircleNotch, CloudArrowUp, MusicNotes, Sparkle } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import type { MusicComposeStatus } from '../../lib/musicCompose';
import { STATUS_LABELS } from './composeConfig';

type Props = {
  taskId: string;
  status: MusicComposeStatus | '';
  phase: string;
  isGenerating: boolean;
  submitError: string;
  trackCount: number;
};

export function ComposeProgress({
  taskId,
  status,
  phase,
  isGenerating,
  submitError,
  trackCount,
}: Props) {
  const resultMissing = status === 'complete' && trackCount === 0 && Boolean(submitError);
  const uploadState = taskId ? 'done' : isGenerating ? 'active' : 'idle';
  const composeState = status === 'complete'
    ? 'done'
    : status === 'failed'
      ? 'failed'
      : status || (taskId && isGenerating)
        ? 'active'
        : 'idle';
  const resultState = resultMissing
    ? 'failed'
    : status === 'complete'
    ? 'done'
    : status === 'first' && trackCount
      ? 'active'
      : 'idle';

  const heading = resultMissing
    ? '结果不可用'
    : status
    ? STATUS_LABELS[status]
    : isGenerating
      ? taskId ? '任务已提交' : '正在上传动机'
      : taskId && phase.startsWith('已停止等待')
        ? '已停止等待'
        : phase || '等待开始';
  const description = phase || '录入旋律、描述方向后，生成状态会显示在这里。';

  return (
    <div className="cm-progress" aria-live="polite">
      <div className="cm-progress__summary">
        <span className={`cm-progress__icon${isGenerating ? ' is-active' : ''}`}>
          {isGenerating ? <CircleNotch size={22} weight="bold" /> : <MusicNotes size={22} weight="fill" />}
        </span>
        <div>
          <strong>{heading}</strong>
          <p>{description}</p>
          {taskId ? <code>任务 {taskId}</code> : null}
        </div>
      </div>
      <ol className="cm-progress__steps" aria-label="生成步骤">
        <ProgressStep icon={<CloudArrowUp size={18} />} label="上传动机" state={uploadState} />
        <ProgressStep icon={<Sparkle size={18} />} label="生成编曲" state={composeState} />
        <ProgressStep icon={<MusicNotes size={18} />} label="试听结果" state={resultState} />
      </ol>
      {submitError ? (
        <p className="cm-error cm-progress__error" role="alert">
          <strong>{resultMissing ? '结果不可用' : taskId ? '生成失败' : '生成请求失败'}</strong><span>{submitError}</span>
        </p>
      ) : null}
    </div>
  );
}

function ProgressStep({
  icon,
  label,
  state,
}: {
  icon: ReactNode;
  label: string;
  state: string;
}) {
  return (
    <li className={`cm-progress__step is-${state}`}>
      <span className="cm-progress__step-icon">{state === 'done' ? <Check size={18} weight="bold" /> : icon}</span>
      <span>{label}</span>
    </li>
  );
}
