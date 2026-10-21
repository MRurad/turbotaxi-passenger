---
name: ui-design-system
description: TurboTaxi design system — white + steel blue palette, light/dark tokens, typography, spacing, shared UI components, and rules for building any new screen or component. Use for every UI task.
---

# Design system

Look and feel: clean, modern, airy. Lots of white (or deep navy in dark mode), steel blue as the single accent, soft shadows, rounded 16–24 px cards, bottom sheets over the map, smooth Reanimated transitions, and haptics on key actions. Think Bolt or Uber quality, but calmer.

## Tokens (src/theme)
`palette.ts` holds raw colors (the only file with hex):
```
steel: 50 #EEF4FA, 100 #D6E4F1, 200 #ADC9E3, 300 #84AED5, 400 #5B93C7,
       500 #4682B4 (brand), 600 #386890, 700 #2A4E6C, 800 #1C3448, 900 #0E1A24
neutral: 0 #FFFFFF, 50 #F7F9FC, 100 #EEF1F6, 200 #DDE3EC, 300 #C3CCD9, 400 #94A0B4,
         500 #6B778C, 600 #4A5568, 700 #2D3748, 800 #1A2233, 900 #0B1220
success #22A06B · warning #E5A000 · danger #E5484D
```
`colors.ts` holds **semantic** tokens for `light` and `dark`: `background, surface, surfaceElevated, border, textPrimary, textSecondary, textMuted, textOnPrimary, primary, primaryPressed, primarySoft, success, warning, danger, overlay, mapRoute, skeleton`.
- Light: background #FFFFFF, surface neutral.50, primary steel.500.
- Dark: background neutral.900, surface #121A2A, surfaceElevated #18233A, primary steel.400 (for contrast), textPrimary neutral.50.

`spacing.ts`: 4-pt scale `{ xxs:2, xs:4, sm:8, md:12, lg:16, xl:24, xxl:32, xxxl:48 }`
`radii.ts`: `{ sm:8, md:12, lg:16, xl:24, pill:999 }`
`typography.ts`: Inter (via `@expo-google-fonts/inter`) variants: `display 32/700, title 24/700, heading 18/600, body 16/400, bodyStrong 16/600, caption 13/400, label 12/600 (uppercase tracking 0.5)`.
`shadows.ts`: `sm, md, lg`. These are platform-aware (iOS shadow*, Android elevation). In dark mode, use borders instead of heavy shadows.

## Theme API
- `ThemeProvider` supports a `mode: 'system' | 'light' | 'dark'` (persisted in AsyncStorage). It exposes `{ colors, spacing, radii, typography, shadows, isDark }`.
- `useTheme()`.
- `makeStyles((theme) => ({...}))` returns a `useStyles()` hook (memoized per theme). Every component styles itself with this.
- Set the StatusBar style and the navigation theme from the theme.

## Shared components (src/components/ui), build these, then reuse them
`Text` (variant, color token), `Button` (primary / secondary / ghost / danger, sizes, loading, leftIcon, haptic), `IconButton`, `Input` (label, error, left/right icon, secure toggle), `Card`, `Screen` (safe area + background + optional scroll + keyboard avoiding), `Header`, `Divider`, `Avatar`, `Badge`, `Chip` (selectable), `ListItem`, `Skeleton` (shimmer), `EmptyState` (icon, title, text, action), `ErrorState` (retry), `Sheet` (wrapper around @gorhom/bottom-sheet using theme colors), `ConfirmDialog`, `Toast` (simple context-based), `ConnectionBanner`.
Each component has typed props, an `accessibilityRole`/`accessibilityLabel` where interactive, a minimum 44×44 touch target, and a `testID` passthrough.

## Screen checklist
1. Use `Screen` and `Header` (or the map plus sheets).
2. Loading uses a skeleton (not a bare spinner) for lists and cards.
3. The error state has a retry; the empty state has an illustration icon and a helpful action.
4. All text goes through i18n. Numbers and money use formatters.
5. Check light, dark, a small phone (iPhone SE) and a large phone, and long Russian strings.
6. Use subtle motion: `FadeIn`/`SlideInDown` from Reanimated for sheets and cards, and press scale 0.97 on buttons.
7. Use haptics: selection on vehicle choice, success on ride created, warning on cancel.

## Never
- Use hex or rgba outside `src/theme`.
- Use inline style objects for anything beyond a one-off dynamic value.
- Use a different icon family per screen. Use `Ionicons` from `@expo/vector-icons` throughout.
