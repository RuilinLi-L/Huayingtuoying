import { getConfig, getTaskStatus, sendJson } from '../../server/music.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('allow', 'GET');
    sendJson(response, 405, { message: '仅支持 GET 请求。' });
    return;
  }

  const taskId = String(request.query?.taskId ?? '').trim();

  if (!taskId) {
    sendJson(response, 400, { message: '缺少 taskId。' });
    return;
  }

  try {
    const config = getConfig();
    const status = await getTaskStatus(taskId, config);

    sendJson(response, 200, status);
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询音乐编创状态失败。';

    sendJson(response, 400, { message });
  }
}
