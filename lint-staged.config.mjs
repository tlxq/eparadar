export default {
  'apps/mobile/**/*.{ts,tsx,js,jsx}': () => [
    'npm run lint --workspace apps/mobile',
    'npm run typecheck --workspace apps/mobile',
  ],
  'apps/web/**/*.{ts,astro}': () => 'npm run typecheck --workspace apps/web',
};
