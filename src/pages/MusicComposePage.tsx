import { MagicWand } from '@phosphor-icons/react';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ComposeAdvancedControls } from '../components/compose/ComposeAdvancedControls';
import { ComposeAudioPreview } from '../components/compose/ComposeAudioPreview';
import { ComposeProgress } from '../components/compose/ComposeProgress';
import { ComposePromptPanel } from '../components/compose/ComposePromptPanel';
import { ComposeRecorder } from '../components/compose/ComposeRecorder';
import { ComposeResultList } from '../components/compose/ComposeResultList';
import { MODEL_OPTIONS, STATUS_LABELS, STYLE_PRESETS } from '../components/compose/composeConfig';
import { useComposeRecorder } from '../components/compose/useComposeRecorder';
import {
  getMusicCompositionStatus,
  submitMusicComposition,
  type MusicComposeStatus,
  type MusicComposeTrack,
} from '../lib/musicCompose';

const MAX_AUDIO_FILE_BYTES = 30 * 1024 * 1024;
const POLL_DELAY_MS = 5000;
const MAX_POLL_ATTEMPTS = 72;

export function MusicComposePage() {
  const previewUrlRef = useRef('');
  const pollingControllerRef = useRef<AbortController | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('');
  const [audioSourceLabel, setAudioSourceLabel] = useState('');
  const [prompt, setPrompt] = useState(
    '把这段哼唱动机发展成适合校园古典音乐美育展陈的短编曲，保留旋律轮廓，让和声逐步展开。',
  );
  const [style, setStyle] = useState(STYLE_PRESETS[0].value as string);
  const [title, setTitle] = useState('我的哼唱动机');
  const [instrumental, setInstrumental] = useState(true);
  const [model, setModel] = useState<string>(MODEL_OPTIONS[0].value);
  const [audioWeight, setAudioWeight] = useState(0.75);
  const [styleWeight, setStyleWeight] = useState(0.6);
  const [negativeTags, setNegativeTags] = useState(
    'copyrighted melody, low quality, noisy recording',
  );
  const [formError, setFormError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [taskId, setTaskId] = useState('');
  const [jobStatus, setJobStatus] = useState<MusicComposeStatus | ''>('');
  const [generationPhase, setGenerationPhase] = useState('');
  const [tracks, setTracks] = useState<MusicComposeTrack[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const {
    canRecord,
    micError,
    recordingState,
    startRecording,
    stopRecording,
    markAudioSelected,
    resetRecordingState,
  } = useComposeRecorder((file) => applyAudioFile(file, '现场录音'));
  const recorderBusy =
    recordingState === 'requesting' ||
    recordingState === 'recording' ||
    recordingState === 'stopping';
  const canSubmit = Boolean(audioFile && prompt.trim() && !isGenerating && !recorderBusy);

  useEffect(() => {
    return () => {
      pollingControllerRef.current?.abort();
      pollingControllerRef.current = null;

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = '';
      }
    };
  }, []);

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    if (isGenerating || (recorderBusy && audioFile)) {
      event.currentTarget.value = '';
      return;
    }
    const file = event.currentTarget.files?.[0];

    if (file && applyAudioFile(file, file.name)) {
      markAudioSelected();
    }

    event.currentTarget.value = '';
  }

  function applyAudioFile(file: File, label: string) {
    if (file.size > MAX_AUDIO_FILE_BYTES) {
      setFormError(
        audioFile
          ? '所选音频超过 30MB，已保留当前动机。请换一个较小的文件。'
          : '音频文件过大，请控制在 30MB 以内。',
      );
      return false;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setAudioFile(file);
    setAudioSourceLabel(label);
    setAudioPreviewUrl(nextPreviewUrl);
    setFormError('');
    setSubmitError('');
    setTracks([]);
    setTaskId('');
    setJobStatus('');
    setGenerationPhase('');
    return true;
  }

  function clearAudio() {
    if (isGenerating || recorderBusy) return;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }

    setAudioFile(null);
    setAudioPreviewUrl('');
    setAudioSourceLabel('');
    setTracks([]);
    setTaskId('');
    setJobStatus('');
    setGenerationPhase('');
    setFormError('');
    setSubmitError('');
    resetRecordingState();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!audioFile) {
      setFormError('请先录制或上传一段哼唱动机。');
      return;
    }

    if (!prompt.trim()) {
      setFormError('请填写编曲 prompt。');
      return;
    }

    if (isGenerating || recorderBusy) {
      return;
    }

    pollingControllerRef.current?.abort();
    const controller = new AbortController();
    pollingControllerRef.current = controller;
    setIsGenerating(true);
    setSubmitError('');
    setFormError('');
    setTracks([]);
    setTaskId('');
    setJobStatus('');
    setGenerationPhase('正在上传哼唱动机');
    let taskSubmitted = false;

    try {
      const nextTask = await submitMusicComposition(
        {
          audio: audioFile,
          prompt: prompt.trim(),
          style: style.trim(),
          title: title.trim(),
          instrumental,
          model,
          audioWeight,
          styleWeight,
          negativeTags: negativeTags.trim(),
        },
        controller.signal,
      );

      if (controller.signal.aborted) throw createAbortError();
      taskSubmitted = true;
      setTaskId(nextTask.taskId);
      setGenerationPhase('任务已提交，正在等待 Suno 返回结果');
      await pollTask(nextTask.taskId, controller.signal);
    } catch (error) {
      if (!isAbortError(error)) {
        setSubmitError(getSubmitErrorMessage(error));
        if (!taskSubmitted) setGenerationPhase('请求未提交，请检查网络后重试。');
      }
    } finally {
      if (pollingControllerRef.current === controller) {
        pollingControllerRef.current = null;
        setIsGenerating(false);
      }
    }
  }

  async function pollTask(nextTaskId: string, signal: AbortSignal) {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      if (attempt > 0) {
        await wait(POLL_DELAY_MS, signal);
      }

      const result = await getMusicCompositionStatus(nextTaskId, signal);
      if (signal.aborted) throw createAbortError();
      setJobStatus(result.status);
      setTracks(result.tracks);
      setGenerationPhase(result.message || STATUS_LABELS[result.status]);

      if (result.status === 'complete') {
        if (!result.tracks.length) {
          throw new Error('生成完成但没有返回可试听音频，请检查第三方 Suno 接口响应。');
        }
        return;
      }

      if (result.status === 'failed') {
        throw new Error(result.message || '生成失败，请稍后重试。');
      }
    }

    throw new Error('生成等待超时。任务可能仍在第三方服务处理中，请稍后重试。');
  }

  function cancelPolling() {
    pollingControllerRef.current?.abort();
    pollingControllerRef.current = null;
    setIsGenerating(false);
    setJobStatus('');
    setGenerationPhase('已停止等待结果。已提交的任务仍可能在第三方继续处理。');
  }

  return (
    <div className="cm-page">
      <header className="cm-intro">
        <p>COMPOSE STUDIO <span>·</span> 从一段旋律开始</p>
        <h1>音乐编创</h1>
        <span>把哼唱变成一首作品</span>
      </header>

      <form className="cm-flow" onSubmit={handleSubmit}>
        <section className="cm-section" aria-labelledby="cm-record-heading">
          <StepHeading number="01" title="录入旋律" description="录制哼唱，或上传你已有的声音" id="cm-record-heading" />
          <ComposeRecorder
            canRecord={canRecord}
            disabled={isGenerating}
            uploadDisabled={recorderBusy && Boolean(audioFile)}
            micError={micError}
            recordingState={recordingState}
            onRecord={() => { setFormError(''); void startRecording(); }}
            onStop={stopRecording}
            onUpload={handleFileUpload}
          />
          {audioFile && audioPreviewUrl ? (
            <ComposeAudioPreview
              playbackDisabled={recorderBusy}
              replaceDisabled={isGenerating || recorderBusy}
              file={audioFile}
              onClear={clearAudio}
              sourceLabel={audioSourceLabel}
              url={audioPreviewUrl}
            />
          ) : null}
        </section>

        <section className="cm-section" aria-labelledby="cm-prompt-heading">
          <StepHeading number="02" title="描述音乐" description="让旋律拥有自己的情绪与音色" id="cm-prompt-heading" />
          <ComposePromptPanel
            disabled={isGenerating}
            onPromptChange={(value) => { setPrompt(value); setFormError(''); }}
            onStyleChange={setStyle}
            onTitleChange={setTitle}
            prompt={prompt}
            style={style}
            title={title}
          />
          <ComposeAdvancedControls
            disabled={isGenerating}
            audioWeight={audioWeight}
            instrumental={instrumental}
            model={model}
            negativeTags={negativeTags}
            onAudioWeightChange={setAudioWeight}
            onInstrumentalChange={setInstrumental}
            onModelChange={setModel}
            onNegativeTagsChange={setNegativeTags}
            onStyleWeightChange={setStyleWeight}
            styleWeight={styleWeight}
          />
          {formError ? <p className="cm-error" role="alert"><strong>输入问题</strong><span>{formError}</span></p> : null}
        </section>

        <section className="cm-section cm-section--generate" aria-labelledby="cm-generate-heading">
          <StepHeading number="03" title="生成与试听" description="提交后可在这里查看真实生成状态" id="cm-generate-heading" />
          <button className="cm-generate-button" disabled={!canSubmit} type="submit">
            <MagicWand size={20} weight="bold" aria-hidden="true" />
            {isGenerating ? '正在生成…' : '生成编曲'}
          </button>
          {!canSubmit && !isGenerating ? (
            <p className="cm-generate-hint">先准备音频并填写 Prompt，即可开始生成。</p>
          ) : null}
          {isGenerating ? (
            <button className="cm-cancel-button" onClick={cancelPolling} type="button">停止等待</button>
          ) : null}
          <ComposeProgress
            isGenerating={isGenerating}
            phase={generationPhase}
            status={jobStatus}
            submitError={submitError}
            taskId={taskId}
            trackCount={tracks.length}
          />
          <ComposeResultList tracks={tracks} />
        </section>
      </form>
    </div>
  );
}

function StepHeading({
  number,
  title,
  description,
  id,
}: {
  number: string;
  title: string;
  description: string;
  id: string;
}) {
  return (
    <div className="cm-step-heading">
      <span className="cm-step-heading__number">{number}</span>
      <div><h2 id={id}>{title}</h2><p>{description}</p></div>
    </div>
  );
}

function wait(timeout: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError());
      return;
    }

    const onAbort = () => {
      window.clearTimeout(timer);
      reject(createAbortError());
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, timeout);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function createAbortError() {
  return new DOMException('等待已取消。', 'AbortError');
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function getSubmitErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return '生成请求失败，请稍后重试。';
}
