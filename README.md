# epaRadar

A Swedish community app for EPA-traktor teens: register your car, post to the feed, chat with
friends, see friends on a live map (opt-in, friends only) and organize meetups. Website:
`eparadar.se`.

| Folder                | What                                      |
| --------------------- | ----------------------------------------- |
| `apps/mobile`         | The app (React Native, Expo, Expo Router) |
| `apps/web`            | Website and waitlist (Astro on Vercel)    |
| `packages/theme`      | Shared colors, fonts, spacing and logo    |
| `supabase/migrations` | Database schema and access rules          |
| `supabase/tests`      | Database tests (pgTAP)                    |

## 1. Install once

You need [mise](https://mise.jdx.dev), Docker, and an Android phone with **Developer options →
Wireless debugging** turned on.

```sh
git clone git@github.com:tlxq/eparadar.git && cd eparadar
mise install
mise exec -- npm ci
cp apps/mobile/.env.example apps/mobile/.env
```

Fill in `apps/mobile/.env` with the URL and anon key from Supabase → Project Settings → API. These
values are safe for the app; never put a service-role key there.

Pair the phone the first time (the phone shows the address and code under **Pair device with
pairing code**):

```sh
mise exec -- adb pair <ip>:<port>
```

## 2. Every day

```sh
mise exec -- npm run phone
```

This finds the phone over Wi-Fi or USB, rebuilds the app only when native code changed, starts
Metro and opens the app. Code changes then show up on the phone right away.

| Need              | Command                                   |
| ----------------- | ----------------------------------------- |
| Force a rebuild   | `npm run phone -- --build`                |
| Pick a phone      | `npm run phone -- --device S928`          |
| Not on home Wi-Fi | `npm run phone -- <port>` (via Tailscale) |
| Website           | `npm run web`                             |
| Local database    | `supabase start`                          |

Run every command through `mise exec --` so the pinned Node, Java and Android versions are used.

## 3. Before a pull request

```sh
mise exec -- npm run check
mise exec -- supabase test db --local
```

Work on a branch (`feat/…`, `fix/…`, `chore/…`), open a PR, and merge when CI is green. Commit with
`npm run commit` for a guided Conventional Commit message.

## 4. Store builds

```sh
cd apps/mobile
mise exec -- eas build --profile preview --platform android
mise exec -- eas build --profile production --platform android
```

`preview` is a shareable test APK. `production` is the Play Store bundle.

## Rules

- No comments in code.
- All app text in Swedish.
- Location sharing is opt-in and friends-only, never public.
- Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`) live only in Vercel, never in the app or
  in Git.
- Each change needs its own reviewed commit. Do not add AI co-author trailers or AI attribution to
  source, docs or thesis material.
