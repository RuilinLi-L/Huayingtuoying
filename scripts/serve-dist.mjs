import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');
const distDir = resolve(projectRoot, 'dist');
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
};

function getFilePath(urlPath) {
  const safePath = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const maybeFile = join(distDir, safePath);
  return maybeFile;
}

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let filePath = getFilePath(requestUrl.pathname);

    if (requestUrl.pathname === '/') {
      filePath = join(distDir, 'index.html');
    }

    if (existsSync(filePath) && !filePath.endsWith('\\') && !filePath.endsWith('/')) {
      const ext = extname(filePath).toLowerCase();
      res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
      createReadStream(filePath).pipe(res);
      return;
    }

    const indexHtml = await readFile(join(distDir, 'index.html'));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(indexHtml);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(`Preview server error: ${error instanceof Error ? error.message : String(error)}`);
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Static preview server listening on http://0.0.0.0:${port}`);
});
