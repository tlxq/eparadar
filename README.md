# epaRadar

epaRadar is a Swedish community app for EPA-traktor teens. The first thesis demo covers profiles
and cars, feed posts, friendships, one-to-one chat, and an opt-in friends-only live map. The
marketing/waitlist site is deployed separately at `eparadar.se`.

This is an npm-workspaces monorepo:

- `apps/mobile` — React Native, Expo, and Expo Router mobile app
- `apps/web` — Astro marketing site and Vercel waitlist function
- `packages/theme` — shared colors, fonts, spacing, and branding
- `supabase/migrations` — versioned Postgres schema and RLS rules
- `supabase/tests/database` — local pgTAP database tests

## First-time setup

Install the exact project tool versions and dependencies from the repository root:

```sh
mise install
mise exec -- npm ci
```

Create the local mobile environment file. Its values are public mobile-client configuration, never
server credentials:

```sh
cp apps/mobile/.env.example apps/mobile/.env
```

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in that file. It is ignored by
Git.

For local database work, ensure Docker is running, then start Supabase:

```sh
mise exec -- supabase start
```

## Daily development

Use `mise exec --` for every project command. It selects the Node, Supabase, EAS, Java, and Android
tool versions pinned in `mise.toml`, rather than whichever global version a computer happens to
have.

```sh
# Mobile app and Metro development server
mise exec -- npm run mobile

# Marketing site at the URL printed by Astro
mise exec -- npm run web

# Relevant local checks
mise exec -- npm run lint --workspace apps/mobile
mise exec -- npm run typecheck --workspace apps/mobile
mise exec -- npm run test --workspace apps/mobile -- --runInBand
mise exec -- npm run typecheck --workspace apps/web
mise exec -- npm run build --workspace apps/web
mise exec -- supabase test db --local
```

Run the smallest relevant check while working, then run every check that CI will run for the files
you changed before opening a pull request.

## Android testing and builds

The Expo and EAS configuration lives only in `apps/mobile/app.json` and `apps/mobile/eas.json`.
Always change into that directory before using direct Expo or EAS commands:

```sh
cd apps/mobile
mise exec -- npx expo-doctor
mise exec -- npx expo start
```

Use the development build for everyday development on a physical Android device. It connects to
Metro, so TypeScript, UI, and most application changes refresh without a new APK.

Build and reinstall a development APK only after native-affecting changes: an Expo plugin,
permission, native dependency, SDK version, app configuration, or development-client change.
Use an EAS preview APK for a stable shareable test snapshot that does not need Metro. Reserve the
EAS production AAB for Play Console distribution.

## Two-computer workflow

Git is the sole source of truth for code:

1. Start a focused branch from an up-to-date `master`: `feat/...`, `fix/...`, or `chore/...`.
2. Make, test, review, and explain the change yourself.
3. Commit and push from the current host, then fetch/pull the branch on the other host.
4. Never continue the same uncommitted worktree state on two computers.

Dotfiles may sync private assistant context and local workflow configuration, but not application
source, database migrations, credentials, or build artifacts. Tailscale is appropriate for
trusted access to a running development server when normal local-network access is unavailable;
it does not replace Git synchronization.

Each host needs its own ignored `apps/mobile/.env`, installed `mise` tools, `npm ci`, and local
Supabase/EAS authentication. Changing computer alone does not require a new APK: start Metro on
the host you are using and connect the already-installed development build.

## Vercel and secrets

The web project is linked locally through `.vercel/project.json`. Configure the Vercel project with
`apps/web` as its root directory and ensure it runs the workspace build successfully. The waitlist
function needs these Vercel-only environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`

Never put a Supabase service-role key or Resend key in the mobile app, a committed `.env` file, or
a browser-visible environment variable.

## Contribution rules

You make every Git commit using your own identity. Do not add AI co-author trailers, bot commits,
or AI attribution to source, project documentation, submissions, or thesis materials. AI may help
with investigation, implementation, tests, and review, but you define the requirement, review the
diff, run the checks, and understand every change before committing it.

## Creating commits

After reviewing and staging the files, run:

```sh
npm run commit
```

Commitizen asks you to choose the conventional type and write the summary. It then runs Git using
your configured identity. Husky and Commitlint validate the message automatically, including when
you use `git commit` directly. Install dependencies with `mise exec -- npm ci` on each computer to
activate the hook.
