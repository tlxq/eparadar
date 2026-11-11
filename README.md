<p align="center"><img src="docs/assets/banner.png" alt="epaRadar" width="100%"></p>

A Swedish app where EPA and A-traktor drivers add friends, share where they are with those friends
only, and plan meetups.

[eparadar.se](https://eparadar.se)

## Why it exists

Young drivers of EPA and A-traktor cars meet up in parking lots and drive together. They plan it in
group chats and on maps made for everyone. epaRadar does this one thing: shows which friends are
out, where the meetup is and who is coming. I built it on my own, and it is on its way to Google
Play and the App Store.

## What was hard

Most people who use it are 15 to 17, and the app shows where they are. Rules in the app can be
taken apart, so the rules live in the database instead.

- Location is off until you turn it on, and then only accepted friends see it. A row-level security
  policy in Postgres checks the friendship on every read, so a changed app or the public anon key
  gets nothing more.
- Everything that shows where someone is or was runs out on the server: a position after 12 hours,
  a status after 1 hour, spots and check-ins after their time. A `pg_cron` job clears them every
  10 minutes.
- 458 pgTAP tests cover every table and function, each with a case for someone logged out and for
  someone who isn't a friend. They run on every pull request that changes the database.
- Other people's posts, photos and messages can be reported, and anyone can be blocked.

## How it fits together

<p align="center"><img src="docs/assets/architecture.svg" alt="The app and the website talk to Supabase. Postgres checks every read and pg_cron clears old places. Edge Functions send push notifications and report emails and delete accounts. The website sends waitlist emails through Resend." width="100%"></p>

## Stack

React Native with Expo · Supabase (Postgres, row-level security, Realtime, Edge Functions, pgTAP) ·
Astro on Vercel · TypeScript

## Run it

With made-up users on a local database. You need [mise](https://mise.jdx.dev), Docker and an
Android phone.

```sh
mise install
mise exec -- npm ci
mise exec -- supabase start
cp apps/mobile/.env.example apps/mobile/.env
mise exec -- npm run phone
```

Put the local URL and anon key from `supabase status` in `apps/mobile/.env`, then sign in as
`test@test.se` with the password `testtest`. `mise run check` runs lint, types and unit tests,
and `mise run e2e` clicks through the main tasks with [Maestro](https://maestro.dev) on an Android
emulator. Everything else is in [docs/development.md](docs/development.md).

## Licence

All rights reserved. You may read the code, but not copy or reuse it.
