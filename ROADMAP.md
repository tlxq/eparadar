# epaRadar — Path to Launch

Living checklist, source of truth across hosts. Update checkboxes as work lands; don't start a
new phase until the current one is checked off (keeps one front open at a time).

## Where we are (2026-09-23)

- **Done & verified end-to-end**: Identity + Feed, 1:1 + group Chat, Friendships, Live map
  (background location tracking confirmed on two physical devices).
- **Done & merged**: Meetups, photo upload and avatars, map avatar markers, privacy policy,
  branding, and release-safe store assets.
- **Done & merged**: Phase A (pre-commit gate, analytics — both live; Sentry wired but needs a
  DSN, Tom's to create), Phase B (car/post photos, live and on-device verified), and Phase C (push
  notifications — Firebase/FCM credentials set up, real device send-and-receive verified
  2026-09-23).
- **Next up: Phase D** (Snapchat-style map polish) — avatar markers already done; ghost mode/
  precision tiers and activity/heat feedback remain. See Phases A–F below for the full sequencing
  decided 2026-09-22 (audit + planning session); rationale lives in memory (`project_eparadar.md`),
  not duplicated
  here.
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

- [x] **Pre-commit quality gate**: husky `pre-commit` hook running `lint-staged`
      (`lint-staged.config.mjs`), alongside the existing commit-msg hook — runs the affected
      workspace's full lint+typecheck on any staged mobile/web file.
- [ ] **Error tracking**: `@sentry/react-native` (mobile) + `@sentry/astro` (web) installed and
      wired — `Sentry.init`/`Sentry.wrap` in `src/app/_layout.tsx` gated on
      `EXPO_PUBLIC_SENTRY_DSN`, the Astro integration gated on `PUBLIC_SENTRY_DSN`, both no-op
      cleanly with no DSN set. Still needed: create the actual Sentry project(s) and put the
      DSN(s) in `.env` (see `.env.example`) — nothing reports until that happens — and a fresh
      native build (`expo run:android`/EAS) before native (non-JS) crash capture is active on
      mobile. Once wired in Phase E, its `onError` hook should feed the ErrorBoundary too.
