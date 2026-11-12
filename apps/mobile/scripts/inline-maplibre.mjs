import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pkgPath = require.resolve('maplibre-gl/package.json');
const dist = join(dirname(pkgPath), 'dist');
const { version } = JSON.parse(readFileSync(pkgPath, 'utf8'));

const js = readFileSync(join(dist, 'maplibre-gl.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(dist, 'maplibre-gl.css'), 'utf8').replace(/<\/style/gi, '<\\/style');

const out = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'features',
  'map',
  'maplibre-inline.generated.ts',
);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  `export const MAPLIBRE_VERSION = ${JSON.stringify(version)};\n` +
    `export const MAPLIBRE_JS = ${JSON.stringify(js)};\n` +
    `export const MAPLIBRE_CSS = ${JSON.stringify(css)};\n`,
);
