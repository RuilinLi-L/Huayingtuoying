import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

export type RecordingState =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'stopping'
  | 'recorded'
  | 'error';

export function useComposeRecorder(onRecorded: (file: File) => boolean) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mountedRef = useRef(false);
  const requestTokenRef = useRef(0);
  const onRecordedRef = useRef(onRecorded);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [micError, setMicError] = useState('');

  onRecordedRef.current = onRecorded;

  const canRecord =
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestTokenRef.current += 1;
      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== 'inactive') {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
      }

      stopInputStream();
    };
  }, []);

  function stopInputStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    if (!canRecord) {
      setRecordingState('error');
      setMicError('当前设备不支持录音，可以改用上传音频。');
      return;
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      return;
    }

    const token = ++requestTokenRef.current;
    setMicError('');
    // Commit busy controls and the preview's pause before requesting microphone access.
    flushSync(() => setRecordingState('requesting'));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (!mountedRef.current || token !== requestTokenRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const mimeType = getSupportedRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

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

        mediaRecorderRef.current = null;
        stopInputStream();

        if (!mountedRef.current) {
          return;
        }

        if (!blob.size) {
          setRecordingState('error');
          setMicError('没有录到可用声音，请再试一次。');
          return;
        }

        const file = new File(
          [blob],
          `hummed-motif-${Date.now()}.${extensionFromMime(blob.type)}`,
          { type: blob.type },
        );
        setRecordingState(onRecordedRef.current(file) ? 'recorded' : 'error');
      };

      recorder.start();
      setRecordingState('recording');
    } catch (error) {
      if (token !== requestTokenRef.current) {
        return;
      }

      stopInputStream();
      mediaRecorderRef.current = null;

      if (mountedRef.current) {
        setRecordingState('error');
        setMicError(getMicrophoneErrorMessage(error));
      }
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

  function markAudioSelected() {
    requestTokenRef.current += 1;
    setRecordingState('recorded');
    setMicError('');
  }

  function resetRecordingState() {
    requestTokenRef.current += 1;
    setRecordingState('idle');
    setMicError('');
  }

  return {
    canRecord,
    micError,
    recordingState,
    startRecording,
    stopRecording,
    markAudioSelected,
    resetRecordingState,
  };
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

function getMicrophoneErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return '浏览器没有获得麦克风权限，可以允许权限后重试，或直接上传音频。';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '麦克风启动失败，可以改用上传音频。';
}
