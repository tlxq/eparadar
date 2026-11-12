/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const SRC = join(__dirname, '..', '..');
const ROOTS = ['app', 'features'];

const BANNED: [RegExp, string][] = [
  [/istället/i, 'i stället'],
  [/\bsläpp/i, 'Placera'],
  [/\bidag\b/i, 'i dag'],
  [/\bikväll\b/i, 'i kväll'],
  [/\bigår\b/i, 'i går'],
  [/\bgarage/i, 'EPA:or'],
  [/skapade denna/i, 'skapade den här'],
  [/Mina \$\{Words\.vehicles\}/, 'Words.vehicles'],
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !name.includes('.generated') ? [path] : [];
  });
}

describe('one word per thing', () => {
  const files = ROOTS.flatMap((root) => sourceFiles(join(SRC, root)));

  it('scans the app code', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(BANNED)('no %s', (pattern, use) => {
    const hits = files.filter((file) => {
      if (file.endsWith('map-html.ts')) return false;
      return pattern.test(readFileSync(file, 'utf8'));
    });
    expect({ use, hits: hits.map((file) => file.slice(SRC.length + 1)) }).toEqual({
      use,
      hits: [],
    });
  });
});
