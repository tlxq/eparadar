---
paths:
  - "apps/mobile/src/**/*.tsx"
  - "apps/web/src/**"
  - "packages/theme/**"
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
- Layout: `ScreenBackground`, `ScreenHeader`, `ModalHeader`, `ListRow`, `ActionSheet`
- People: `Avatar`, `ConversationAvatar`
- States: `Skeleton` while loading, `EmptyState` when there is nothing to show,
  `showToast` for results and `useQueryErrorToast` for failed queries
- Destructive actions ask first with `confirmDestructive`

Icons are Ionicons.

## Text

- All app text is Swedish, informal and short. Address the user as "du".
- Shared words (`Avbryt`, `Spara`, `Ta bort`) come from `Common` in
  `apps/mobile/src/constants/strings.ts`.
- Text about location says who can see the position and how to turn it off.

## Accessibility and motion

- Pressables have an `accessibilityRole`, and an `accessibilityLabel` when the
  visible text does not describe the action.
- Animations respect `useReducedMotion`. Haptics go through `lib/haptics`.

## Where UI code goes

- Screens: `apps/mobile/src/app` (Expo Router). Keep them thin.
- Feature parts and hooks: `apps/mobile/src/features/<feature>`.
- Shared UI: `apps/mobile/src/components`.
