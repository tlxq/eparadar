import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;
const PAD = 72;
const FG = '#F4F6F9';
const ICON = 64;

const FONT_URL = 'https://github.com/google/fonts/raw/main/ofl/intertight/InterTight%5Bwght%5D.ttf';
const fontDir = fileURLToPath(new URL('../node_modules/.cache/og-fonts/', import.meta.url));
const fontPath = `${fontDir}InterTight.ttf`;

const photoPath = fileURLToPath(new URL('../src/assets/park-bokeh.webp', import.meta.url));
const iconPath = fileURLToPath(new URL('../public/favicon.svg', import.meta.url));
const CARDS = [
  { file: 'og-image.jpg', headline: 'Kompisar på en karta.' },
  { file: 'og-image-en.jpg', headline: 'Friends on a map.' },
];

if (!existsSync(fontPath)) {
  const response = await fetch(FONT_URL);
  if (!response.ok) throw new Error(`Font download failed: ${response.status}`);
  mkdirSync(fontDir, { recursive: true });
  writeFileSync(fontPath, Buffer.from(await response.arrayBuffer()));
}

const text = (markup, size) =>
  sharp({
    text: {
      text: `<span foreground="${FG}">${markup}</span>`,
      font: `Inter Tight ${size}`,
      fontfile: fontPath,
      dpi: 72,
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });

const name = await text('epaRadar', 34);

const iconMarkup = readFileSync(iconPath, 'utf8').replace(/<\/?svg[^>]*>/g, '');

const overlay = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#000" stop-opacity="0.82" />
      <stop offset="60%" stop-color="#000" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#000" stop-opacity="0.3" />
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#000" fill-opacity="0.35" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)" />
  <svg x="${PAD}" y="${PAD}" width="${ICON}" height="${ICON}" viewBox="0 0 64 64">${iconMarkup}</svg>
</svg>
`;

for (const card of CARDS) {
  const outputPath = fileURLToPath(new URL(`../public/${card.file}`, import.meta.url));
  const headline = await text(card.headline, 92);
  await sharp(photoPath)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
    .composite([
      { input: Buffer.from(overlay) },
      {
        input: name.data,
        left: PAD + ICON + 18,
        top: PAD + Math.round((ICON - name.info.height) / 2),
      },
      { input: headline.data, left: PAD, top: HEIGHT - PAD - headline.info.height },
    ])
    .jpeg({ quality: 82 })
    .toFile(outputPath);

  console.log(`Wrote ${outputPath}`);
}
