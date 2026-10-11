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
   - [ ] Delete merged and superseded branches
2. **Safety (friends only)**
   - [x] New chats only between friends (database check + friends-first new-chat screen)
   - [x] Feed shows friends' posts and your own, with paging
3. **Structure** (no visual change)
   - [x] Shared hooks: `useUserId`, `useProfile`, `useMyCars`, `useFriends`, `useConversations`,
         `useFriendLocations`, `usePickImage`, `useQueryErrorToast`
   - [x] Shared UI: `FormSheet`, `ModalHeader`, `Chip`, `Radius.pill` everywhere
   - [ ] Typography tokens, map colors from theme
   - [x] Types from `database.types.ts`, `ProfileSummary`
   - [x] Move chat, friends and profile parts into `features/*` (chat screen 762 → 466 lines)
   - [ ] Split `karta.tsx` into hooks and parts (needs a phone to verify)
   - [ ] Common Swedish words in one place
4. **Fewer taps**
   - [ ] Person sheet from map, feed, friends and chat (Chatta, Visa på kartan)
   - [ ] Ghost mode toggle on Karta
   - [ ] Code entry directly on Lägg till vän
   - [ ] Own posts on Profil
   - [ ] Camera option when posting
   - [ ] Notification opens the right screen from a closed app
   - [ ] Messages appear instantly when sent
   - [ ] Haptics on key actions
   - [ ] Blocked users list with unblock
5. **Bigger features**
   - [ ] Meetup list inside Karta, invite friends, share to chat
   - [ ] Likes, comments and photo zoom in the feed
   - [ ] Realtime feed
   - [ ] Add members to a group, edit car details

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
- [ ] First manual Play and App Store submission
- [ ] Optional: EAS build and submit in GitHub Actions
