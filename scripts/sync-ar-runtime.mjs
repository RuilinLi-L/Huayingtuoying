import { cp, mkdir } from 'node:fs/promises';
const target = 'public/vendor/8thwall-1.0.0';
await mkdir(target, { recursive: true });
// Keep the distributed engine unmodified, including its copyright and license.
await cp('node_modules/@8thwall/engine-binary/dist', target, { recursive: true });
