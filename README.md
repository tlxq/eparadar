# Epadunk

A community app for EPA-car owners: register your car, post to a feed, chat, and find meetups nearby.

Built with React Native (Expo) and Supabase.

## Getting started

1. Install dependencies

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Supabase project URL and anon key.

3. Start the app

   ```bash
   npm start
   ```

## Project structure

- `src/app` — screens, using Expo Router's file-based routing
- `src/components` — shared UI components
- `src/lib` — client setup (Supabase, etc.)
- `supabase/migrations` — database schema
