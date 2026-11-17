# Development

Everything needed to build and change epaRadar. The overview is in the [README](../README.md).

| Folder                | What                                      |
| --------------------- | ----------------------------------------- |
| `apps/mobile`         | The app (React Native, Expo, Expo Router) |
| `apps/web`            | Website and waitlist (Astro on Vercel)    |
| `packages/theme`      | Shared colors, fonts, spacing and logo    |
| `packages/legal`      | Age limit and contact details, shared     |
| `supabase/migrations` | Database schema and access rules          |
| `supabase/tests`      | Database tests (pgTAP)                    |

## Install once

You need [mise](https://mise.jdx.dev), Docker, and an Android phone with **Developer options →
Wireless debugging** turned on.

```sh
git clone git@github.com:tlxq/eparadar.git && cd eparadar
mise install
mise exec -- npm ci
cp apps/mobile/.env.example apps/mobile/.env
```

Start the local database with `mise exec -- supabase start` and fill in `apps/mobile/.env` with the
URL and anon key from `supabase status`. Store builds use the hosted project's values, set in EAS.
Never put a service-role key in `.env`.

The Android build needs a Firebase project for push: download its `google-services.json` and put
it in `apps/mobile/`. It stays out of git; EAS builds read it from the file variable
`GOOGLE_SERVICES_JSON`.

Pair the phone the first time (the phone shows the address and code under **Pair device with
pairing code**):

```sh
mise exec -- adb pair <ip>:<port>
```

## Every day

```sh
mise exec -- npm run phone
```

This finds the phone over Wi-Fi or USB, rebuilds the app only when native code changed, starts
Metro and opens the app. Code changes then show up on the phone right away.

| Need              | Command                                               |
| ----------------- | ----------------------------------------------------- |
| Force a rebuild   | `npm run phone -- --build`                            |
| Pick a phone      | `npm run phone -- --device <name>`                    |
| Not on home Wi-Fi | `PHONE_HOST=<tailscale name> npm run phone -- <port>` |
| Website           | `npm run web`                                         |
| Local database    | `supabase start`                                      |

Run every command through `mise exec --` so the pinned Node, Java and Android versions are used.

## Before a pull request

```sh
mise exec -- mise run check
mise exec -- supabase test db --local
```

Work on a branch (`feat/…`, `fix/…`, `chore/…`), open a PR, and merge once both checks
above pass (GitHub runs the first on every PR; the second runs on your machine). Commit with
`npm run commit` for a guided Conventional Commit message.

## Store builds

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
- Test and seed data are made up.
