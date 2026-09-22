# epaRadar — Path to Launch

Living checklist, source of truth across hosts. Update checkboxes as work lands; don't start a
new phase until the current one is checked off (keeps one front open at a time).

## Where we are (2026-09-22)

- **Done & verified end-to-end**: Identity + Feed, 1:1 + group Chat, Friendships, Live map
  (background location tracking confirmed on two physical devices).
- **Done & merged**: Meetups, photo upload and avatars, map avatar markers, privacy policy,
  branding, and release-safe store assets.
- **Next up (Phase A)**: foundation infra — pre-commit quality gate, error tracking, analytics.
  See Phases A–F below for the full sequencing decided 2026-09-22 (audit + planning session);
  rationale lives in memory (`project_eparadar.md`), not duplicated here.
- **Remaining for launch (Phase F)**: Expo/EAS account and store credentials, manual store
  submission, and optional CI automation after the first successful submission.

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
- [x] Open PR, merge to master (`tlxq/eparadar#21`, merge commit `0b7184d`).

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
- [x] Native on-device check: image-picker permission, crop flow, Storage upload, and profile
      refresh verified on the connected Samsung phone.

## Phase A — Foundation infra

Cross-cutting, do first — everything after benefits from having it in place.

- [ ] **Pre-commit quality gate**: extend the existing husky setup with a `pre-commit` hook
      (lint-staged) running `eslint --fix` + `tsc --noEmit` on staged files, alongside the
      existing commit-msg hook. Staged-files-only, keep it fast.
- [ ] **Error tracking**: `@sentry/react-native` for mobile, `@sentry/astro` (or the plain
      browser SDK) for `apps/web`. Free tier. Wire into `src/app/_layout.tsx` init and (once
      Phase E's ErrorBoundary exists) its `onError`.
- [ ] **Analytics**: a first-party `analytics_events` table in Supabase (`user_id` nullable,
      `event_name`, `props jsonb`, `created_at`) + a thin `trackEvent(name, props)` client
      wrapper, instead of a third-party SDK — consistent with the project's existing pattern
      (Supabase over Firebase, Leaflet/OSM over Google Maps) and a stronger GDPR story for the
      thesis: no data leaves the project's own Supabase instance.

## Phase B — Photos: cars + posts

Reuses the avatar upload pattern (`apps/mobile/src/lib/avatar-upload.ts`) rather than inventing a
new one.

- [ ] Photo picker on `cars/new.tsx`, writes to `cars.photo_url` (schema column already exists,
      unused); show the photo wherever a car is already surfaced (post composer's car picker at
      minimum — no dedicated car detail/list screen exists yet, don't build one just for this).
- [ ] Image field on `post/new.tsx`, writes to `posts.image_url` (schema column already exists,
      unused); render it in the Feed.
- [ ] Verify end-to-end via `expo start --web` + Playwright against the live project, same as the
      avatar work, including Storage-object test-data cleanup afterward.

## Phase C — Push notifications

The biggest lift in this batch — needs schema and a sending mechanism, not just a package
install.

- [ ] Install `expo-notifications`, register push tokens on login, store them in a new
      `push_tokens` table (`user_id`, `token`, `platform`) keyed for multi-device.
- [ ] Sending mechanism: a Supabase Edge Function triggered by a DB webhook on `messages` insert,
      `friendships` insert/accept, and `meetup_interests` insert — calls Expo's push API
      server-side, keeping sending logic in one place.
- [ ] UX: never prompt on first launch — ask after a first meaningful action (first friend added
      or first meetup joined), with a custom pre-permission screen explaining why, matching the
      existing in-context pattern used for location permission.
- [ ] Tapping a notification deep-links to the right screen (chat thread, friend request, meetup
      detail) via Expo Router's linking config.
- [ ] pgTAP coverage for `push_tokens` RLS (owner-only), same treatment as friendships/locations.

## Phase D — Snapchat-style map polish

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

## Phase E — UX polish pass

Run through the `eparadar-design-pitch` workflow (taste questions → rendered Artifact →
implement) as one coherent visual pass rather than piecemeal.

- [ ] **Onboarding**: a short (≲5 steps) flow after signup — at minimum a permission-priming step
      and profile basics — instead of dropping straight into tabs.
- [ ] **Empty states**: real copy + a simple illustration/icon treatment for feed/chat/friends,
      replacing today's bare Swedish text strings.
- [ ] **Loading**: a new `Skeleton` component (`src/components/`) replacing raw
      `ActivityIndicator` on feed/profile/meetup-detail.
- [ ] **Toast + ErrorBoundary**: consistent failure surfacing instead of only inline form errors;
      this is also where Phase A's Sentry `onError` hook gets wired in.

## Phase F — Store submission readiness

- [x] Real app icon + splash generated from the existing `packages/theme` brand assets
      (`icon.svg`/`icon-minimal.svg`/`icon-app.svg`); replaced the stock Expo template icon in
      `apps/mobile/assets/images/` and `apps/mobile/assets/expo.icon/`.
- [x] Privacy policy now covers the app (feed, chat, friendships, background location, meetups,
      minors, retention, rights, and deletion) in `apps/web/src/pages/integritetspolicy.astro`
      and is readable from the native in-app `privacy` route linked from mobile Settings.
- [x] Store listing assets: release-safe Swedish-language screenshots and the 1024×500 feature
      graphic are finalized in `docs/store-assets/`; store description copy is in
      `docs/store-listing-sv.md`.
- [x] Play Console's mandatory Background Location permission declaration drafted in
      `docs/play-background-location-declaration-sv.md`; submit it only after checking the
      current Play Console form and attaching release screenshots.
- [ ] Confirm Apple Developer Program enrollment + App Store Connect app record; fill in
      `eas.json`'s currently-empty `submit.production.ios` credentials. `eas whoami` currently
      reports that the CLI is not logged in; see `docs/store-assets/README.md`.
- [ ] Optional, after the first successful manual submission: an EAS build/submit GitHub Actions
      workflow, so future releases aren't a fully manual `eas build && eas submit`.

## Working rhythm

- Budget ~1-3 hrs/day. Work top-to-bottom inside the current phase.
- Every checked-off feature item gets verified live (real Supabase project, not just
  typecheck/lint) before it's considered done — native-only surfaces like the map need a
  physical device, same as background tracking did.
