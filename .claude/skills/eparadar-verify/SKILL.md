---
name: eparadar-verify
description: Verify an eparadar feature or fix live against the real Supabase project before calling it done. Use before reporting any mobile/web feature finished, not just after typecheck/lint pass.
---

# eparadar-verify

"Done" for eparadar means driven end-to-end against the live Supabase project, not just
`tsc --noEmit` and `eslint` passing. Typecheck/lint catch shape errors; they don't catch a
migration that was never pushed, an ambiguous PostgREST embed, or a race condition — all bugs
this workflow has actually caught before.

## Steps

1. Start the app: `mise exec -- npx expo start --web --port 8081`.
2. Drive it with a Playwright script installed to the scratchpad directory (browsers live at
   `/home/tlxq/.cache/ms-playwright` — `chromium-cli` isn't available on this machine).
3. Capture screenshots at key steps.
4. Log any Supabase REST response ≥400 with its **full response body**, not just the status code
   — the body is what reveals root cause (ambiguous embed, missing migration, FK violation),
   where the UI's generic "something went wrong" does not.
5. When the REST API response alone doesn't explain something (e.g. checking for orphaned
   `auth.users` rows), inspect directly:
   `mise exec -- supabase db query "..." --linked`.

## Cleanup — always

Every run creates real rows in the shared Supabase project. After each pass, delete only rows
matching the test's own naming pattern (e.g. `email like 'pw-test-%@example.com'`) — **never** a
blanket wipe. Real accounts exist in this database (`admin@example.com`, `second-account@example.com`) and
must never be touched by cleanup queries.

## Native-only surfaces

The live map (Leaflet/WebView) and background location tracking are native-only and won't render
correctly in this web+Playwright flow — those need a physical device or emulator instead. Say so
explicitly rather than reporting them verified from the web flow.
