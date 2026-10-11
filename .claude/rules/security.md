---
paths:
  - "supabase/**"
  - "apps/mobile/src/lib/**"
  - "apps/web/api/**"
---

# Security rules

How to apply the privacy rules in `CLAUDE.md` when touching the database, the
Supabase client code or the web API.

## Tables and policies

- Enable RLS in the same migration that creates the table.
- Scope every policy to a role, and default to owner and friends:

  ```sql
  create policy "owner and friends read things"
    on things for select to authenticated
    using (auth.uid() = user_id or is_friend(auth.uid(), user_id));
  ```

- Before adding a table to the `supabase_realtime` publication, check its select
  policy. Realtime delivers every row that policy allows.
- Anything tied to a place or a moment gets an `expires_at` column, and the select
  policy filters on it. Add a scheduled cleanup so rows are deleted, not only hidden.

## Functions

- `security definer` functions set `search_path = public`, read the caller from
  `auth.uid()` and raise when it is null. Never take the acting user id as a parameter.
- New functions in `public` are executable by `anon` by default. Lock them down:

  ```sql
  revoke execute on function public.my_fn(uuid) from public, anon;
  grant execute on function public.my_fn(uuid) to authenticated;
  ```

- Trigger functions are revoked from `authenticated` as well. Triggers still fire.
- Helpers called from policies (such as `is_friend`) must stay executable by
  `authenticated`, or the policies fail. A new helper reads the caller from
  `auth.uid()` instead of taking both ids, so it cannot be used to look up others.

## Storage

- New buckets are private, with `file_size_limit` and `allowed_mime_types` set.
- The first folder in the object path is the id the policy checks (user id,
  conversation id or spot id).

## Tests

Each migration adds pgTAP cases in `supabase/tests/database` for four callers:
logged out (`set local role anon`), a stranger, a friend and the owner
(`set local role authenticated` plus `request.jwt.claim.sub`). The logged-out and
stranger cases must return zero rows.

## Edge functions and web API

- User-facing functions use `withSupabase({ auth: 'user' })` and take the user id
  from `ctx.userClaims`. Webhook functions use `{ auth: ['secret'] }`.
- Validate and rate limit input in `apps/web/api`. The service-role key is read
  from server environment variables only.

## Client

- Every `EXPO_PUBLIC_*` value is bundled into the app. Only the Supabase URL, the
  anon key and the Sentry DSN belong there.
- Do not log positions, tokens or message text.

## Live project

After a schema change is applied to the live project, run the Supabase security
advisors and fix new warnings before moving on.
