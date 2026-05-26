import { sendJson } from '../../server/music.js';

export default async function handler(request, response) {
  if (request.method !== 'POST' && request.method !== 'GET') {
    response.setHeader('allow', 'GET, POST');
    sendJson(response, 405, { message: '仅支持 GET 或 POST 回调。' });
    return;
  }

  sendJson(response, 200, { ok: true });
}
