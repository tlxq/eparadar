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

## Database changes

- Every migration comes with a pgTAP test in `supabase/tests/database`,
  including a case for a logged-out user and for a non-friend.
- The Supabase project `epaRadar` is live with real users. Never apply
  migrations or change data there without asking first. Test locally.

## Workflow

- Run commands through `mise exec --`.
- Before a PR: `mise run check` (mobile lint, typecheck, tests; web typecheck and build; the pre-push hook and CI run it too) and `supabase test db --local`. Git hooks are lefthook: `lefthook install` once per clone.
- Work on a branch (`feat/`, `fix/`, `chore/`) and open a PR. Conventional Commits.
- One reviewed commit per change. No AI co-author trailers or AI attribution.
- No comments in code. All app text in Swedish.
