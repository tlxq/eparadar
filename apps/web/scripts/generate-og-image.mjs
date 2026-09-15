import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;

const photoPath = fileURLToPath(new URL('../src/assets/park-bokeh.webp', import.meta.url));
const iconPath = fileURLToPath(import.meta.resolve('@eparadar/theme/assets/icon.svg'));
const outputPath = fileURLToPath(new URL('../public/og-image.jpg', import.meta.url));

const iconMarkup = readFileSync(iconPath, 'utf8')
  .replace(/<\/?svg[^>]*>/g, '')
  .replace(/currentColor/g, '#2F6FED');

const overlay = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0B0E14" stop-opacity="0.5" />
      <stop offset="50%" stop-color="#0B0E14" stop-opacity="0.82" />
      <stop offset="100%" stop-color="#0B0E14" stop-opacity="0.95" />
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)" />
  <svg x="64" y="418" width="180" height="180" viewBox="0 0 64 64">${iconMarkup}</svg>
</svg>
`;

await sharp(photoPath)
  .resize(WIDTH, HEIGHT, { fit: 'cover' })
  .composite([{ input: Buffer.from(overlay) }])
  .jpeg({ quality: 82 })
  .toFile(outputPath);

console.log(`Wrote ${outputPath}`);
