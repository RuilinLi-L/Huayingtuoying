import { Microphone, StopCircle, UploadSimple, Waveform } from '@phosphor-icons/react';
import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import type { RecordingState } from './useComposeRecorder';

type Props = {
  canRecord: boolean;
  disabled: boolean;
  micError: string;
  recordingState: RecordingState;
  onRecord: () => void;
  onStop: () => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function ComposeRecorder({
  canRecord,
  disabled,
  micError,
  recordingState,
  onRecord,
  onStop,
  onUpload,
}: Props) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const isRecording = recordingState === 'recording';
  const isStopping = recordingState === 'stopping';
  const isRequesting = recordingState === 'requesting';
  const uploadDisabled = disabled || isRecording || isStopping;

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const startedAt = Date.now();
    setElapsedSeconds(0);
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  const statusLabel = isRequesting
    ? '等待麦克风权限…'
    : isRecording
      ? `正在录音 · ${formatElapsed(elapsedSeconds)}`
      : isStopping
        ? '正在保存录音…'
        : recordingState === 'recorded'
          ? '动机已准备好，可以重新录制'
          : recordingState === 'error'
            ? '录音未完成，请重试或上传音频'
            : '轻哼一段旋律，开启编创';

  return (
    <div className="cm-recorder">
      <div className="cm-recorder__rings" aria-hidden="true">
        <span className="cm-recorder__ring cm-recorder__ring--outer" />
        <span className="cm-recorder__ring cm-recorder__ring--inner" />
      </div>
      <div className="cm-recorder__content">
        <span className="cm-recorder__eyebrow"><Waveform size={15} /> 声音是创作的起点</span>
        <button
          aria-label={isRecording ? '停止录音' : isStopping ? '正在保存录音' : isRequesting ? '等待麦克风权限' : '录制哼唱'}
          className={`cm-recorder__orb${isRecording ? ' is-recording' : ''}`}
          disabled={disabled || isRequesting || isStopping}
          onClick={isRecording ? onStop : onRecord}
          type="button"
        >
          {isRecording || isStopping ? <StopCircle size={37} weight="fill" /> : <Microphone size={38} weight="fill" />}
        </button>
        <strong className="cm-recorder__status" aria-live="polite">{statusLabel}</strong>
        <span className="cm-recorder__hint">
          {canRecord ? '建议录制 5–30 秒，重复两遍主旋律' : '当前设备无法录音，请上传已有音频'}
        </span>
        <div className="cm-recorder__actions">
          <button
            className="cm-recorder__record-action"
            disabled={disabled || isRequesting || isStopping}
            onClick={isRecording ? onStop : onRecord}
            type="button"
          >
            {isRecording ? '停止录音' : isStopping ? '正在保存录音…' : isRequesting ? '等待授权…' : '录制哼唱'}
          </button>
          <label className={`cm-recorder__upload${uploadDisabled ? ' is-disabled' : ''}`}>
            <UploadSimple size={18} weight="bold" aria-hidden="true" />
            <span>上传音频</span>
            <input
              accept="audio/*"
              aria-label="上传音频"
              disabled={uploadDisabled}
              onChange={onUpload}
              type="file"
            />
          </label>
        </div>
      </div>
      {micError ? (
        <p className="cm-error cm-recorder__error" role="alert">
          <strong>麦克风问题</strong><span>{micError}</span>
        </p>
      ) : null}
    </div>
  );
}

function formatElapsed(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
