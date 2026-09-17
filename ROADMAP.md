# epaRadar — Path to Launch

Living checklist, source of truth across hosts. Update checkboxes as work lands; don't start a
new phase until the current one is checked off (keeps one front open at a time).

## Where we are (2026-09-16)

- **Done & verified end-to-end**: Identity + Feed, 1:1 + group Chat, Friendships, Live map
  (background location tracking confirmed on two physical devices).
- **In progress**: Meetups (`feat/meetups`) — schema, API, hooks, and UI all built; on-device
  verification underway, one bug already fixed (ambiguous PostgREST embed).
- **Not started**: photo upload / Supabase Storage, Snapchat-style map polish, store submission
  readiness (branding, privacy policy, listing assets, release credentials).

## Phase 1 — Finish Meetups

- [x] On-device verification: drop a pin → create a meetup → see it render on the map → mark
      interest → GPS check-in (150m geofence RPC), all confirmed against the live Supabase
      project on a physical device. Also added a locate-me button and a "here now" map badge
      along the way (neither existed before).
- [x] Fix bugs found during verification (ambiguous `profiles` embed in `fetchMeetupDetail`).
- [x] Add pgTAP coverage for meetups RLS/RPC (`supabase/tests/database/meetups.test.sql`, 12
      assertions: view/insert/update/delete RLS on `meetups`, interest insert-own-only +
      visible-to-all, checkins have no direct insert policy, `check_in_at_meetup` geofence
      true/false + upsert-not-duplicate). Full local suite passes (23/23).
- [x] Cross-device realtime check: a meetup interest and GPS check-in appeared on the other
      device's map/detail state during a two-device live check.
- [ ] Open PR, merge to master.

## Phase 2 — Photo upload & avatars

Foundation for avatar-style map markers (Phase 3) and for profile customization generally.

- [x] Supabase Storage `avatars` bucket + RLS (`supabase/migrations/20260916220000_avatars_storage.sql`):
      public read (avatars are display identity, same as `profiles.avatar_url` itself — not the
      friends-only location-sharing case), owner-only insert/update/delete keyed on the storage
      path's first folder segment matching `auth.uid()`. Pushed to the live project.
- [x] `expo-image-picker` (+ `expo-file-system`/`base64-arraybuffer` for the native upload path)
      wired into the profile screen: tap the avatar to pick a photo, uploads to
      `avatars/<user_id>/avatar.<ext>`, updates `profiles.avatar_url`.
- [x] `Avatar` component renders a real image with graceful fallback to initials, and every call
      site across the app (feed, chat list + messages, friends, meetups) now passes `imageUrl`
      through instead of just a name.
- [x] Verified end-to-end via `expo start --web` + Playwright against the live Supabase project
      (upload → Storage → `profiles.avatar_url` → renders in both the profile screen and the
      Feed; a user with no avatar still falls back to initials correctly). Test account and
      uploaded object cleaned up afterward.
- [ ] Native on-device check still pending (image-picker permission prompt, native crop UI) —
      same caveat as everything else that only got a web-flow verification pass so far.

## Phase 3 — Snapchat-style map polish

- [x] **Avatar markers**: friend locations now render as avatar-in-a-circle markers with initials
      fallback, live status ring, and friends-only data.
- [ ] **Ghost mode / precision tiers**: extend location sharing past today's binary on/off —
      needs a real design decision (exact vs. approximate vs. off, global or per-friend). Run
      this through the design-pitch workflow before building — it's also a live ethics/GDPR
      thesis discussion point, not just a UI choice.
- [ ] **Bitmoji-style action bar**: a bottom bar for search/friends-list/quick actions,
      replacing or extending today's single FAB + slide-up menu on Karta.
- [ ] **Activity/heat feedback**: extend the "live" pulse + interest-count treatment Meetups
      already has to friend clustering or a general "who's around" signal on the map.

## Phase 4 — Store submission readiness

- [x] Real app icon + splash generated from the existing `packages/theme` brand assets
      (`icon.svg`/`icon-minimal.svg`/`icon-app.svg`); replaced the stock Expo template icon in
      `apps/mobile/assets/images/` and `apps/mobile/assets/expo.icon/`.
- [x] Privacy policy now covers the app (feed, chat, friendships, background location, meetups,
      minors, retention, rights, and deletion) in `apps/web/src/pages/integritetspolicy.astro`
      and is readable from the native in-app `privacy` route linked from mobile Settings.
- [ ] Store listing assets: real-device Swedish-language screenshots and feature graphic.
      Initial native captures and a feature-graphic draft are in `docs/store-assets/`; they
      still need release-safe fixture data and final review. Store description copy is drafted
      in `docs/store-listing-sv.md`.
- [x] Play Console's mandatory Background Location permission declaration drafted in
      `docs/play-background-location-declaration-sv.md`; submit it only after checking the
      current Play Console form and attaching release screenshots.
- [ ] Confirm Apple Developer Program enrollment + App Store Connect app record; fill in
      `eas.json`'s currently-empty `submit.production.ios` credentials. Local EAS credential
      checks are blocked until an Expo account is logged in; see `docs/store-assets/README.md`.
- [ ] Optional, after the first successful manual submission: an EAS build/submit GitHub Actions
      workflow, so future releases aren't a fully manual `eas build && eas submit`.

## Working rhythm

- Budget ~1-3 hrs/day. Work top-to-bottom inside the current phase.
- Every checked-off feature item gets verified live (real Supabase project, not just
  typecheck/lint) before it's considered done — native-only surfaces like the map need a
  physical device, same as background tracking did.
