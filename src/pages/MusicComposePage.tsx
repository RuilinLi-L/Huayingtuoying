import {
  CheckCircle,
  MagicWand,
  Microphone,
  MusicNotesPlus,
  SlidersHorizontal,
  StopCircle,
  UploadSimple,
  Waveform,
} from '@phosphor-icons/react';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getMusicCompositionStatus,
  submitMusicComposition,
  type MusicComposeStatus,
  type MusicComposeTrack,
} from '../lib/musicCompose';

const MAX_AUDIO_FILE_BYTES = 30 * 1024 * 1024;
const POLL_DELAY_MS = 5000;
const MAX_POLL_ATTEMPTS = 72;

const STYLE_PRESETS = [
  {
    id: 'campus-chamber',
    label: '校园室内乐',
    value: 'warm chamber ensemble, classical crossover, piano and strings',
  },
  {
    id: 'orchestra-sketch',
    label: '管弦草图',
    value: 'cinematic orchestral sketch, woodwinds, strings, gentle percussion',
  },
  {
    id: 'music-education',
    label: '美育课堂',
    value: 'clear educational arrangement, simple motif development, elegant harmony',
  },
];

const MODEL_OPTIONS = [
  { label: 'V4.5 All', value: 'V4_5ALL' },
  { label: 'V4.5', value: 'V4_5' },
  { label: 'V4', value: 'V4' },
];

const STATUS_LABELS: Record<MusicComposeStatus, string> = {
  queued: '排队中',
  processing: '生成中',
  first: '已有初稿',
  complete: '生成完成',
  failed: '生成失败',
};

type RecordingState = 'idle' | 'requesting' | 'recording' | 'stopping';

