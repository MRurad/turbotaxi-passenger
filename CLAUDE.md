# TurboTaxi Passenger App

React Native (Expo) app for **passengers only** (no driver features). Users register/login, pick pickup + destination on a Google map, choose a vehicle class with a price estimate, request a ride, track the driver live, chat with the driver, and see trip history and promo codes.

Backend: ASP.NET API at `https://api.turbotaxi.deepcode.az` (Swagger: `/swagger/v1/swagger.json`) + SignalR hubs. The backend is written by a teammate and is still evolving — never invent endpoints; if something is missing, isolate it behind an adapter and add it to `docs/BACKEND_REQUESTS.md`.

## Stack
- Expo (latest SDK), TypeScript strict, Expo Router (routes in `src/app`)
- Server state: TanStack Query · Client state: Zustand · HTTP: axios · Realtime: `@microsoft/signalr`
- Forms: react-hook-form + zod · Maps: react-native-maps (Google provider) + expo-location
- i18n: i18next + react-i18next + expo-localization (az default, ru, en)
- Storage: expo-secure-store (tokens), AsyncStorage (prefs, active ride snapshot)
- UI: StyleSheet + our theme tokens, @gorhom/bottom-sheet, react-native-reanimated, gesture-handler, expo-haptics, @expo/vector-icons
- Tests: jest-expo + @testing-library/react-native
- API types: generated with `openapi-typescript` into `src/api/generated/schema.ts`

## Commands
- `npx expo start` — dev server (test on iPhone via Expo Go / dev build)
- `npx tsc --noEmit` — typecheck (must pass)
- `npx expo lint` — lint (must pass)
- `npm test` — unit tests
- `npm run api:types` — regenerate API types from Swagger

## Folder structure
```
src/
  app/                 # Expo Router routes ONLY. Thin files that render a screen from features/.
  features/<feature>/  # auth, home, booking, ride, chat, history, promo, profile
    screens/           # Screen components (one per route)
    components/        # Feature-only components
    hooks/             # useXxx hooks (queries, mutations, logic)
    store.ts           # Zustand store if needed
    types.ts constants.ts utils.ts
  components/ui/       # Shared design-system components (Button, Text, Input, Card, Screen, ...)
  api/                 # client.ts, errors.ts, endpoints.ts, services/*.ts, generated/
  realtime/            # SignalR connection manager, hub wrappers, event names + payload types
  theme/               # tokens (colors, spacing, radii, typography, shadows), ThemeProvider, makeStyles
  i18n/                # setup + locales/{az,ru,en}.json
  constants/           # config.ts, routes.ts, storageKeys.ts, queryKeys.ts, vehicles.ts, rideStatus.ts
  lib/                 # storage, format (money/date/distance), polyline, logger
  providers/           # AppProviders (Query, Theme, i18n, GestureHandler, BottomSheet, SafeArea)
  types/               # shared app-level types
```

## Code rules (non-negotiable)
1. **Readable first.** Components ≤ ~150 lines; split when larger. One component per file. Named exports (except route files, which default-export).
2. **No magic values.** Strings → i18n keys. Colors/spacing/font sizes → theme tokens. URLs, endpoints, storage keys, query keys, timeouts → `src/constants` or `src/api/endpoints.ts`.
3. **Types everywhere.** No `any`. API types come from `src/api/generated/schema.ts`; app/domain types live in `features/*/types.ts` or `src/types`. Map API DTOs to domain types in the service layer when shapes are awkward.
4. **Layering:** screen → hook → service → axios client. Screens never call axios or SignalR directly.
5. **Every screen** handles loading, error, empty states; works in light AND dark mode; respects safe areas; has accessibility labels on touchables.
6. **Every user-facing string** exists in all three locale files (az, ru, en).
7. Use `makeStyles` + `useTheme` for styles; never hardcode `#hex` outside `src/theme`.
8. Money: AZN, formatted via `formatMoney` in `src/lib/format.ts` (₼). Distances/durations via formatters too.
9. Keep Expo Go compatibility unless a task explicitly says otherwise (no native modules that need a dev build).
10. After each task: `npx tsc --noEmit`, `npx expo lint`, tests pass, then commit with a conventional commit message.

## Backend facts you must respect
- Auth: `POST /api/Auth/register` and `/api/Auth/login` (email + password) → `{ success, message, data: { user, tokens: { accessToken, refreshToken, expiresIn, tokenType } } }`. All other APIs require `Authorization: Bearer <token>`. **No refresh endpoint yet** → on 401 clear session and go to login.
- Many endpoints take `userId` in body/query (CreateRide, cancel-by-user, estimate, promo, trip history, chat `actorId`). Always take it from the auth store, never from user input.
- `VehicleType` is int 0–3. Mapping lives in `src/constants/vehicles.ts` (confirm names with backend).
- Ride status is a **string** from the backend; normalize through `src/constants/rideStatus.ts` with an `unknown` fallback.
- **There is no GET ride / active ride endpoint.** Live ride state comes only from SignalR (`/hubs/user`) + the `CreateRideResponse`. Persist an active-ride snapshot locally so the app can restore after restart.
- Hubs: `/hubs/user` (SubscribeUser, SubscribeToDriverLocation(driverId), Ping), `/hubs/chat` (JoinRideChat(rideId, role, actorId), LeaveRideChat(rideId)). Server→client event names are defined in `docs/REALTIME_CONTRACT.md` and mirrored in `src/realtime/events.ts` — that file is the ONLY place event names appear.
- Maps/places: Google (Maps SDK, Places API (New) autocomplete, Geocoding). Key from `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.

## Skills & agents
Skills in `.claude/skills/` (api-client, realtime-signalr, ride-flow, maps-location, ui-design-system, i18n) — load the relevant one before working in that area.
Agents in `.claude/agents/`: `code-reviewer`, `ui-reviewer`, `api-contract-checker`, `test-writer`. Run `code-reviewer` + `ui-reviewer` at the end of every feature.

## Definition of done (every task)
- Typecheck, lint and tests pass
- Light + dark mode checked; az/ru/en strings added
- No hardcoded strings/colors/URLs; no `any`
- Loading/error/empty states present
- Short summary of what changed + anything added to `docs/BACKEND_REQUESTS.md`
