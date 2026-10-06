# epaRadar — Path to Launch

Living checklist, source of truth across hosts. Update checkboxes as work lands; don't start a
new phase until the current one is checked off (keeps one front open at a time).

## Where we are (2026-10-06)

- **Done & verified end-to-end**: Identity + Feed, 1:1 + group Chat, Friendships, Live map
  (background location tracking confirmed on two physical devices). "Done" here means functional,
  not finished — see the priority shift below.
- **Done & merged**: Meetups, photo upload and avatars, map avatar markers, privacy policy,
  branding, and release-safe store assets.
- **Done & merged**: Phase A (pre-commit gate, analytics — both live; Sentry wired but needs a
  DSN, Tom's to create), Phase B (car/post photos, live and on-device verified), Phase C (push
  notifications — Firebase/FCM credentials set up, real device send-and-receive verified
  2026-09-23), and Phase D (Snapchat-style map polish — avatar markers, ghost mode/precision
  tiers, and the Bitmoji-style action bar all shipped; activity/heat feedback still open, low
  priority, revisit opportunistically).
- **Priority shift, 2026-09-25**: friend-adding is an unscoped search across every user in the
  app, and chat is missing basic depth (timestamps, read state, edit/delete, leave-group) at the
  DB-policy level, not just the UI. Both, plus a recurring pattern of missing delete/remove
  affordances and a general "doesn't feel like Messenger/Snapchat" polish gap, are now the
  priority — ahead of the previously-planned onboarding/empty-states pass, as Phases E–H below.
  Rationale lives in memory (`project_eparadar.md`), not duplicated here.
