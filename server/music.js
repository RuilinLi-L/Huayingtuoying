const DEFAULT_API_BASE_URL = 'https://api.sunoapi.org';
const DEFAULT_UPLOAD_BASE_URL = 'https://sunoapiorg.redpandaai.co';
const DEFAULT_UPLOAD_PATH = '/api/file-upload';
const DEFAULT_COVER_PATH = '/api/v1/generate/upload-cover';
const DEFAULT_STATUS_PATH = '/api/v1/generate/record-info';
const MAX_AUDIO_BYTES = 30 * 1024 * 1024;

export function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

export function getConfig() {
  const apiKey = process.env.SUNO_API_KEY;

  if (!apiKey) {
    throw new Error('缺少 SUNO_API_KEY 环境变量，服务端无法调用音乐生成接口。');
  }

  return {
    apiKey,
    apiBaseUrl: normalizeBaseUrl(process.env.SUNO_API_BASE_URL ?? DEFAULT_API_BASE_URL),
    uploadBaseUrl: normalizeBaseUrl(
      process.env.SUNO_UPLOAD_BASE_URL ?? DEFAULT_UPLOAD_BASE_URL,
    ),
    uploadUrl: process.env.SUNO_UPLOAD_URL,
    coverUrl: process.env.SUNO_COVER_URL,
    statusUrl: process.env.SUNO_STATUS_URL,
    audioUrlField: process.env.SUNO_AUDIO_URL_FIELD ?? 'uploadUrl',
    uploadPath: process.env.SUNO_UPLOAD_PATH ?? DEFAULT_UPLOAD_PATH,
    coverPath: process.env.SUNO_COVER_PATH ?? DEFAULT_COVER_PATH,
    statusPath: process.env.SUNO_STATUS_PATH ?? DEFAULT_STATUS_PATH,
  };
}

export async function parseMultipartRequest(request) {
  const contentType = request.headers['content-type'] ?? '';
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!boundaryMatch) {
    throw new Error('请求格式不正确：缺少 multipart boundary。');
  }

  const body = await readRequestBody(request, MAX_AUDIO_BYTES + 1024 * 1024);
  const parts = parseMultipartBody(body, boundaryMatch[1] ?? boundaryMatch[2]);
  const fields = {};
  let audio = null;

  for (const part of parts) {
    if (!part.name) {
      continue;
    }

    if (part.filename) {
      if (part.name === 'audio') {
        audio = {
          buffer: part.data,
          filename: part.filename,
          contentType: part.contentType || 'application/octet-stream',
        };
      }
      continue;
    }

    fields[part.name] = part.data.toString('utf8');
  }

  if (!audio) {
    throw new Error('请先录制或上传一段哼唱动机。');
  }

  if (audio.buffer.length > MAX_AUDIO_BYTES) {
    throw new Error('音频文件过大，请控制在 30MB 以内。');
  }

  return { fields, audio };
}

export async function uploadAudioFile(audio, config) {
  const uploadUrl = config.uploadUrl ?? buildUrl(config.uploadBaseUrl, config.uploadPath);
  const formData = new FormData();
  const fileBlob = new Blob([audio.buffer], { type: audio.contentType });

  formData.append('file', fileBlob, audio.filename || 'motif.webm');

  const json = await fetchJson(
    uploadUrl,
    {
      method: 'POST',
      headers: buildAuthHeaders(config.apiKey),
      body: formData,
    },
    '上传音频',
  );
  const fileUrl = pickFirstString(json, [
    ['data', 'url'],
    ['data', 'fileUrl'],
    ['data', 'uploadUrl'],
    ['data', 'downloadUrl'],
    ['url'],
    ['fileUrl'],
    ['uploadUrl'],
  ]);

  if (!fileUrl) {
    throw new Error('音频上传成功但没有返回可用 URL，请检查第三方 Suno 文件上传接口响应。');
  }

  return fileUrl;
}

