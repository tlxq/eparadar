import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sourcePath = fileURLToPath(import.meta.resolve('@eparadar/theme/assets/icon-minimal.svg'));
const outputPath = fileURLToPath(new URL('../public/favicon.svg', import.meta.url));

const source = readFileSync(sourcePath, 'utf8');
const recolored = source.replace(/currentColor/g, '#2F6FED');

writeFileSync(outputPath, recolored);
console.log(`Wrote ${outputPath}`);
