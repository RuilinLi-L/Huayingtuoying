import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync, statSync } from 'node:fs';
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

const cacheableAssetExtensions = new Set([
  '.js',
  '.css',
  '.json',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.wav',
  '.mp3',
  '.m4a',
  '.glb',
  '.gltf',
  '.bin',
]);

function getFilePath(urlPath) {
  const safePath = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const maybeFile = join(distDir, safePath);
  return maybeFile;
}

function parseRangeHeader(rangeHeader, fileSize) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader ?? '');

  if (!match) {
    return null;
  }

  const [, startText, endText] = match;

  if (!startText && !endText) {
    return null;
  }

  if (!startText) {
    const suffixLength = Number(endText);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
      return null;
    }

    const start = Math.max(fileSize - suffixLength, 0);
    return { start, end: fileSize - 1 };
  }

  const start = Number(startText);
  const end = endText ? Number(endText) : fileSize - 1;

  if (
    !Number.isInteger(start)
    || !Number.isInteger(end)
    || start < 0
    || end < start
    || start >= fileSize
  ) {
    return null;
  }

  return {
    start,
    end: Math.min(end, fileSize - 1),
  };
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
      const contentType = contentTypes[ext] || 'application/octet-stream';
      const fileSize = statSync(filePath).size;
      const range = parseRangeHeader(req.headers.range, fileSize);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', 'bytes');

      if (cacheableAssetExtensions.has(ext)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }

      if (req.headers.range && !range) {
        res.statusCode = 416;
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        res.end();
        return;
      }

      if (range) {
        res.statusCode = 206;
        res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${fileSize}`);
        res.setHeader('Content-Length', range.end - range.start + 1);
        createReadStream(filePath, range).pipe(res);
        return;
      }

      res.setHeader('Content-Length', fileSize);
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
