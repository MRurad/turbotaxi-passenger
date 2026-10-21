# TurboTaxi Passenger — Claude Code prompts

Run these in order. Each prompt is one feature. Paste a prompt, let Claude Code finish, test on your iPhone, and only then move to the next one.

**Tips**
- For prompts marked 🧭, press **Shift+Tab** to switch Claude Code into **plan mode** first. Read the plan, correct it, then approve.
- After each prompt, Claude Code runs `code-reviewer` + `ui-reviewer` (they're part of the prompts). Ask it to fix all **Must fix** / **High** items before committing.
- If a step breaks, tell Claude Code exactly what you see (screenshot, error text). Don't move on with a broken step.
- Use `/clear` between prompts to keep context small. CLAUDE.md and the skills reload automatically.

---

## Step 0 — Manual setup on Windows (you, ~15 min)

1. Install **Node.js LTS**, **Git**, and **Claude Code**.
2. On your iPhone, install **Expo Go** from the App Store. Your laptop and iPhone must be on the same Wi-Fi. If they can't be, use `npx expo start --tunnel`.
3. In PowerShell:
   ```powershell
   cd C:\dev
   npx create-expo-app@latest turbotaxi-passenger --template blank-typescript
   cd turbotaxi-passenger
   git init
   ```
4. Copy **everything from this kit** into `turbotaxi-passenger\`: `CLAUDE.md`, `PROMPTS.md`, the `docs\` folder and the `.claude\` folder.
5. Create a Google Cloud API key. Enable: Maps SDK for iOS, Maps SDK for Android, Places API (New), Geocoding API.
6. Create `.env` in the project root:
   ```
   EXPO_PUBLIC_API_URL=https://api.turbotaxi.deepcode.az
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
   ```
7. Send `docs\BACKEND_REQUESTS.md` to your backend friend. The **server→client event names** (item 1) block prompt 9.
8. Run `claude` in the project folder.

> **Windows + iPhone note:** You can't run an iOS simulator on Windows. Prompts 1–12 are built to run in **Expo Go** on your real iPhone. In Expo Go on iOS the map shows **Apple Maps**; Google Maps on iOS needs a development build (prompt 14, which needs an Apple Developer account). Android uses Google Maps in Expo Go.

---

## Prompt 1 — Foundation & architecture 🧭

```
Read CLAUDE.md and all skills in .claude/skills. This is a fresh Expo blank-typescript project and we are building the TurboTaxi passenger app from scratch.

Set up the foundation only (no feature screens yet):
1. Install with `npx expo install` where applicable: expo-router, react-native-safe-area-context, react-native-screens, expo-linking, expo-constants, expo-status-bar, react-native-reanimated, react-native-gesture-handler, @gorhom/bottom-sheet, react-native-maps, expo-location, expo-secure-store, @react-native-async-storage/async-storage, expo-localization, expo-haptics, expo-font, @expo-google-fonts/inter, @expo/vector-icons, expo-splash-screen. And with npm: axios, @tanstack/react-query, zustand, @microsoft/signalr, zod, react-hook-form, @hookform/resolvers, i18next, react-i18next, date-fns, @googlemaps/polyline-codec, uuid. Dev: openapi-typescript, jest-expo, jest, @testing-library/react-native, @types/jest, prettier, eslint config via `npx expo lint`.
2. Move to Expo Router with routes in src/app (set "main": "expo-router/entry"). Create the full folder structure from CLAUDE.md with index files where useful. Path alias "@/*" -> "src/*" in tsconfig (strict: true, noUncheckedIndexedAccess: true).
3. app.config.ts (not app.json): name "TurboTaxi", slug, scheme "turbotaxi", ios.bundleIdentifier and android.package "az.turbotaxi.passenger", userInterfaceStyle "automatic", Google Maps keys from env, expo-location plugin with permission text, expo-router and expo-font plugins, reanimated babel plugin if required by the installed version.
4. src/constants/config.ts: reads and validates env vars with zod (API_URL, GOOGLE_MAPS_API_KEY) and fails loudly in dev if missing. Also create storageKeys.ts, queryKeys.ts (factory), routes.ts, vehicles.ts (VehicleType 0-3 with i18n label keys, icon names, and seat count. Mark names "TODO confirm with backend": 0 economy, 1 comfort, 2 business, 3 minivan), rideStatus.ts (placeholder mapping + 'unknown').
5. package.json scripts: "typecheck", "lint", "test", "api:types": "openapi-typescript https://api.turbotaxi.deepcode.az/swagger/v1/swagger.json -o src/api/generated/schema.ts". Run api:types once.
6. Jest config with the jest-expo preset and moduleNameMapper for "@/". Add one sample test to prove it runs.
7. Prettier config (singleQuote, trailingComma all, printWidth 100). Add .gitignore entries for .env.
8. A minimal src/app/_layout.tsx and index.tsx showing "TurboTaxi" so I can open it in Expo Go.

Explain the folder structure briefly when you're done. Run typecheck, lint and test, then commit "chore: project foundation".
```

## Prompt 2 — Design system & theme 🧭

```
Use the ui-design-system skill.

Build the complete theme and shared UI kit:
1. src/theme: palette.ts, colors.ts (light + dark semantic tokens), spacing.ts, radii.ts, typography.ts (Inter loaded with expo-font, splash screen kept until fonts load), shadows.ts, ThemeProvider (mode: system|light|dark, persisted), useTheme, makeStyles.
2. src/components/ui: Text, Button, IconButton, Input, Card, Screen, Header, Divider, Avatar, Badge, Chip, ListItem, Skeleton (shimmer with reanimated), EmptyState, ErrorState, Sheet (gorhom bottom sheet themed), ConfirmDialog, Toast (provider + useToast), ConnectionBanner. One file each with typed props, an index.ts barrel, accessibility and testID support.
3. src/providers/AppProviders.tsx: GestureHandlerRootView, SafeAreaProvider, ThemeProvider, QueryClientProvider (sane defaults: retry 1 for queries, 0 for mutations, staleTime 30s), BottomSheetModalProvider, ToastProvider. Use it in the root layout.
4. A temporary dev-only route src/app/dev/ui-kit.tsx that shows every component in all variants with a light/dark toggle, so I can review the look on my phone.

Make it look premium and modern: white + steel blue, generous spacing, soft shadows, rounded cards, press animations. Then run the ui-reviewer and code-reviewer agents, fix the High/Must items, run typecheck/lint/test, and commit "feat(ui): design system and theme".
```

## Prompt 3 — i18n

```
Use the i18n skill.

1. Set up i18next with az (default), ru, en, device-language detection, a persisted preference, and typed keys (i18next.d.ts).
2. Create the locale files with these sections already filled in all 3 languages: common (actions, labels), errors (network, timeout, unauthorized, unknown, validation), auth, home, search, booking, ride (all phases), chat, history, promo, profile, settings, permissions. Write natural, high-quality Azerbaijani and Russian, not literal translations.
3. src/lib/format.ts: formatMoney (AZN), formatDistance, formatDuration, formatDate/formatRelative with the date-fns locale per language. Add unit tests for these.
4. useChangeLanguage hook.
5. Replace any hardcoded strings in the UI kit demo with t().

Run typecheck/lint/test and commit "feat(i18n): az/ru/en localization".
```

## Prompt 4 — API layer & auth storage 🧭

```
Use the api-client skill.

1. src/api/types.ts with friendly aliases from the generated schema (only the passenger-relevant ones).
2. src/api/endpoints.ts with every passenger endpoint from Swagger: Auth, Rides (create, cancel-by-user), Routes estimate, Chat (messages GET/POST, conversations), TripHistory user, PromoCodes (user list, apply), Users (get by id, update).
3. src/api/errors.ts (ApiError + toApiError covering axios errors, timeouts, no network, and the { success:false, message } envelope). Map to i18n error keys.
4. src/lib/secureStorage.ts (tokens in expo-secure-store) and src/lib/storage.ts (typed AsyncStorage helpers with JSON + zod validation).
5. src/features/auth/store.ts (Zustand): user, accessToken, refreshToken, expiresAt, status ('loading'|'authenticated'|'unauthenticated'); hydrate(), setSession(authResponse), logout(). Tokens persist ONLY in SecureStore, and the user object in AsyncStorage.
6. src/api/client.ts: axios instance + interceptors exactly as described in the skill (Bearer, Accept-Language, a 401 → logout guard, and a TODO(refresh) hook).
7. Services: auth.ts, rides.ts, routes.ts, chat.ts, tripHistory.ts, promo.ts, users.ts with DTO → domain mappers. userId always comes from the auth store.
8. Unit tests for toApiError, the mappers, and the auth store.

Don't build screens. Run code-reviewer, fix Must items, then typecheck/lint/test and commit "feat(api): typed api layer and auth store".
```

## Prompt 5 — Authentication screens

```
Build authentication using the existing UI kit, api layer and i18n.

1. Routes: src/app/(auth)/_layout.tsx, (auth)/welcome.tsx, (auth)/login.tsx, (auth)/register.tsx; src/app/(app)/_layout.tsx (protected). The root layout hydrates the auth store and redirects: unauthenticated → (auth)/welcome, authenticated → (app). Show a branded splash or skeleton while loading.
2. Welcome screen: a large brand header (steel blue gradient or illustration made with shapes + Ionicons, no external images needed), the tagline, and Login / Create account buttons, plus a language switcher chip (AZ / RU / EN) at the top.
3. Login: email + password (react-hook-form + zod, a show/hide password toggle, keyboard-aware, submit on enter). Register: name, surname, phone (+994 prefix, mask 5X XXX XX XX, sent as +994XXXXXXXXX), email, password + confirm. All validation messages come from i18n.
4. useLogin and useRegister mutation hooks. On success setSession → navigate to the app. Server errors (message from the envelope) show inline or as a toast.
5. Logout is available from a temporary button on the app home placeholder.

Keep each screen small: put the form in features/auth/components. Run ui-reviewer + code-reviewer, fix High/Must, add tests for form validation, then typecheck/lint/test and commit "feat(auth): login and register".
```

## Prompt 6 — Home map & location 🧭

```
Use the maps-location and ui-design-system skills.

1. src/features/map: constants (MAP_PROVIDER with the Expo Go fallback, BAKU_REGION), light/dark Google map styles, AppMap, CenterPin, PlaceMarker, RoutePolyline, CarMarker (animated; leave it unused for now), useCurrentLocation.
2. Home screen (src/app/(app)/index.tsx → features/home/screens/HomeScreen.tsx):
   - A full-screen map centered on the user (or Baku if permission is denied, with a friendly permission card + Open Settings).
   - A floating top bar: a menu/avatar button (opens the profile later) and a "my location" button bottom-right.
   - A pickup pin in the center. When the map stops moving, reverse-geocode and show the address in the bottom sheet ("Pickup: …", skeleton while loading).
   - Bottom sheet: a "Where to?" big search field, and a row of recent places.
3. src/lib/google/placesClient.ts, reverseGeocode, and useReverseGeocode / usePlacesAutocomplete hooks (debounced, session tokens, region AZ, current language).
4. A search modal route (src/app/(app)/search.tsx): pickup + destination inputs, autocomplete results, a "Choose on map" option, recent places (persisted, max 10). Selecting a destination saves it into the booking draft store (features/booking/store.ts) and returns to home.

Run ui-reviewer + code-reviewer, fix High/Must, then typecheck/lint/test and commit "feat(home): map, location and place search".
```

## Prompt 7 — Vehicle selection, estimate & promo

```
Use the ride-flow, api-client and ui-design-system skills.

When both pickup and destination are set on home:
1. Draw the route: fit the camera to pickup + destination with padding for the sheet. Show the polyline from the estimate response (encodedPolyline).
2. The booking bottom sheet (features/booking) shows a vehicle list. Use useQueries to call POST /api/Routes/estimate for all 4 vehicle types in parallel (origin, destination, vehicleType, userId, promoCode if selected). Each row has: vehicle icon, name, seats, ETA/duration, and price (show the original price struck through when discounted). Show skeleton rows while loading and an error row with retry. Selection has a haptic.
3. A promo row: "Add promo code" opens a sheet listing the user's active promos (GET /api/PromoCodes/user/{userId}?activeOnly=true) with the code, description, discount (percent/amount) and remaining rides. Selecting one re-runs the estimates with that promoCode.
4. The summary shows pickup → destination with an edit action, payment method "Cash" (fixed for now, with a cash icon), and a big "Order {vehicle} · {price}" button.
5. Edit pickup/destination and clear the destination (the back button returns to "Where to?").

No ride creation yet; the Order button just logs for now. Run ui-reviewer + code-reviewer, fix High/Must, add tests for the estimate mapping + promo display logic, then commit "feat(booking): vehicle selection, estimate and promo".
```

## Prompt 8 — Realtime layer 🧭

```
Use the realtime-signalr skill and read docs/REALTIME_CONTRACT.md.

1. src/realtime/events.ts: hub paths, method names, event names (placeholders where TODO), zod schemas and TS types for each payload, and the event map.
2. HubConnectionManager with WebSocket transport, the JWT accessTokenFactory, automatic reconnect with an infinite policy, re-running on-connect actions after reconnect, typed on() returning an unsubscribe function, a connection state observable, and dev logging of unknown events (use connection.on for each known name + a catch-all strategy if the library allows it; otherwise log via a debug hook).
3. userHub.ts and chatHub.ts singletons with typed helpers.
4. useRealtimeLifecycle (mounted in the (app) layout): start on login, SubscribeUser on connect, Ping every 30s, AppState handling, stop on logout.
5. Show the ConnectionBanner at the top of the app when the user hub is reconnecting or disconnected.
6. A dev-only screen src/app/dev/realtime.tsx showing the connection state, the last 50 received events (raw JSON), and buttons to invoke hub methods. I'll use this to discover the real event names with my backend friend.
7. Tests for HubConnectionManager with a mocked @microsoft/signalr.

Commit "feat(realtime): signalr connection manager".
```

## Prompt 9 — Ride request & live tracking 🧭

> Before this one, update `docs/REALTIME_CONTRACT.md` with the real event names and payloads from your backend friend, or the ones you saw on the dev realtime screen.

```
Use the ride-flow, realtime-signalr and maps-location skills. I updated docs/REALTIME_CONTRACT.md: sync src/realtime/events.ts and the zod schemas with it first and show me the diff.

Implement the full ride lifecycle:
1. features/ride/store.ts exactly per the skill (phases, transition table, persistence, 3h staleness reset) + full unit tests of transitions.
2. The Order button: POST /api/Rides → startSearching. Show a success haptic.
3. useRideEvents hook (mounted once in the (app) layout): maps user-hub events to store transitions. On driver_assigned, SubscribeToDriverLocation(driverId). Unsubscribe on completed/cancelled. Driver location events → updateDriverLocation.
4. useRideRouteGuard for routing by phase as described in the skill.
5. Screens (map stays visible behind the sheets):
   - Searching: an animated pulse around the pickup pin, "Looking for a driver…", elapsed time, vehicle + price, and Cancel (ConfirmDialog → cancel-by-user). After a 3 min timeout show the no_driver state with Retry/Cancel.
   - Driver on the way / arrived: a driver card (avatar initials, name, car brand + model + color, a big plate number badge), ETA, the to-pickup polyline, an animated CarMarker following location updates, and buttons Call (tel: link), Chat (navigates to chat; built next prompt), and Cancel. "Driver arrived" gives a clear highlighted state + haptic.
   - In progress: the trip polyline, car marker, destination ETA, and a share-trip placeholder.
   - Summary (completed): final price, original/discount/promo, distance/duration, and Done → reset. Cancelled: the reason + "Book again".
6. Restore on app start: if a persisted active ride exists, reconnect, resubscribe and show the right screen.

Add any missing backend items to docs/BACKEND_REQUESTS.md. Run test-writer for the ride hooks, then ui-reviewer + code-reviewer, fix High/Must, and commit "feat(ride): request, live tracking and summary".
```

## Prompt 10 — In-ride chat

```
Build driver ↔ passenger chat for the active ride.

1. Route src/app/(app)/chat/[rideId].tsx.
2. Load history with GET /api/Chat/rides/{rideId}/messages (actorRole and actorId from constants + the auth store) using an infinite query (newest at the bottom, load older on scroll up; an inverted FlatList is fine).
3. Realtime: JoinRideChat on mount (and on reconnect), LeaveRideChat on unmount, and append incoming messages to the query cache (dedupe by id).
4. Send with POST /api/Chat/rides/{rideId}/messages: optimistic message with a pending/failed state and tap-to-retry.
5. UI: modern bubbles (mine = steel blue, theirs = surface), time stamps, day separators, quick-reply chips ("I'm coming", "I'm here", "Please wait 2 minutes" in all 3 languages), a keyboard-aware input bar, and the driver name + car in the header.
6. An unread badge on the Chat button in the driver card when a message arrives while the chat isn't open.

Run ui-reviewer + code-reviewer, fix High/Must, add tests for dedupe/optimistic logic, then commit "feat(chat): in-ride chat".
```

## Prompt 11 — History, promos, profile & settings

```
Build the remaining screens. The home top-left button opens a menu (drawer-style sheet or a profile screen with list items).

1. Trip history (GET /api/TripHistory/user/{userId}, infinite): cards with date, pickup → destination, vehicle, final fare (struck original if discounted), and a status badge. Tapping opens a detail screen with all fields + driver/vehicle info. Skeleton loading and an empty state ("No trips yet" + Book a ride).
2. My promo codes: active / used tabs, a card per promo with code (tap to copy + toast), discount, remaining rides, and expiry.
3. Profile: avatar initials, name, surname, phone, email; an edit form (PUT /api/Users) with validation; the success toast also updates the auth store.
4. Settings: language (AZ/RU/EN), theme (System/Light/Dark), about/version, logout (confirm), and a delete-account placeholder (disabled, "coming soon").

Run ui-reviewer + code-reviewer, fix High/Must, then commit "feat: history, promos, profile and settings".
```

## Prompt 12 — Polish & hardening

```
Do a full polish pass on the whole app:
1. A global ErrorBoundary with a friendly ErrorState + restart.
2. Network awareness: an offline banner (use @react-native-community/netinfo via expo install), and pause mutations when offline with a clear message.
3. Make sure every screen has loading skeletons, error + retry, and empty states. Check the keyboard on all forms, and safe areas on small iPhones.
4. Animations: sheet transitions, list item entering, button press scale, and the searching pulse. Everything should stay at 60fps (memoize the map overlays, set tracksViewChanges false after the first render).
5. Accessibility pass (labels, roles, contrast, dynamic type).
6. Remove dead code and console logs (keep src/lib/logger which is a no-op in production). Hide the dev routes in production builds.
7. Run the api-contract-checker agent and fix drift.
8. Run ui-reviewer and code-reviewer on the WHOLE src folder and fix all High/Must items.

Commit "chore: polish and hardening".
```

## Prompt 13 — Test sweep

```
Run the test-writer agent for the whole app. Priorities: the ride store + event mapping, the realtime manager, api mappers/errors, formatters, auth flow, booking estimate logic, and chat optimistic logic. Then show me a coverage summary for src/features and src/api, and list any bugs found and fixed. Commit "test: core coverage".
```

## Prompt 14 — Development & release builds (EAS)

```
Prepare EAS builds so I can test Google Maps on iOS and later publish:
1. Install eas-cli guidance, eas.json with profiles: development (developmentClient, internal distribution), preview (internal), production. Install expo-dev-client.
2. app.config.ts: version/buildNumber/versionCode, icons + splash placeholders using the brand steel blue, iOS infoPlist location usage descriptions in English (with Azerbaijani localized via expo-localization config if possible).
3. Env vars for EAS (EXPO_PUBLIC_* via eas.json env or EAS environment variables) — document it.
4. Write docs/BUILD.md with exact commands from Windows: `eas login`, `eas device:create` (register my iPhone), `eas build -p ios --profile development`, install it, `npx expo start --dev-client`; plus Android equivalents and later `eas submit`.
Commit "chore(build): eas configuration".
```

---

## When the backend adds things

Paste this whenever your friend changes the API:
```
The backend changed. Run the api-contract-checker agent, then fix every Breaking and Drift item, adopt the New opportunities (e.g. GET /api/rides/{id}, /api/rides/active, /api/auth/refresh), update docs/BACKEND_REQUESTS.md, and run tests. Summarize what changed.
```
