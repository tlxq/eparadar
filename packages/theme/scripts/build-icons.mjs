import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const mobile = (name) => here(`../../../apps/mobile/assets/images/${name}`);

const inner = (svg) => svg.replace(/^<svg[^>]*>|<\/svg>\s*$/g, '');
const car = inner(readFileSync(here('../assets/icon-car.svg'), 'utf8'));
const mark = inner(readFileSync(here('../assets/icon.svg'), 'utf8'));

const background = (radius = 0) =>
  `<defs><linearGradient id="tile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17264D"/><stop offset="1" stop-color="#0B0E14"/></linearGradient></defs><rect width="64" height="64" rx="${radius}" fill="url(#tile)"/>`;

const svg = (body, { scale = 1, color } = {}) => {
  const offset = 32 - 32 * scale;
  const content = color ? body.replaceAll('currentColor', color) : body;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g transform="translate(${offset} ${offset}) scale(${scale})">${content}</g></svg>`;
};

const tile = (radius) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${background(radius)}${car}</svg>`;

const png = (source, size, path) =>
  sharp(Buffer.from(source), { density: (72 * size) / 64 })
    .resize(size, size)
    .png()
    .toFile(path);

const adaptive = 0.62;

await Promise.all([
  png(tile(0), 1024, mobile('icon.png')),
  png(tile(14), 48, mobile('favicon.png')),
  png(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${background()}</svg>`,
    1024,
    mobile('android-icon-background.png'),
  ),
  png(svg(car, { scale: adaptive }), 1024, mobile('android-icon-foreground.png')),
  png(
    svg(mark, { scale: adaptive, color: '#FFFFFF' }),
    1024,
    mobile('android-icon-monochrome.png'),
  ),
  png(svg(car), 1024, mobile('splash-icon.png')),
]);

copyFileSync(
  here('../assets/icon-car.svg'),
  here('../../../apps/mobile/assets/expo.icon/Assets/eparadar-icon.svg'),
);
writeFileSync(here('../../../apps/web/public/favicon.svg'), tile(14) + '\n');

console.log('Icons written');
