#!/usr/bin/env node
/*
 * Rebuild every raster brand asset from the single vector source
 * web/public/icons/logo-1024.svg:
 *
 *   1. logo-1024.png            (1024x1024, the source for all PWA sizes)
 *   2. icon-{48..512}.png,      (via generate-icons.js)
 *      icon-512-maskable.png,
 *      apple-touch-icon-180.png
 *   3. electron/assets/dotclaw-icon.png
 *   4. electron/assets/dotclaw.icns
 *
 * Run with: npm run brand:icons   (from web/)
 * Never hand-edit the PNGs; edit the SVG and re-run this.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, '..');
const repoRoot = join(webRoot, '..');

const svgSource = join(webRoot, 'public', 'icons', 'logo-1024.svg');
const png1024 = join(webRoot, 'public', 'icons', 'logo-1024.png');
const electronPng = join(repoRoot, 'electron', 'assets', 'dotclaw-icon.png');
const electronIcns = join(repoRoot, 'electron', 'assets', 'dotclaw.icns');

console.log(`source: ${svgSource}`);

// 1. vector -> 1024 raster
await sharp(Buffer.from(readFileSync(svgSource)), { density: 300 })
  .resize(1024, 1024)
  .png()
  .toFile(png1024);
console.log(`ok  ${png1024}`);

// 2. full PWA icon set from the new 1024 source
execFileSync(process.execPath, [join(__dirname, 'generate-icons.js')], {
  cwd: webRoot,
  stdio: 'inherit',
});

// 3. Electron desktop icon
const source = readFileSync(png1024);
writeFileSync(electronPng, source);
console.log(`ok  ${electronPng}`);

// 4. macOS bundle icon
//
// sharp has no ICNS writer, but the format is trivial: an 'icns' magic, a
// big-endian total length, then one entry per icon type (fourcc + BE length +
// payload). Modern macOS accepts PNG payloads for every icNN type, so the
// bundle can be produced on any platform without iconutil.
const ICNS_TYPES = [
  ['ic07', 128],
  ['ic08', 256],
  ['ic09', 512],
  ['ic10', 1024],
  ['ic11', 32],
  ['ic12', 64],
  ['ic13', 256],
  ['ic14', 512],
];

async function writeIcns(pngBuffer, target) {
  const entries = [];
  for (const [fourcc, size] of ICNS_TYPES) {
    const data = await sharp(pngBuffer)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toBuffer();
    const body = Buffer.alloc(8 + data.length);
    body.write(fourcc, 0, 'ascii');
    body.writeUInt32BE(body.length, 4);
    data.copy(body, 8);
    entries.push(body);
  }
  const payload = Buffer.concat(entries);
  const head = Buffer.alloc(8);
  head.write('icns', 0, 'ascii');
  head.writeUInt32BE(8 + payload.length, 4);
  writeFileSync(target, Buffer.concat([head, payload]));
}

try {
  await writeIcns(source, electronIcns);
  console.log(`ok  ${electronIcns}`);
} catch (error) {
  console.warn(`skip ${electronIcns}: ${error.message}`);
  console.warn(
    '     regenerate it on macOS with: iconutil -c icns icon.iconset',
  );
}

console.log('\nbrand assets rebuilt');