export function MusicComposePage() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const previewUrlRef = useRef('');
  const pollingControllerRef = useRef<AbortController | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('');
  const [audioSourceLabel, setAudioSourceLabel] = useState('');
  const [prompt, setPrompt] = useState(
    '把这段哼唱动机发展成适合校园古典音乐美育展陈的短编曲，保留旋律轮廓，让和声逐步展开。',
  );
  const [style, setStyle] = useState(STYLE_PRESETS[0].value);
  const [title, setTitle] = useState('我的哼唱动机');
  const [instrumental, setInstrumental] = useState(true);
  const [model, setModel] = useState(MODEL_OPTIONS[0].value);
  const [audioWeight, setAudioWeight] = useState(0.75);
  const [styleWeight, setStyleWeight] = useState(0.6);
  const [negativeTags, setNegativeTags] = useState(
    'copyrighted melody, low quality, noisy recording',
  );
  const [micError, setMicError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [taskId, setTaskId] = useState('');
  const [jobStatus, setJobStatus] = useState<MusicComposeStatus | ''>('');
  const [generationPhase, setGenerationPhase] = useState('');
  const [tracks, setTracks] = useState<MusicComposeTrack[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const canRecord =
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia);
  const isRecording = recordingState === 'recording';
  const canSubmit = Boolean(audioFile && prompt.trim() && !isGenerating);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;

      pollingControllerRef.current?.abort();

      if (recorder && recorder.state !== 'inactive') {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
      }

      stopInputStream();

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function stopInputStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    if (!canRecord) {
      setMicError('当前浏览器不能稳定访问麦克风，可以改用上传音频。');
      return;
    }

    setMicError('');
    setFormError('');
    setRecordingState('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        stopInputStream();
        setRecordingState('idle');

        if (!blob.size) {
          setMicError('没有录到可用声音，请再试一次。');
          return;
        }

        applyAudioFile(
          new File([blob], `hummed-motif-${Date.now()}.${extensionFromMime(blob.type)}`, {
            type: blob.type,
          }),
          '现场录音',
        );
      };

      recorder.start();
      setRecordingState('recording');
    } catch (error) {
      stopInputStream();
      setRecordingState('idle');
      setMicError(getMicrophoneErrorMessage(error));
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === 'inactive') {
      return;
    }

    setRecordingState('stopping');
    recorder.stop();
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (file) {
      applyAudioFile(file, file.name);
    }

    event.currentTarget.value = '';
  }

  function applyAudioFile(file: File, label: string) {
    if (file.size > MAX_AUDIO_FILE_BYTES) {
      setFormError('音频文件过大，请控制在 30MB 以内。');
      return;
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
  }

  function clearAudio() {
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
    setSubmitError('');
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

    pollingControllerRef.current?.abort();

    const controller = new AbortController();

    pollingControllerRef.current = controller;
    setIsGenerating(true);
    setSubmitError('');
    setFormError('');
    setTracks([]);
    setTaskId('');
    setJobStatus('queued');
    setGenerationPhase('正在上传哼唱动机');

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

      setTaskId(nextTask.taskId);
      setGenerationPhase('任务已提交，正在等待 Suno 返回结果');

      await pollTask(nextTask.taskId, controller.signal);
    } catch (error) {
      if (!isAbortError(error)) {
        setSubmitError(getSubmitErrorMessage(error));
        setJobStatus('failed');
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
    setGenerationPhase('已停止等待结果。');
  }

  return (
    <div className="page compose-page">
      <section className="compose-hero">
        <div className="compose-hero__content" data-reveal>
          <p className="eyebrow">音乐编创</p>
          <h1>把一段哼唱动机，扩展成可试听的编曲草图。</h1>
          <p className="compose-hero__summary">
            录入旋律轮廓，再用 prompt 约定情绪、乐器与展陈语境。页面会把动机和参数交给服务端代理，由第三方 Suno API 完成生成。
          </p>
          <div className="hero__actions">
            <a className="button" href="#compose-workbench">
              <Microphone size={18} weight="regular" />
              <span>开始录入动机</span>
            </a>
            <Link className="button--ghost" to="/learn/fundamentals">
              <span>先看节奏与乐理</span>
            </Link>
          </div>
        </div>

        <aside className="compose-hero__panel" data-reveal>
          <div className="compose-hero__signal" aria-hidden="true">
            <Waveform size={72} weight="thin" />
          </div>
          <div className="metric-grid">
            <div className="metric-chip">
              <small>输入</small>
              <strong>哼唱 / 上传</strong>
            </div>
            <div className="metric-chip">
              <small>生成</small>
              <strong>动机续写</strong>
            </div>
            <div className="metric-chip">
              <small>输出</small>
              <strong>1-2 首试听</strong>
            </div>
          </div>
        </aside>
      </section>

      <form className="compose-workbench" id="compose-workbench" onSubmit={handleSubmit}>
        <section className="compose-recorder panel" data-reveal>
          <div className="compose-section-head">
            <span className="compose-step">01</span>
            <div>
              <p className="eyebrow">录入动机</p>
              <h2>先留下旋律轮廓。</h2>
            </div>
          </div>

          <div className="compose-recorder__surface">
            <div className={isRecording ? 'record-orb record-orb--active' : 'record-orb'}>
              <Microphone size={42} weight="regular" />
            </div>
            <div className="compose-recorder__actions">
              {isRecording || recordingState === 'stopping' ? (
                <button
                  className="button"
                  disabled={recordingState === 'stopping'}
                  onClick={stopRecording}
                  type="button"
                >
                  <StopCircle size={18} weight="regular" />
                  <span>{recordingState === 'stopping' ? '正在保存' : '停止录音'}</span>
                </button>
              ) : (
                <button
                  className="button"
                  disabled={recordingState === 'requesting'}
                  onClick={() => void startRecording()}
                  type="button"
                >
                  <Microphone size={18} weight="regular" />
                  <span>{recordingState === 'requesting' ? '等待授权' : '录制哼唱'}</span>
                </button>
              )}
              <label className="button--ghost compose-upload">
                <UploadSimple size={18} weight="regular" />
                <span>上传音频</span>
                <input
                  accept="audio/*"
                  disabled={isGenerating}
                  onChange={handleFileUpload}
                  type="file"
                />
              </label>
            </div>
          </div>

          {audioPreviewUrl ? (
            <div className="compose-audio-preview">
              <div>
                <small className="catalog-label">当前动机</small>
                <strong>{audioSourceLabel}</strong>
                <p>{audioFile ? formatFileSize(audioFile.size) : ''}</p>
              </div>
              <audio controls src={audioPreviewUrl} />
              <button className="button--quiet" onClick={clearAudio} type="button">
                重录或替换
              </button>
            </div>
          ) : (
            <div className="status-message status-message--info">
              <strong>等待一段动机</strong>
              <p>建议录 5 到 30 秒，重复两遍主旋律会更容易被模型抓住。</p>
            </div>
          )}

          {micError ? (
            <div className="status-message status-message--error">
              <strong>麦克风不可用</strong>
              <p>{micError}</p>
            </div>
          ) : null}
        </section>

        <section className="compose-controls panel" data-reveal>
          <div className="compose-section-head">
            <span className="compose-step">02</span>
            <div>
              <p className="eyebrow">描述编曲</p>
              <h2>给 AI 一个音乐方向。</h2>
            </div>
          </div>

          <label className="compose-field">
            <span>作品标题</span>
            <input
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：开放日主题动机"
              type="text"
              value={title}
            />
          </label>

          <label className="compose-field">
            <span>Prompt</span>
            <textarea
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              value={prompt}
            />
          </label>

          <div className="compose-style-presets" aria-label="风格预设">
            {STYLE_PRESETS.map((preset) => (
              <button
                className={style === preset.value ? 'chip chip--active' : 'chip'}
                key={preset.id}
                onClick={() => setStyle(preset.value)}
                type="button"
              >
                <MusicNotesPlus size={16} weight="regular" />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

          <label className="compose-field">
            <span>风格标签</span>
            <input
              onChange={(event) => setStyle(event.target.value)}
              type="text"
              value={style}
            />
          </label>

          <div className="compose-field-grid">
            <label className="compose-field">
              <span>模型</span>
              <select onChange={(event) => setModel(event.target.value)} value={model}>
                {MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="compose-toggle">
              <input
                checked={instrumental}
                onChange={(event) => setInstrumental(event.target.checked)}
                type="checkbox"
              />
              <span>生成纯音乐</span>
            </label>
          </div>

          <div className="compose-slider-grid">
            <label className="compose-slider">
              <span>
                动机影响 <strong>{Math.round(audioWeight * 100)}%</strong>
              </span>
              <input
                max="1"
                min="0.1"
                onChange={(event) => setAudioWeight(Number(event.target.value))}
                step="0.05"
                type="range"
                value={audioWeight}
              />
            </label>
            <label className="compose-slider">
              <span>
                风格影响 <strong>{Math.round(styleWeight * 100)}%</strong>
              </span>
              <input
                max="1"
                min="0.1"
                onChange={(event) => setStyleWeight(Number(event.target.value))}
                step="0.05"
                type="range"
                value={styleWeight}
              />
            </label>
          </div>

          <label className="compose-field">
            <span>负向标签</span>
            <input
              onChange={(event) => setNegativeTags(event.target.value)}
              type="text"
              value={negativeTags}
            />
          </label>

          {formError ? (
            <div className="status-message status-message--error">
              <strong>提交前需要补充</strong>
              <p>{formError}</p>
            </div>
          ) : null}

          <div className="compose-submit-row">
            <button className="button" disabled={!canSubmit} type="submit">
              <MagicWand size={18} weight="regular" />
              <span>{isGenerating ? '正在生成' : '生成编曲'}</span>
            </button>
            {isGenerating ? (
              <button className="button--ghost" onClick={cancelPolling} type="button">
                停止等待
              </button>
            ) : null}
          </div>
        </section>
      </form>

      <section className="compose-result panel" data-reveal>
        <div className="compose-section-head">
          <span className="compose-step">03</span>
          <div>
            <p className="eyebrow">生成试听</p>
            <h2>结果会留在这里。</h2>
          </div>
        </div>

        <div className="compose-status" aria-live="polite">
          <span
            className={
              jobStatus
                ? `compose-status__dot compose-status__dot--${jobStatus}`
                : 'compose-status__dot'
            }
          />
          <div>
            <strong>{jobStatus ? STATUS_LABELS[jobStatus] : '等待提交'}</strong>
            <p>{generationPhase || '录入动机并提交后，这里会显示第三方生成状态。'}</p>
            {taskId ? <code className="mono-note">taskId: {taskId}</code> : null}
          </div>
        </div>

        {submitError ? (
          <div className="status-message status-message--error">
            <strong>生成请求失败</strong>
            <p>{submitError}</p>
          </div>
        ) : null}

        {tracks.length ? (
          <div className="compose-track-list">
            {tracks.map((track) => (
              <article className="compose-track" key={track.id}>
                {track.imageUrl ? (
                  <img src={track.imageUrl} alt={`${track.title} 封面`} />
                ) : (
                  <div className="compose-track__placeholder">
                    <CheckCircle size={28} weight="regular" />
                  </div>
                )}
                <div className="compose-track__body">
                  <div>
                    <small className="catalog-label">
                      {track.duration ? `${Math.round(track.duration)} 秒` : 'AI 编曲'}
                    </small>
                    <strong>{track.title}</strong>
                    {track.style ? <p>{track.style}</p> : null}
                  </div>
                  <audio controls src={track.audioUrl} />
                  <a className="button--quiet" href={track.audioUrl} rel="noreferrer" target="_blank">
                    打开音频链接
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="compose-empty-state">
            <SlidersHorizontal size={28} weight="regular" />
            <p>生成完成后会显示试听播放器；如果第三方接口返回两首版本，这里会同时列出。</p>
          </div>
        )}
      </section>
    </div>
  );
}

function getSupportedRecorderMimeType() {
  const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

  return mimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? '';
}

function extensionFromMime(mimeType: string) {
  if (mimeType.includes('mp4')) {
    return 'm4a';
  }

  if (mimeType.includes('wav')) {
    return 'wav';
  }

  return 'webm';
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function wait(timeout: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError());
      return;
    }

    const timer = window.setTimeout(resolve, timeout);

    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer);
        reject(createAbortError());
      },
      { once: true },
    );
  });
}

function createAbortError() {
  return new DOMException('等待已取消。', 'AbortError');
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function getMicrophoneErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return '浏览器没有获得麦克风权限，可以允许权限后重试，或直接上传音频。';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '麦克风启动失败，可以改用上传音频。';
}

function getSubmitErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return '生成请求失败，请稍后重试。';
}
