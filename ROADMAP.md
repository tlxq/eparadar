# epaRadar roadmap

Living checklist. Tick items as they land. Finished detail lives in git history and merged PRs.

## Done

- **Core**: identity, feed, cars, friendships, 1:1 and group chat, opt-in friends-only live map
  with background tracking, meetups, photos and avatars, privacy policy, branding, store assets.
- **A** quality gate and analytics · **B** car and post photos · **C** push notifications ·
  **D** map polish (avatar markers, ghost mode, action bar)
- **E** friends 2.0: friend codes, QR, nearby radar, mutual and meetup suggestions, blocking
- **F** chat 2.0: read receipts, unsend, typing, reactions, image messages, group management
- **G** delete everywhere, including in-app account deletion
- **H / I** UX audit, onboarding, empty states, skeletons, toasts, error boundary
- **Karta 2.0** night map, own avatar, Raggställen, Varningar, status, heat, spot photos, follow me
- **Dev loop** `npm run phone`: wireless install, rebuild only on native changes, several phones

## Now — cleanup, safety, structure, UX (agreed 2026-10-11)

1. **Cleanup**
   - [x] Unused dependencies, dead exports, duplicate assets, short README, this roadmap
   - [x] Delete merged and superseded branches
2. **Safety (friends only)**
   - [x] New chats only between friends (database check + friends-first new-chat screen)
   - [x] Feed shows friends' posts and your own, with paging
3. **Structure** (no visual change)
   - [x] Shared hooks: `useUserId`, `useProfile`, `useMyCars`, `useFriends`, `useConversations`,
         `useFriendLocations`, `usePickImage`, `useQueryErrorToast`
   - [x] Shared UI: `FormSheet`, `ModalHeader`, `Chip`, `Radius.pill` everywhere
   - [x] Typography tokens, map colors from theme
   - [x] Types from `database.types.ts`, `ProfileSummary`
   - [x] Move chat, friends and profile parts into `features/*` (chat screen 762 → 466 lines)
   - [x] Split `karta.tsx` into hooks and parts (855 → 336 lines)
   - [x] Common Swedish words in one place
4. **Fewer taps**
   - [x] Person sheet from map, feed, friends and chat (Chatta, Visa på kartan)
   - [x] Ghost mode toggle on Karta (tap yourself on the map)
   - [x] Code entry directly on Lägg till vän
   - [x] Own posts on Profil (with delete)
   - [x] Camera option when posting (also chat and spot photos)
   - [x] Notification opens the right screen from a closed app
   - [x] Messages appear instantly when sent
   - [x] Haptics on key actions
   - [x] Blocked users list with unblock (Inställningar)
   - [x] Map friend search stays above the keyboard (panel moves to the top)
7. **Launch safety (before 6 and 5, agreed 2026-10-12)**
   - [x] Rules in `CLAUDE.md` and `.claude/rules`, policies only for logged-in users (#125)
   - [x] 7a Everything on the map is friends-only and deleted on a schedule (pg_cron)
   - [x] 7b Storage: post images private, every bucket logged-in only, size and type limits
   - [x] 7c Report and block on posts, messages, profiles, spots and meetups
   - [x] 7d Age 15+ checked at sign-up, on the server
   - [x] 7e Push notifications without message text, skip blocked users
   - [x] 7f One privacy policy for web and app, terms, community rules, web delete-account page,
         data export
   - [x] 7g Small hardening (function defaults, meetup counts, check-in window)
   - [x] Apply 7b–7g to the live database, deploy `notify-report` and `send-push`, set secrets
   - [x] Tom: leaked-password protection in Supabase Auth, `RESEND_API_KEY` function secret (sending-only keys)

6. **Design round (picked by Tom 2026-10-12 in the pitch artifact, one PR each, in this order)**
   - [ ] 6a Words: kompisar, post, Radarn, playful tone with full stops, map words
         (Spot = anything on the map, Ragga, Meet, Varning, verb Placera), vehicle words
         EPA / kärra / traktor, clearer private push texts, one section-label component,
         one-line help texts, short block text, "📷 Bild"
   - [ ] 6b The 22 bug fixes from the pitch (Swedish auth errors, post image links that expire,
         grey buttons that explain, meetup errors, "Pågår nu" ends, spot time left, and the rest)
   - [ ] 6c App-wide patterns: Karta as the middle tab, own confirm sheet, delete rules
         (small things undo, own content ⋯ + confirm), error + Försök igen on every screen,
         placeholders everywhere, buttons with dropdowns to save space
   - [ ] 6d Sign-up and login: one field per screen with steps and validation, email
         verification, Glömt lösenordet, show password, "Minst 8 tecken", friendlier age text,
         clearer location step, ✓ on the friends step, push asked the first time it matters
   - [ ] 6e Report and block: reason, optional text, Skicka; anonymous thank-you; add it to radar,
         friend requests, spot photos, group chats, statuses and full-screen chat images;
         an admin view for Tom to see reports and map items
   - [ ] 6f Map look: avatar parked and car when driving, three zoom steps with stacks, filled
         colors for spots, meetups and warnings, meetup chip "Namn · 20:00", old positions fade,
         time left only for the creator, heat explained once, location-off banner, status counter,
         status greyed out in ghost mode
   - [ ] 6g Map actions: button bar with dropdowns, hold the map for "Lägg till här" (Ragga with
         its own icon, Varning, Meet), no hidden long-press interest, filter chips, warnings get
         "Finns kvar / Borta nu" (5 votes clear it) and a small banner when you are close,
         full-screen spot photos, meetup time picker, meetup page with map, edit, share, avatars
   - [ ] 6h Feed: picture first, emoji reactions, send to chat, full-screen zoom, new header,
         story-style map row, picture-only posts, two empty states, discard-draft question,
         Kvällen (evening map card) and Släpp (post at a place, photo pin for 24 h)
   - [ ] 6i Profile and cars: full profile (garage first), strangers see name and cars only,
         correct and tappable counts, full car edit, car page with its posts, "Färg på kartan"
         with preview, camera choice for car and avatar, @username shown as locked
   - [ ] 6j Chat: double-tap 🔥, tap for time, tappable reaction chips, "Ångra skickat" with
         confirm, retry on failed messages, picture preview, chevron in the header, hold a chat
         row for a menu, mute, add group members, everyone can rename a group
   - [ ] 6k Kompisar: four tiles then suggestions, one code screen, undo toasts, "Neka" button,
         chat icon on each row, blocked list always in Settings, radar stops after 30 s,
         "Skicka meddelande" after adding
   - [ ] 6l Settings: Plats, Aviseringar (one switch per type), Sekretess, Hjälp, Konto

5. **Bigger features after the design round** (each also needs report, block and expiry)
   - [ ] Invite friends to a meetup, meetup list inside Karta
   - [ ] Comments and a realtime feed

## Later

- [ ] Chat visual pass (bubbles, presence)
- [ ] Map activity and heat feedback for friends
- [ ] Honk at a friend, cruising routes, in-app camera for spot photos
- [ ] Sentry: create the project and add the DSN

## On-device checks

- [ ] Karta 2.0 on Tom's phone
- [ ] Keyboard in chat composer on a real phone
- [ ] iOS (needs a Mac)

## Store launch (Phase J)

- [x] App icon, splash, privacy policy, store screenshots and copy, background-location
      declaration draft
- [ ] Apple Developer enrollment, App Store Connect record, `eas.json` iOS submit credentials
- [ ] Play Data Safety form, content rating 15+, Apple UGC answers
- [ ] First manual Play and App Store submission
- [ ] Optional: EAS build and submit in GitHub Actions
