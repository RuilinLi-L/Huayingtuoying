import {
  createCoverTask,
  getConfig,
  parseMultipartRequest,
  sendJson,
  uploadAudioFile,
} from '../../server/music.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('allow', 'POST');
    sendJson(response, 405, { message: '仅支持 POST 请求。' });
    return;
  }

  try {
    const config = getConfig();
    const { fields, audio } = await parseMultipartRequest(request);
    const audioUrl = await uploadAudioFile(audio, config);
    const taskId = await createCoverTask(fields, audioUrl, config);

    sendJson(response, 200, { taskId });
  } catch (error) {
    const message = error instanceof Error ? error.message : '音乐编创请求失败。';

    sendJson(response, 400, { message });
  }
}
