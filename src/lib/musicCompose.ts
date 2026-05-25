export type MusicComposeStatus =
  | 'queued'
  | 'processing'
  | 'first'
  | 'complete'
  | 'failed';

export type MusicComposeTrack = {
  id: string;
  title: string;
  audioUrl: string;
  imageUrl?: string;
  duration?: number | null;
  style?: string;
};

export type MusicComposeRequest = {
  audio: File;
  prompt: string;
  style: string;
  title: string;
  instrumental: boolean;
  model: string;
  audioWeight: number;
  styleWeight: number;
  negativeTags: string;
};

export type MusicComposeTask = {
  taskId: string;
};

export type MusicComposeResult = {
  taskId: string;
  status: MusicComposeStatus;
  tracks: MusicComposeTrack[];
  message?: string;
};

export async function submitMusicComposition(
  request: MusicComposeRequest,
  signal?: AbortSignal,
) {
  const formData = new FormData();

  formData.append('audio', request.audio, request.audio.name || 'motif.webm');
  formData.append('prompt', request.prompt);
  formData.append('style', request.style);
  formData.append('title', request.title);
  formData.append('instrumental', String(request.instrumental));
  formData.append('model', request.model);
  formData.append('audioWeight', String(request.audioWeight));
  formData.append('styleWeight', String(request.styleWeight));
  formData.append('negativeTags', request.negativeTags);

  const response = await fetch('/api/music/compose', {
    method: 'POST',
    body: formData,
    signal,
  });

  return parseApiResponse<MusicComposeTask>(response);
}

export async function getMusicCompositionStatus(
  taskId: string,
  signal?: AbortSignal,
) {
  const response = await fetch(
    `/api/music/status?taskId=${encodeURIComponent(taskId)}`,
    { signal },
  );

  return parseApiResponse<MusicComposeResult>(response);
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let json: unknown = {};

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  if (!response.ok) {
    throw new Error(readMessage(json) || `请求失败：${response.status}`);
  }

  return json as T;
}

function readMessage(value: unknown) {
  if (!value || typeof value !== 'object' || !('message' in value)) {
    return '';
  }

  const message = (value as { message?: unknown }).message;

  return typeof message === 'string' ? message : '';
}
