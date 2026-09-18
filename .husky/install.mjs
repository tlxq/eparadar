import { existsSync } from 'node:fs';

if (process.env.CI || process.env.NODE_ENV === 'production' || !existsSync('node_modules/husky')) {
  process.exit(0);
}

const husky = (await import('husky')).default;

await husky();
