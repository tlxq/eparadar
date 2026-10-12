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
   - [ ] Apply 7b–7g to the live database, deploy `notify-report` and `send-push`, set secrets
   - [ ] Tom: leaked-password protection in Supabase Auth, `RESEND_API_KEY` function secret

5. **Bigger features** (each also needs report, block and expiry where it applies)
   - [ ] Meetup list inside Karta, invite friends, share to chat
   - [ ] Likes, comments and photo zoom in the feed
   - [ ] Realtime feed
   - [ ] Add members to a group, edit car details

6. **Design round (pitch in an artifact first)**
   - [ ] Map markers scale with zoom (people, spots, meetups get smaller zoomed out)
   - [ ] Marker look: avatar vs icon, drop the small car badge on each marker
   - [ ] Full profile page for other users (their cars and posts), opened from the person sheet
   - [ ] Feed: something unique for epaRadar (ideas to pitch: car tags, meetup recaps, spot check-ins)
   - [ ] Show how long things on the map have left (the expiry itself is 7a)
   - [ ] UX pass on delete buttons and overall polish (design skills)

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