- **Phase E done** (2026-10-05, #64–#70): proximity-gated friend discovery, friend codes, nearby
  radar, blocking.
- **Phase F nearly done** (2026-10-06, #73–#77): read receipts, unsend, typing, reactions, image
  messages, leave/remove/rename, group avatars. Only the chat visual pass is left.
- **Phase G done** (2026-10-06, #78–#79): delete posts, cars, meetups and profile photos; in-app
  account deletion via the `delete-account` Edge Function (deployed).
- **Live project is in sync**: every migration through `20261006130000_account_deletion` is
  pushed (2026-10-06).
- **Phase H done** (2026-10-05, `ui-refresh`), apart from a real-phone keyboard/iOS check that
  needs Tom's phone. The chat list and conversation screens got their visual pass there too.
- **Phase I done** (2026-10-06): onboarding and the ErrorBoundary landed. Sentry only reports
  once a DSN is created (Tom's).
- **Next up: Phase J** (store submission), plus the on-device checks listed under Phases H and I.
- **Remaining for launch (Phase J)**: Expo/EAS account and store credentials, manual store
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
      mobile. Once wired in Phase I, its `onError` hook should feed the ErrorBoundary too.
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
- [x] **Ghost mode / precision tiers**: extended location sharing past binary on/off with an
      approximate (~300m) mode — global scope, plain on/off `Switch` alongside the sharing
      toggle. Ran through the design-pitch workflow first (radar-signal metaphor: solid pin =
      Exakt, blurred halo = Ungefärlig, absent = Av). Fuzzing happens in the database via a
      `BEFORE INSERT OR UPDATE` trigger on `locations`, so the exact coordinate is never
      persisted in approximate mode — the stronger GDPR-thesis story. Merged `tlxq/eparadar#51`.
- [x] **Bitmoji-style action bar**: Karta's single FAB + slide-up menu replaced with a
      persistent bottom bar — search (filter friends by name), friends-list (browse all
      friends sharing location), create-meetup, and locate-me, all folded into one bar. Search
      and friends-list share one picker panel component. Verified working on a fresh Android
      Studio emulator (t14s) after resolving an unrelated dev-client setup issue
      (`@react-native-async-storage/async-storage@2.x` requires a custom dev client, not Expo
      Go — `npx expo run:android` fixed it). Merged `tlxq/eparadar#37`.
- [ ] **Activity/heat feedback**: extend the "live" pulse + interest-count treatment Meetups
      already has to friend clustering or a general "who's around" signal on the map.

## Phase E — Friends 2.0: proximity-gated discovery

Today's `friends/add.tsx` runs an unscoped `ilike` search against the entire `profiles` table —
any user can find and request any other user, with no proximity, mutual-friend, or in-person
signal required. `friendships` also only has `pending`/`accepted` states (no `blocked`), so a
removed friend can immediately re-request. This phase replaces open search with a hard-gated
model, following real precedent (Snapchat's Quick Add mutual-signal suggestions + separate
GPS-based "Add Nearby"; BeReal's move from open Discovery to "Friends of Friends" only; Zenly's
QR-code add on a live friend map) but grounded in epaRadar's own strongest signal: real GPS meetup
check-ins and the live map, not generic social-graph guessing.

- [x] **Kill open search.** Remove the unscoped `profiles`-table search in `friends/add.tsx` /
      `searchUsersToAdd`. There is no path to finding a total stranger through the app anymore.
- [x] **Meetup co-attendance candidates**: surface people who checked in at the same meetup
      as addable — `suggested_friends_from_meetups()`, deliberately check-ins only (physical
      co-presence), not `meetup_interests`/RSVP.
- [x] **Live-nearby candidates**: surface people currently sharing location within a small radius
      on the map (mirrors Snapchat's "Add Nearby" — both users' apps open). Built 2026-10-05 after
      an approved pitch, deliberately *not* on the map's `locations` data: a separate
      `nearby_presence` table with no read policies, `scan_nearby()` only lists people who have the
      radar open right now (seen in the last 20 s) within 100 m and returns name/avatar/request
      state but never coordinates or distance, `leave_nearby()` on close or background, blocked
      users and existing friends excluded. 11 pgTAP tests; verified on the Android emulator.
- [x] **Mutual-friend suggestions**: friend-of-friend graph traversal off the existing
      `is_friend()` helper.
- [x] **Personal QR/friend-code**: a per-user code, shown and scanned in person, for the case
      none of the above signals line up yet (e.g. traded phones at a meet). Built 2026-10-05 after
      an approved pitch: rotating 10-minute codes (`friend_codes` + `current_friend_code()`),
      `redeem_friend_code()` only ever creates a pending request, blocked users get the same answer
      as an expired code, 10 guesses per 10 minutes, typed 6-character fallback, and an
      `eparadar://add/<code>` deep link. 16 pgTAP tests; verified on the Android emulator. Needs
      `expo-camera` + `react-native-svg`, so phones need a new dev-client build, and the
      migration still has to be pushed to the live project.
- [x] **`blocked` friendship state**: extend `friendships.status` (today `pending`/`accepted`
      only) so a removed friend can't immediately re-request.
- [x] Run this through `eparadar-design-pitch` (now including the `mobile-app-ui-design`
      structural checklist) before building — a real product/ethics decision, same framing as the
      Phase D ghost-mode item, not just a UI reskin.

## Phase F — Chat 2.0: depth + group management

Chat's schema (`supabase/migrations/20260913120000_chat.sql`) has only SELECT/INSERT RLS on
`conversations`/`conversation_members`/`messages` — no UPDATE or DELETE policy exists at all, so
today's absence of edit/delete/leave-group/rename-group is a DB-level gap, not just a missing
button. No timestamps render, no date separators, no read state, no typing indicator, no
reactions, no media messages, group chats render with no avatar, and the chat list tab has no
realtime subscription (it doesn't live-update). This phase closes that gap.

- [x] **Timestamps, date separators, consecutive-message grouping** in the conversation view
      (done in Phase H's `ui-refresh`).
- [x] **Read receipts** — needed for the message-unsend rule below, not just a checkmark. Done in
      F1 (2026-10-05): `conversation_members.last_read_at` + `mark_conversation_read()`, "Sedd" in
      1:1, reader avatars in groups, unread dots and a Chatt tab badge.
- [x] **Typing indicators.** Done in F3 (2026-10-06) as Realtime broadcast per conversation (never
      stored), shown as a bubble in the conversation and "skriver…" in the chat list.
- [x] **Reactions.** Done in F3: `message_reactions` (one per person per message, six emojis) via
      `toggle_reaction()`, reaction bar in the long-press sheet, chips on the bubble edge.
- [x] **Media/image messages** — done in F3 with a *private* `chat-images` bucket (members only,
      signed URLs), `messages.image_path`, full-screen viewer, and unsend removing the file too.
      Reuses the Phase B upload path (`uploadFile`).
- [x] **Message delete/unsend, only while unread** — done in F1 as a definer function
      `unsend_message()` (no delete policy at all), gated server-side on the read state; long-press
      menu with Kopiera / Ta bort.
- [x] **Leave a group chat** — done in F2 (2026-10-06) as `leave_conversation()`; the longest-standing
      member becomes admin if the last admin leaves, and the group is deleted when it empties.
- [x] **Remove a group member** — done in F2: `conversation_members.role` (creator is admin; existing
      group members were all made admin since the creator wasn't recorded) + admin-only `remove_member()`.
- [x] **Rename a group** — done in F2 as `rename_conversation()` (any member, 1–40 characters), from the
      new Gruppinfo screen opened by tapping a group's header.
- [x] **Group avatar** — done 2026-10-06 with a *private* `group-avatars` bucket (members only,
      signed URLs) rather than the public pattern first planned, since group photos are private
      chat content. Any member can set, replace or remove it from Gruppinfo via
      `set_group_avatar()`; the old file is deleted on replace. Known gap: when the last member
      leaves, the group row is deleted but its avatar file stays in Storage.
- [x] **Chat list live-update** — done in F1: the tab layout subscribes to messages and read-state
      changes, and the list is sorted by latest activity.
- [ ] Visual pass (bubble styling, unread badges, presence) via `eparadar-design-pitch`, including
      the `mobile-app-ui-design` structural checklist.

## Phase G — Delete/remove everywhere

A recurring gap across the app: most delete RLS policies already exist at the DB level, but
nothing in the UI calls them. This phase hooks up what's missing plus adds the one genuinely new
piece of backend work, in-app account deletion.

- [x] **Delete a post** — done 2026-10-06: ⋯ on your own posts in the feed, removes the image file
      too.
- [x] **Delete a car** — UI hookup only; `"users delete their own cars"` RLS already exists.
- [x] **Delete a meetup you created** — UI hookup only; `"creator deletes their meetup"` RLS
      already exists (un-marking interest already works, this is the missing creator-side path).
- [x] **Remove/clear a profile photo** — revert to initials; the avatar Storage delete policy
      already exists, just no "remove" action in the UI (today avatars can only be replaced).
- [x] **In-app account deletion, with password re-confirmation** — done 2026-10-06: Settings →
      Radera konto → password → `delete-account` Edge Function. It re-checks the password,
      runs `prepare_account_deletion()` (service-role only: deletes 1:1 chats and groups that would
      end up empty, hands group admin to the longest-standing member, returns the Storage files to
      remove), removes those files, then deletes the `auth.users` row; everything else cascades.
      Background location is stopped first (and now also on Logga ut). Privacy policy updated.

## Phase H — Full page-by-page UX audit

Run every screen in the app — not just friends/chat — through `eparadar-design-pitch` (now
including the `mobile-app-ui-design` structural checklist) as one coherent pass, aimed squarely at
closing the "doesn't feel like Messenger/Snapchat" gap: feed, chat list + conversation, friends,
map, profile, settings, privacy, the post/car/meetup create and detail screens, and the auth
screens. Reuse the existing tokens (dark-first `#2F6FED`, Inter, WCAG AA) — this phase is about
structure and polish, not re-deriving the palette.

**2026-10-05**: done on the `ui-refresh` branch as a Snapchat/Messenger-inspired visual refresh
(pitch artifact approved first, then five commits): AA fixes to the light accent/success tokens, a
new type scale and radius tokens, shared `ScreenHeader`/`IconButton`/`ListRow`/`EmptyState`/
`Skeleton`/`ActionSheet`/`FormScreen`/`AuthShell` components, a floating tab bar with a thumb-zone
compose button, and every screen moved onto them. Verified on web against the local stack in
both themes; Karta overlays and the native-only sheets/alerts still need an on-device check.
Haptics were deferred because `expo-haptics` needs a fresh native build.

- [x] Audit and fix each screen's thumb-zone placement, spacing-grid consistency, typography
      limits, and empty/loading/error/success state coverage per the design-pitch checklist.
- [x] Feed, friends tab, map picker, profile, and settings each get a pass; chat's list and
      conversation screens got their visual pass here too (Phase F's DB-level depth is still open).
- [x] On-device check of the refresh on the Android emulator (2026-10-05): Karta's action bar sits
      above the floating tab bar, action sheet → block confirm works, sending a message works; the
      edit-profile sheet overlapped the status bar on Android and was fixed.
- [ ] Still needs a real phone: on-screen keyboard behavior in the composer (the emulator uses
      the host's hardware keyboard) and iOS (no Xcode on these hosts).

## Phase I — UX polish pass

Run through the `eparadar-design-pitch` workflow (taste questions → rendered Artifact →
implement) as one coherent visual pass rather than piecemeal.

- [x] **Onboarding** (2026-10-06, pitch approved first): four full-screen steps after sign-up —
      Välkommen → Vem kör du med? (friend code / scan / radar) → Synas på kartan? (off by default,
      "Dela med vänner" and "Inte nu" given equal weight) → Klart. Every step skippable, shown once
      via `profiles.onboarded_at` (existing accounts backfilled). Location uses the same
      `enableLocationSharing()` path as Settings. The "yes" path still needs an on-device check;
      web can't grant background location.
- [x] **Empty states**: real copy + a simple illustration/icon treatment for feed/chat/friends,
      replacing today's bare Swedish text strings (shared `EmptyState`, done in Phase H's refresh).
- [x] **Loading**: a new `Skeleton` component (`src/components/`) replacing raw
      `ActivityIndicator` on feed/profile/meetup-detail (also chat list and friends).
- [x] **Toast + ErrorBoundary**: toasts via `showToast()` + `ToastHost`; the root layout exports
      `ErrorFallback` as Expo Router's `ErrorBoundary` (2026-10-06) — a Swedish "Något gick snett"
      screen with Försök igen, sending the error to `Sentry.captureException`. Still needs the
      Sentry DSN (Phase A) before anything is actually reported.

## Phase J — Store submission readiness

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