export async function createCoverTask(fields, audioUrl, config) {
  const coverUrl = config.coverUrl ?? buildUrl(config.apiBaseUrl, config.coverPath);
  const prompt = requireTrimmed(fields.prompt, 'prompt');
  const payload = {
    prompt,
    style: fields.style?.trim() || 'classical crossover, chamber ensemble, campus exhibition',
    title: fields.title?.trim() || '哼唱动机编曲草图',
    customMode: true,
    instrumental: normalizeBoolean(fields.instrumental, true),
    model: fields.model?.trim() || 'V4_5ALL',
    negativeTags:
      fields.negativeTags?.trim() || 'copyrighted melody, low quality, noisy recording',
  };

  payload[config.audioUrlField] = audioUrl;

  const audioWeight = normalizeNumber(fields.audioWeight);
  const styleWeight = normalizeNumber(fields.styleWeight);

  if (audioWeight !== null) {
    payload.audioWeight = audioWeight;
  }

  if (styleWeight !== null) {
    payload.styleWeight = styleWeight;
  }

  const json = await fetchJson(
    coverUrl,
    {
      method: 'POST',
      headers: {
        ...buildAuthHeaders(config.apiKey),
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    '提交编曲任务',
  );
  const taskId = pickFirstString(json, [
    ['data', 'taskId'],
    ['data', 'id'],
    ['taskId'],
    ['id'],
  ]);

  if (!taskId) {
    throw new Error('编曲任务已提交但没有返回 taskId，请检查第三方 Suno 生成接口响应。');
  }

  return taskId;
}

export async function getTaskStatus(taskId, config) {
  const statusUrl =
    config.statusUrl ??
    `${buildUrl(config.apiBaseUrl, config.statusPath)}?taskId=${encodeURIComponent(taskId)}`;
  const url = config.statusUrl
    ? appendQuery(config.statusUrl, 'taskId', taskId)
    : statusUrl;
  const json = await fetchJson(
    url,
    {
      method: 'GET',
      headers: buildAuthHeaders(config.apiKey),
    },
    '查询编曲状态',
  );

  return normalizeStatusResponse(taskId, json);
}

function parseMultipartBody(body, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const segments = splitBuffer(body, delimiter);
  const parts = [];

  for (const segment of segments) {
    const part = trimPartBoundary(segment);

    if (!part.length || part.equals(Buffer.from('--'))) {
      continue;
    }

    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));

    if (headerEnd < 0) {
      continue;
    }

    const rawHeaders = part.subarray(0, headerEnd).toString('utf8');
    let data = part.subarray(headerEnd + 4);

    if (data.length >= 2 && data.subarray(data.length - 2).equals(Buffer.from('\r\n'))) {
      data = data.subarray(0, data.length - 2);
    }

    const disposition = rawHeaders.match(/content-disposition:\s*([^\r\n]+)/i)?.[1] ?? '';
    const name = disposition.match(/name="([^"]+)"/i)?.[1] ?? '';
    const filename = disposition.match(/filename="([^"]*)"/i)?.[1] ?? '';
    const contentType =
      rawHeaders.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim() ?? '';

    parts.push({ name, filename, contentType, data });
  }

  return parts;
}

function splitBuffer(buffer, delimiter) {
  const segments = [];
  let start = 0;
  let index = buffer.indexOf(delimiter, start);

  while (index !== -1) {
    segments.push(buffer.subarray(start, index));
    start = index + delimiter.length;
    index = buffer.indexOf(delimiter, start);
  }

  segments.push(buffer.subarray(start));

  return segments;
}

function trimPartBoundary(buffer) {
  let start = 0;
  let end = buffer.length;

  if (buffer.subarray(0, 2).equals(Buffer.from('\r\n'))) {
    start = 2;
  }

  if (buffer.subarray(end - 2, end).equals(Buffer.from('\r\n'))) {
    end -= 2;
  }

  return buffer.subarray(start, end);
}

