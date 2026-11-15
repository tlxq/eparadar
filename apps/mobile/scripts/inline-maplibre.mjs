import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pkgPath = require.resolve('maplibre-gl/package.json');
const dist = join(dirname(pkgPath), 'dist');
const { version } = JSON.parse(readFileSync(pkgPath, 'utf8'));

const read = (name) =>
  readFileSync(join(dist, name), 'utf8').replace(/\n\/\/# sourceMappingURL=\S+\s*$/, '\n');

const main = read('maplibre-gl.mjs');
const exportList = main.match(/export\s*\{([^}]*)\};?\s*$/);
if (!exportList)
  throw new Error(`maplibre-gl ${version}: no export list at the end of maplibre-gl.mjs`);
const body = main.slice(0, exportList.index);
if (/(^|[;}\n])import\s*[{*"'`]|\bimport\(/.test(body)) {
  throw new Error(`maplibre-gl ${version}: maplibre-gl.mjs imports other files`);
}
const namespace = exportList[1]
  .split(',')
  .map((entry) => entry.trim().split(/\s+as\s+/))
  .map(([local, exported = local]) => `${JSON.stringify(exported)}:${local}`)
  .join(',');

const worker = read('maplibre-gl-worker.mjs');

const js = (
  `(function(){${body.replace(/import\.meta\.url/g, 'location.href')}\n` +
  `globalThis.maplibregl=Object.freeze({${namespace}});})();\n` +
  `maplibregl.setWorkerUrl(URL.createObjectURL(new Blob([${JSON.stringify(worker)}],{type:'text/javascript'})));`
).replace(/<\/script/gi, '<\\/script');
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
