# epaRadar

Social map app for EPA-traktor drivers. Most users are minors (15+), so the privacy
rules below are hard requirements, not preferences. Setup and commands: `README.md`.
Open work: `ROADMAP.md`.

## Privacy and safety rules

- Location sharing is opt-in, off by default, friends-only, never public.
- Every table has RLS enabled. Policies are scoped `to authenticated`.
  Never use `using (true)` on a table that holds user data.
- Nothing is readable by the `anon` role. The anon key ships in the app,
  so treat it as public.
- `security definer` functions must set `search_path`, check `auth.uid()`,
  and `revoke execute ... from public, anon`.
- Data that reveals where someone is or was (positions, check-ins, spots,
  statuses) must have an expiry enforced on the server.
- Storage buckets are private unless there is a written reason, and have a
  file size limit and allowed MIME types.
- Any screen with user-generated content needs both block and report.
- A new data type or third-party service means updating the privacy policy
  in the same PR, in both `apps/web/src/pages/integritetspolicy.astro` and
  `apps/mobile/src/app/privacy.tsx`.
- Secrets never go in the repo or the app. The service-role key is server-side only.
- Safe to make public at any time: test and seed data are made up (names, emails, a neutral public
  place). Real accounts, family, home and device names never go in files, commit messages, issues or
  PR text. Screenshots come from demo data and live in `docs/assets/`. `tools/public-guard` checks
  this at commit.

## Database changes

- Every migration comes with a pgTAP test in `supabase/tests/database`,
  including a case for a logged-out user and for a non-friend.
- The Supabase project `epaRadar` is live with real users. Never apply
  migrations or change data there without asking first. Test locally.

## Workflow

- Run commands through `mise exec --`.
- Before a PR: `mise run check` (mobile lint, typecheck, tests; web typecheck and build; unused code with knip; the pre-push hook runs it) and `supabase test db --local`. A PR that touches `apps/mobile/src` also runs `mise run e2e` (Maestro flows in `.maestro/` on the desk emulator against the local demo data; it starts its own Metro against the demo data and refuses an already running Metro it can't prove is local). Screen changes also run `mise run pictures` (a before/after page per screen against master's pictures, see the `workflow:picture-check` skill) and Tom looks at the page before merge. Everything runs locally: GitHub Actions is turned off for the repo and there are no workflows or Dependabot (Tom 11-11: minutes capped, all workflow local). The checks run on the desk before merge and the PR says so. `mise run deps` lists outdated packages instead of Dependabot. Git hooks are lefthook: `lefthook install` once per clone.
- Package guards: `.npmrc` sets `strict-allow-scripts=true` (an install script not listed in the root `package.json` `allowScripts` stops `npm ci`; a workspace's own `allowScripts` is ignored) and `min-release-age=3` (new resolutions only take versions 3+ days old). A new dependency with an install script needs an allow (`true`) or deny (`false`) entry there. `tools/osv-gate` in `mise run check` stops on a high/critical hole in a shipped package (`--ships maplibre-gl`: dev package inlined into the app); accept one for a while in `osv-scanner.toml` with `ignoreUntil` + reason.
- Work on a branch (`feat/`, `fix/`, `chore/`) and open a PR. Conventional Commits.
- One reviewed commit per change. No AI co-author trailers or AI attribution.
- No comments in code. All app text in Swedish.
