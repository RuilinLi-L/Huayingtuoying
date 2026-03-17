import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const args = process.argv.slice(2);
const baseUrlArgIndex = args.findIndex((arg) => arg === '--base-url');
const baseUrl =
  (baseUrlArgIndex >= 0 ? args[baseUrlArgIndex + 1] : undefined) ||
  process.env.BASE_URL ||
  'http://localhost:5173';

const entriesPath = resolve(projectRoot, 'src', 'data', 'entries.json');
const generatedDir = resolve(projectRoot, 'generated');
const qrDir = resolve(generatedDir, 'qrcodes');
const manifestRaw = await readFile(entriesPath, 'utf8');
const entries = JSON.parse(manifestRaw);

await mkdir(qrDir, { recursive: true });

const records = await Promise.all(
  entries.map(async (entry) => {
    const nfcUrl = new URL(baseUrl);
    nfcUrl.searchParams.set('entry', entry.id);
    nfcUrl.searchParams.set('source', 'nfc');
    nfcUrl.searchParams.set('autostart', '1');

    const qrUrl = new URL(baseUrl);
    qrUrl.searchParams.set('entry', entry.id);
    qrUrl.searchParams.set('source', 'qr');
    qrUrl.searchParams.set('autostart', '1');

    const qrSvg = await QRCode.toString(qrUrl.toString(), {
      type: 'svg',
      margin: 1,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    });

    const qrPath = resolve(qrDir, `${entry.id}.svg`);
    await writeFile(qrPath, qrSvg, 'utf8');

    return {
      id: entry.id,
      title: entry.title,
      nfcUrl: nfcUrl.toString(),
      qrUrl: qrUrl.toString(),
      qrPath: `generated/qrcodes/${entry.id}.svg`,
      targetImage: entry.targetImage,
    };
  }),
);

await writeFile(
  resolve(generatedDir, 'nfc-links.json'),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      baseUrl,
      entries: records,
    },
    null,
    2,
  )}\n`,
  'utf8',
);

console.log(`Exported ${records.length} entry links for ${baseUrl}`);