function readRequestBody(request, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    request.on('data', (chunk) => {
      totalBytes += chunk.length;

      if (totalBytes > maxBytes) {
        reject(new Error('请求体过大，请压缩或缩短音频后重试。'));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

async function fetchJson(url, options, label) {
  const response = await fetch(url, options);
  const rawText = await response.text();
  let json = null;

  try {
    json = rawText ? JSON.parse(rawText) : {};
  } catch {
    json = { raw: rawText };
  }

  if (!response.ok) {
    const detail = extractErrorMessage(json) || rawText.slice(0, 240);
    throw new Error(`${label}失败：${response.status} ${detail}`.trim());
  }

  const serviceCode = getNumericCode(json);

  if (serviceCode !== null && serviceCode >= 400) {
    throw new Error(`${label}失败：${extractErrorMessage(json) || `服务返回 ${serviceCode}`}`);
  }

  return json;
}

function normalizeStatusResponse(taskId, json) {
  const rawStatus =
    pickFirstString(json, [
      ['data', 'status'],
      ['data', 'taskStatus'],
      ['data', 'state'],
      ['status'],
      ['taskStatus'],
      ['state'],
    ]) ?? '';
  const tracks = collectTrackCandidates(json).map(normalizeTrack).filter(Boolean);
  const status = normalizeStatus(rawStatus, tracks.length);
  const message = extractErrorMessage(json) || statusMessage(status);

  return {
    taskId,
    status,
    tracks,
    message,
  };
}

function collectTrackCandidates(value, depth = 0, results = []) {
  if (!value || depth > 8) {
    return results;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectTrackCandidates(item, depth + 1, results);
    }
    return results;
  }

  if (typeof value !== 'object') {
    return results;
  }

  if (hasTrackAudio(value)) {
    results.push(value);
  }

  for (const item of Object.values(value)) {
    collectTrackCandidates(item, depth + 1, results);
  }

  return results;
}

function normalizeTrack(track) {
  const audioUrl =
    getStringValue(track, 'audioUrl') ??
    getStringValue(track, 'audio_url') ??
    getStringValue(track, 'sourceAudioUrl') ??
    getStringValue(track, 'source_audio_url') ??
    getStringValue(track, 'streamAudioUrl') ??
    getStringValue(track, 'stream_audio_url');

  if (!audioUrl) {
    return null;
  }

  return {
    id:
      getStringValue(track, 'id') ??
      getStringValue(track, 'audioId') ??
      getStringValue(track, 'clipId') ??
      audioUrl,
    title: getStringValue(track, 'title') ?? getStringValue(track, 'name') ?? 'AI 编曲结果',
    audioUrl,
    imageUrl:
      getStringValue(track, 'imageUrl') ??
      getStringValue(track, 'image_url') ??
      getStringValue(track, 'coverUrl') ??
      '',
    duration: normalizeNumber(track.duration) ?? normalizeNumber(track.durationSeconds),
    style: getStringValue(track, 'style') ?? getStringValue(track, 'tags') ?? '',
  };
}

function hasTrackAudio(value) {
  return [
    'audioUrl',
    'audio_url',
    'sourceAudioUrl',
    'source_audio_url',
    'streamAudioUrl',
    'stream_audio_url',
  ].some((key) => typeof value[key] === 'string' && value[key]);
}

function normalizeStatus(status, trackCount) {
  const value = status.toLowerCase();

  if (value.includes('fail') || value.includes('error') || value.includes('reject')) {
    return 'failed';
  }

  if (
    value.includes('complete') ||
    value.includes('success') ||
    value.includes('finished') ||
    value === 'done' ||
    (trackCount > 0 && !value)
  ) {
    return 'complete';
  }

  if (value.includes('first')) {
    return 'first';
  }

  if (value.includes('queue') || value.includes('pending') || value.includes('wait')) {
    return 'queued';
  }

  return 'processing';
}

function statusMessage(status) {
  switch (status) {
    case 'queued':
      return '任务已排队。';
    case 'first':
      return '第一段结果已生成，完整结果仍在处理中。';
    case 'complete':
      return '生成完成。';
    case 'failed':
      return '生成失败。';
    default:
      return '正在生成编曲。';
  }
}

function requireTrimmed(value, fieldName) {
  const nextValue = value?.trim() ?? '';

  if (!nextValue) {
    throw new Error(`请填写 ${fieldName}。`);
  }

  return nextValue;
}

function buildAuthHeaders(apiKey) {
  return {
    authorization: `Bearer ${apiKey}`,
  };
}

function normalizeBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  return value === 'true' || value === '1' || value === true;
}

function normalizeNumber(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '');
}

function buildUrl(baseUrl, path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}

function appendQuery(url, key, value) {
  const parsedUrl = new URL(url);

  parsedUrl.searchParams.set(key, value);

  return parsedUrl.toString();
}

function pickFirstString(value, paths) {
  for (const path of paths) {
    const nextValue = getPath(value, path);

    if (typeof nextValue === 'string' && nextValue.trim()) {
      return nextValue.trim();
    }
  }

  return null;
}

function getPath(value, path) {
  let current = value;

  for (const key of path) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    current = current[key];
  }

  return current;
}

function getStringValue(value, key) {
  const nextValue = value[key];

  return typeof nextValue === 'string' && nextValue.trim() ? nextValue.trim() : null;
}

function getNumericCode(value) {
  const code = value?.code ?? value?.statusCode;
  const numericCode = Number(code);

  return Number.isFinite(numericCode) ? numericCode : null;
}

function extractErrorMessage(value) {
  return (
    pickFirstString(value, [
      ['message'],
      ['msg'],
      ['error'],
      ['data', 'message'],
      ['data', 'msg'],
      ['data', 'error'],
    ]) ?? ''
  );
}
