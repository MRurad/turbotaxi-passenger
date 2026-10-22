---
name: ride-flow
description: The passenger ride state machine (booking → searching → driver assigned → arrived → in progress → completed/cancelled), the ride Zustand store, persistence and screen routing per status. Use when working on booking, searching, live ride, cancel or trip summary.
---

# Ride flow

Implemented in `src/features/ride/`. Backend facts are in `docs/REALTIME_CONTRACT.md`, and open questions are in `docs/BACKEND_REQUESTS.md`. There is **no GET ride / active-ride endpoint, and there won't be one** (decided). Live state comes only from SignalR plus the create response.

## Phases (`src/types/ride.ts`)
`idle → searching → driver_assigned → driver_arrived → in_progress → completed`, plus `cancelled` and `no_driver`. Active = searching, driver_assigned, driver_arrived, in_progress (`isActivePhase` in `snapshot.ts`).

## From hub event to phase (`utils.ts` → `rideEvents.ts`)
- **`phaseFromUpdate(evt)`:**
  - `mapBackendStatus(status)` (`src/constants/rideStatus.ts`) maps the status. Cancellations are matched with an anchored pattern in any spelling (`Canceled`, `CancelledByDriver` …); in-between states like `CancelRequested` are not.
  - `polylinePhase` breaks ties: `Approach` = driver on the way, `EnRoute` = trip. The accepted and arrived strings were never captured.
  - Unknown statuses leave the phase unchanged.
- **`Searching` with a `driverId`:** that driver was only *offered* the ride. Never subscribe to them.
- **`Searching` after an accept:** the driver dropped out (`driverLost`). Go back to searching, forget the driver, restart the search clock.
- **`routeInfoFromUpdate(evt)`:** polylines (`toPickup` while approaching, `trip`), ETA, positions, and driver details if ever sent.
- **Ignored events:** events for another `rideId`. Updates that arrive before recovery has hydrated the store are held and replayed (`flushPendingRideUpdates`).

## Store (`store.ts`, Zustand)
- **Named transitions only:** `startSearching` (returns false when refused → the caller cancels that ride), `driverAssigned`, `driverArrived`, `rideStarted`, `rideFinished`, `rideCancelled(reason)`, `noDriverFound`, `driverLost`, `updateRoute`, `updateDriverLocation`, `restore`, `finishFromHistory`, `markHydrated`, `reset`.
- **`ALLOWED_TRANSITIONS`:** anything else is ignored and logged in dev (late or duplicate events). Skipping ahead is allowed.
- **`no_driver`:** the store lets go of the ride id, and the app cancels the backend ride on its own 3-minute timeout. Only Retry (a new ride) or give up follow.
- **`updatedAt`:** changes on phase changes only. Route refreshes don't touch storage.
- **Persistence (`persistence.ts`):**
  - The snapshot goes to AsyncStorage: ids, phase, prices, `searchStartedAt`. **Never PII.**
  - Pickup and destination go to SecureStore.
  - Driver location and polylines are never stored; SignalR re-sends them.
  - Both are cleared on reset and on logout (`useClearCacheOnLogout`).

## Hooks (mounted once in `src/app/(app)/_layout.tsx`)
- **`useRideRecovery`:** restores the snapshot on start (snapshots older than 3 h are dropped), then hydrates. It checks the first page of trip history (`recovery.ts`): on start, on every user-hub (re)connect, on every return to the foreground, and every `RIDE_HISTORY_POLL_MS` (30 s) while a ride is active. That last check is a safety net for a cancel or completion whose hub event never arrives. If the ride is final there, it shows the summary or the cancelled screen. A decision is applied only while it is still current (`isStillCurrent`).
- **`useRideEvents`:**
  - Wires hub events to the store.
  - `SubscribeToDriverLocation(driverId)` is an on-connect action while a driver is tracked, and is unsubscribed on exit.
  - The search timeout runs from `searchStartedAt`.
  - Haptics and screen-reader announcements happen on phase changes.
- **`useRideRouteGuard`:** the only navigation between phases. Active, cancelled and no_driver go to `/ride`, completed goes to `/ride/summary`, idle goes home. It does nothing when signed out.

## Ordering, cancel, retry
- Order: `useCreateRide` → `POST /api/Rides`.
  - A ride the store refuses (double tap, a ride already active), or one that returns after sign-out, is cancelled immediately.
  - `OrderButton` only enables once the store is hydrated and idle.
  - `CreateRideRequest` has no promo field. Show what the response says, and toast if the chosen promo wasn't applied.
- Cancel: `ConfirmDialog` → `useCancelRide` → `POST /api/Rides/{id}/cancel-by-user` → `rideCancelled('user')`.

## Driver details
The events carry none. The stop-gap adapter `src/api/services/drivers.ts` reads `GET /api/Drivers/{id}` → `/api/Users/{userId}` + `/api/Vehicles/{vehicleId}`, through `useDriverProfile`. Hub details win field by field (`mergeDriver`). Replace the adapter when the backend sends details (BACKEND_REQUESTS #1).

## Route line (`useRideRoute`)
The backend's approach polyline is a straight two-point segment (BACKEND_REQUESTS #28).
- A leg with fewer than 3 points gets its road route from `POST /api/Routes/estimate` (stop-gap): fetched once per ride / leg (/ driver for the approach), starting from the car's position at that moment, and retried on failure.
- Nothing is drawn rather than a straight line, and there is no line once the driver has arrived.
- `RideMapLayers` and `useRideCamera` both read it.

## Screens
`RideScreen` (map + `RideMapLayers` + `SearchPulse` + `RidePanel`, one content component per phase) and `RideSummaryScreen`.
- The camera (`useRideCamera`) frames per phase and refits on phase, route or sheet-size changes, not on every car move. Map rotation is off, so the car's heading stays right on Apple Maps.
- The car is `TopDownCar` (react-native-svg) inside `CarMarker`, using the `mapCar*` color tokens.
- Components stay ≤ 150 lines.

## Testing
Pure parts are unit-tested: transitions, `phaseFromUpdate` against the captured payloads, `rideRedirect`, recovery decisions, persistence. Hooks are tested with a mocked hub and services (`src/features/ride/__tests__`).