- [x] **Analytics**: first-party `analytics_events` table (`supabase/migrations/20260922150000_analytics_events.sql`)
      — insert-only RLS (`user_id is null or user_id = auth.uid()`), no select policy for regular
      users, pgTAP-covered (4 assertions). `apps/mobile/src/lib/analytics.ts`'s `trackEvent(name,
      props)` wrapper is wired in, with a first real call site (`app_opened` in `_layout.tsx`).
      Migration pushed to the live project 2026-09-22 and verified live (throwaway account,
      insert → confirmed via direct SQL → RLS blocks a regular user's `select` → test row and
      account deleted afterward).

## Phase B — Photos: cars + posts

Reuses the avatar upload pattern (generalized into `apps/mobile/src/lib/image-upload.ts` —
`uploadImage(bucket, pathPrefix, uri)` plus thin `uploadAvatar`/`uploadCarPhoto`/`uploadPostImage`
wrappers, renamed from `avatar-upload.ts`) rather than inventing a new one.

- [x] Photo picker on `cars/new.tsx`, writes to `cars.photo_url`. New `car-photos` Storage bucket
      (`supabase/migrations/20260922160000_car_and_post_photos_storage.sql`, same public-read/
      owner-write-by-folder-prefix RLS shape as avatars). Shown via a new `CarPhoto` component
      wherever a car is already surfaced: the profile's "Mina bilar" list and the post composer's
      car picker (still no dedicated car detail/list screen — not needed for this).
- [x] Image field on `post/new.tsx`, writes to `posts.image_url` via a new `post-images` bucket
      (same migration); renders full-width in the Feed's `PostCard`.
- [x] Verified twice: first end-to-end via `expo start --web` + Playwright against a local
      Supabase instance (signup → add a car with a photo → create a post with an image →
      confirmed both `photo_url`/`image_url` landed via direct SQL, both public URLs resolve, both
      render correctly in the Feed and profile car list; Storage RLS scripted directly too — own
      upload succeeds, public read works, cross-user write into another user's folder is
      rejected). Migration then pushed to the live project and the same flow re-verified live
      on-device via `mobile-mcp` on Tom's real phone/account (car photo pick → crop → save →
      shows in "Mina bilar" and the post composer's car picker; post image pick → crop → publish
      → renders full-width in the Feed) — confirmed no crash on load either (the Sentry PR from
      Phase A is safe without a native rebuild). All test rows/Storage objects deleted afterward
      (posts/car via SQL, Storage objects via the Storage REST API + a service-role key fetched
      just for that call, since direct SQL delete on `storage.objects` is blocked by Supabase's
      own `protect_delete()` trigger) and confirmed gone.

## Phase C — Push notifications

The biggest lift in this batch — needs schema and a sending mechanism, not just a package
install.

- [x] Schema: `push_tokens` table (`supabase/migrations/20260922170000_push_tokens.sql` —
      `user_id`, `token`, `platform` check-constrained to ios/android/web, `unique(user_id,
      token)` so re-registering the same token on login is a plain upsert), owner-only
      insert/select/update/delete RLS (update policy needed too — an upsert's `ON CONFLICT DO
      UPDATE` path is an UPDATE under the hood, missed on the first pass, caught by testing the
      re-registration case specifically). pgTAP-covered (6 assertions). Known simplification: no
      cross-user cleanup if the same physical device's token later belongs to a different account
      (shared/family-phone edge case) — not handled, low stakes for now. **Live**, upsert
      (including re-registration) verified against the real project with a throwaway account.
- [x] Client: `expo-notifications` + `@react-native-async-storage/async-storage`,
      `apps/mobile/src/lib/push-notifications.ts` — `syncPushTokenIfGranted` on login/session
      init, `maybeRequestNotificationPermission` wired into the two "first meaningful action"
      triggers (friend request accepted, meetup interest marked). Pre-permission Alert before the
      OS dialog, `canAskAgain`-gated so it only shows once and respects a permanent decline.
      **Real bug caught and fixed via on-device testing**: Android's `getPermissionsAsync()`
      returns `status: "denied"` (not `"undetermined"`) even when the permission was never
      actually requested — the correct "haven't asked yet" signal on Android is
      `canAskAgain: true`, not the status string. Verified live end-to-end on-device: real Alert →
      real OS permission dialog → real grant, confirmed via `adb dumpsys package`.
      **Firebase/FCM credentials set up 2026-09-23**: Firebase project `eparadar-6e652`, Android
      app registered under `com.tlxq.eparadar`, `google-services.json` downloaded into
      `apps/mobile/` and wired via `expo.android.googleServicesFile` in `app.json`, then a native
      rebuild (`expo prebuild` + `expo run:android`). That fixed device-side FCM registration
      (confirmed via a throwaway account's real `ExponentPushToken[...]` landing in `push_tokens`),
      but Expo's push *send* relay separately needed a Firebase service account key (Firebase
      console → Project settings → Service accounts → generate key) uploaded to the EAS project
      (expo.dev/accounts/tlxq/projects/eparadar → Credentials → Android → FCM V1 service account
      key) — without it, Expo's push API returned `InvalidCredentials`/"Unable to retrieve the FCM
      server key". iOS never needed any of this (APNs via Expo's own credentials).
- [x] Sending mechanism: Supabase Edge Function (`supabase/functions/send-push/index.ts`, uses the
      newer `withSupabase`/`apiKey`-`secret` auth pattern rather than a JWT bearer token) triggered
      by `pg_net`-based DB triggers on `messages` insert, `friendships` insert/update, and
      `meetup_interests` insert (`supabase/migrations/20260922180000_push_send_triggers.sql`).
      Trigger auth secret and function URL stored in Supabase Vault (`vault.create_secret`, run
      directly — never committed to a migration), referenced by name in the trigger function so no
      secret value lives in git. Trigger gracefully no-ops if the vault secrets aren't set (fails
      open, never blocks the underlying insert/update). All four notification paths (new message,
      new friend request, friend request accepted — deduplicated so a repeat UPDATE doesn't
      re-fire, meetup interest — skips creator marking their own meetup) verified individually via
      direct HTTP calls to a local `supabase functions serve` instance with seeded fixtures.
      End-to-end trigger→function chain verified **live**: a real `send_friend_request` RPC call
      produced a real `POST 200` to the deployed function within ~1s (confirmed via
      `function_edge_logs`/`function_logs`), test accounts cleaned up after. Local Docker networking
      on this dev machine couldn't reach a locally-served function from inside the DB container
      (a host-firewall quirk, not a code issue) — live testing covered what local couldn't.
- [x] Tapping a notification deep-links to the right screen via `setupNotificationResponseListener`
      in `push-notifications.ts` (`Notifications.addNotificationResponseReceivedListener`, wired
      into `_layout.tsx`) — routes on the notification's `data.type` (message → the conversation,
      friend_request/friend_accepted → the friends tab, meetup_interest → the meetup detail).
      Routing logic typechecks against the app's typed routes; tap-to-deep-link itself still
      untested against a real delivered notification (see below), lower risk than the send path.
- [x] **Real device send-and-receive, verified 2026-09-23**: two throwaway accounts on the
      physical device — one created a meetup and registered a real FCM token, the other marked
      interest (inserted directly into `meetup_interests` to exercise the same `AFTER INSERT`
      trigger the app's own "Intresserad" button fires) — produced a real notification in the
      Android notification tray: "Någon är intresserad / \<name\> är intresserad av \<meetup\>".
      Confirms the whole chain end-to-end: DB trigger → Edge Function → Expo push API → FCM →
      device. Both test accounts, their token/meetup/interest rows, and the notification were
      cleaned up afterward.

**Phase C is done.** The whole pipeline (schema → RLS → client registration → permission UX → DB
triggers → Edge Function → Expo's push API → FCM → device tray) is verified live, including a real
notification landing on a physical device. The one still-unverified edge is deep-linking from a
tapped notification (routing code is typechecked but untested against a live tap) — low risk,
revisit opportunistically rather than blocking on it.

## Phase D — Snapchat-style map polish

- [x] **Avatar markers**: friend locations now render as avatar-in-a-circle markers with initials
      fallback, live status ring, and friends-only data.
- [ ] **Ghost mode / precision tiers**: extend location sharing past today's binary on/off —
      needs a real design decision (exact vs. approximate vs. off, global or per-friend). Run
      this through the design-pitch workflow before building — it's also a live ethics/GDPR
      thesis discussion point, not just a UI choice.
- [x] **Bitmoji-style action bar**: Karta's single FAB + slide-up menu replaced with a
      persistent bottom bar — search (filter friends by name), friends-list (browse all
      friends sharing location), create-meetup, and locate-me, all folded into one bar. Search
      and friends-list share one picker panel component. Verified working on a fresh Android
      Studio emulator (t14s) after resolving an unrelated dev-client setup issue
      (`@react-native-async-storage/async-storage@2.x` requires a custom dev client, not Expo
      Go — `npx expo run:android` fixed it). Merged `tlxq/eparadar#37`.
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
