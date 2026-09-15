# epaRadar

A community app for EPA-car owners: register your car, post to a feed, chat, and find meetups nearby.

Built with React Native (Expo) and Supabase. This is an npm workspaces monorepo:
the mobile app lives in `apps/mobile`, the `eparadar.se` marketing site in `apps/web`.

## Getting started

1. Install dependencies (from the repo root)

   ```bash
   npm install
   ```

2. Copy `apps/mobile/.env.example` to `apps/mobile/.env` and fill in your Supabase project URL and anon key.

3. Start the mobile app

   ```bash
   npm run mobile
   ```

4. Start the coming-soon site

   ```bash
   npm run web
   ```

## Project structure

- `apps/mobile/src/app` — screens, using Expo Router's file-based routing
- `apps/mobile/src/components` — shared UI components
- `apps/mobile/src/lib` — client setup (Supabase, etc.)
- `apps/web` — the `eparadar.se` coming-soon site (Astro)
- `supabase/migrations` — database schema, shared by both apps
