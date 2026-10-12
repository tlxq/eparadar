---
paths:
  - 'apps/mobile/src/**/*.tsx'
  - 'apps/web/src/**'
  - 'packages/theme/**'
---

# Design rules

The app and the website share one look, defined in `packages/theme`.

## Tokens

- Colors come from `useTheme()` in the app and from the CSS variables in
  `apps/web/src/layouts/BaseLayout.astro` on the web. No hex values in screens or
  components. A new color is added to `packages/theme/src/colors.ts` for both
  `light` and `dark`.
- Spacing uses `Spacing` (`half` 2, `one` 4, `two` 8, `three` 16, `four` 24,
  `five` 32, `six` 64). Corners use `Radius` (`sm`, `md`, `lg`, `xl`, `pill`).
- Text goes through `ThemedText` with a `type` (`title`, `subtitle`, `headline`,
  `default`, `small`, `smallBold`, `caption`, `error`). Do not set font sizes by hand.
- Every screen must work in both light and dark mode.

## Components

Use what exists in `apps/mobile/src/components` before building something new:

- Actions: `Button` (`variant` primary, secondary, ghost; `tone` brand, success,
  danger), `IconButton`, `Fab`, `Chip`, `Switch`
- Forms: `TextField`, `FormScreen`, `FormSheet`, `KeyboardAvoider`
- Layout: `ScreenBackground`, `ScreenHeader`, `ModalHeader`, `ListRow`, `ActionSheet`,
  `SectionLabel` for the small-caps headings above a group
- People: `Avatar`, `ConversationAvatar`
- Menus: `DropdownButton` (one button that opens a small anchored menu of `MenuItem`s; icon-only
  `⋯` by default, or `label` for a pill with a chevron, or `children` for a custom trigger). For
  a custom trigger use `useDropdown()` + `DropdownMenu` (`align` start/end, `placement`
  auto/above/below). Use it instead of a row of several buttons.
- States: `Skeleton`/`SkeletonList` while loading, `EmptyState` when there is nothing to show,
  `ErrorState` when a load fails, `showToast` for results

Icons are Ionicons.

## App-wide patterns

- Tabs: Flöde · Chatt · Karta · Kompisar · Profil. Karta stays in the middle.
- Loading: every screen that loads data shows placeholder bars (`Skeleton`, `SkeletonList`),
  never a blank screen or a lone spinner.
- Load errors: when a query fails and there is nothing to show, render
  `<ErrorState message="… gick inte att ladda. Kolla nätet och testa igen." onRetry={refetch} />`
  in place of the content. `useQueryErrorToast` is only for failed refetches when data is
  already on screen (`isError && !!data`).
- Confirm: `await confirm({ title, message, confirmLabel, cancelLabel?, destructive?, icon? })`
  from `lib/confirm` opens the app's own bottom sheet and resolves `true`/`false`.
  `confirmDestructive(...)` is the same with `destructive: true`. Never use `Alert.alert`.
  Open it after a sheet or menu has closed (`ActionSheet` and `DropdownMenu` already delay
  `onPress` for that).
- Deleting:
  - Small stuff (status, photo, reaction): remove at once, no question, and call
    `showUndoToast({ message, onUndo, onCommit? })` from `store/toast`. With `onCommit`, hide
    the thing in the query cache first and do the real delete in `onCommit` (it runs when the
    toast closes, is replaced or the app goes to the background); `onUndo` just refetches.
    Without `onCommit`, delete right away and make `onUndo` put it back.
  - Your content (post, spot, meet, EPA): a `⋯` menu (`DropdownButton` or `ActionSheet`) with
    the delete item, then `confirmDestructive`. No big red delete buttons on screens.
  - Account: only on its own screen (`/delete-account`).

## Text

- All app text is Swedish, informal and short. Address the user as "du".
- Shared words (`Avbryt`, `Spara`, `Ta bort`) come from `Common` in
  `apps/mobile/src/constants/strings.ts`, app words from `Words` in the same file.
- Word list: friends are "kompisar", posts are "poster" ("Posta"), the nearby feature is
  "Radarn", anything on the map is a "spot" (kinds "Ragga", "Meet", "Varning"), putting it there
  is "Placera", the vehicle is "EPA" in labels and "kärra"/"traktor" in playful copy.
- Toasts are playful and always end with "." or "!".
- Text about location says who can see the position and how to turn it off.

## Accessibility and motion

- Pressables have an `accessibilityRole`, and an `accessibilityLabel` when the
  visible text does not describe the action.
- Animations respect `useReducedMotion`. Haptics go through `lib/haptics`.

## Where UI code goes

- Screens: `apps/mobile/src/app` (Expo Router). Keep them thin.
- Feature parts and hooks: `apps/mobile/src/features/<feature>`.
- Shared UI: `apps/mobile/src/components`.
