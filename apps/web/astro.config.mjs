// @ts-check
import sentry from '@sentry/astro';
import { defineConfig } from 'astro/config';

const sentryDsn = process.env.PUBLIC_SENTRY_DSN;

// https://astro.build/config
export default defineConfig({
  integrations: sentryDsn ? [sentry({ dsn: sentryDsn })] : [],
  vite: {
    server: {
      allowedHosts: true,
    },
  },
});
