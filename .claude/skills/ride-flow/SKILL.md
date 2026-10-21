---
name: ride-flow
description: The passenger ride state machine (booking → searching → driver assigned → arrived → in progress → completed/cancelled), the ride Zustand store, persistence and screen routing per status. Use when working on booking, searching, live ride, cancel or trip summary.
---

# Ride flow

## Phases (app-side, in `src/features/ride/types.ts`)
```ts
export type RidePhase =
  | 'idle'            // home map, nothing booked
  | 'searching'       // POST /api/Rides succeeded, waiting for a driver
  | 'driver_assigned' // driver accepted, coming to pickup
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'       // show summary, then reset to idle
  | 'cancelled'       // by user or driver
  | 'no_driver';      // timeout / nobody accepted
```
Backend status strings map to phases in `src/constants/rideStatus.ts` (`mapBackendStatus(s: string | null): RidePhase | 'unknown'`). An unknown status is logged and doesn't change the phase.

## Store: `src/features/ride/store.ts` (Zustand + persist to AsyncStorage)
State: `phase, rideId, pickup, destination (Place: {lat,lng,address}), vehicleType, estimate, driver?, vehicle?, driverLocation?, polylines {toPickup?, trip?}, fare {estimated, final?, discount?, promoCode?}, createdAt, updatedAt`.
Actions are named transitions, never raw setters: `startSearching(createRideResponse, draft)`, `driverAssigned(evt)`, `driverArrived()`, `rideStarted(evt)`, `rideFinished(evt)`, `rideCancelled(evt)`, `noDriverFound()`, `updateDriverLocation(loc)`, `reset()`.
- Each transition checks that the current phase allows it (a small `ALLOWED_TRANSITIONS` table). Invalid transitions are ignored and logged in dev. This protects against duplicated or late SignalR events.
- Only persist what's needed to restore: rideId, phase, places, driver, vehicle, fare. Don't persist driverLocation.
- On app start: if the persisted phase is active and `updatedAt` is older than 3 h, reset. Otherwise restore and resubscribe. (When `GET /api/rides/active` exists, use it as the source of truth instead.)

## Booking draft: `src/features/booking/store.ts`
Holds pickup, destination, selected vehicleType and selected promo before the ride is created. Reset after a successful create.

## Flow
1. Home: the user sets pickup (current location or pin drag) and destination (search).
2. Booking sheet: `POST /api/Routes/estimate` for each vehicle type in parallel (`useQueries`). Show price, ETA and the route polyline. The user picks a vehicle and optionally a promo.
3. "Order": `POST /api/Rides` with userId from auth → `startSearching`. The searching UI has an animated pulse, the elapsed time, and a Cancel button.
4. Cancel: `POST /api/Rides/{id}/cancel-by-user` → `rideCancelled`. Ask for confirmation first.
5. Hub events drive the next phases. On `driver_assigned`, call `SubscribeToDriverLocation(driverId)`. Unsubscribe on completed or cancelled.
6. Searching timeout: if the phase is still `searching` after `SEARCH_TIMEOUT_MS` (constant, 3 min), show `no_driver` with Retry and Cancel.
7. Completed: a summary sheet with final price, discount and promo, then "Done" → `reset()`.

## Routing
A single `useRideRouteGuard()` hook in the authenticated layout redirects based on `phase`. Active phases go to `/ride`, `completed` goes to `/ride/summary`, and `idle` goes to home. Screens never `router.push` between ride phases themselves.

## Testing
The store transitions are pure. Unit-test every allowed and disallowed transition plus `mapBackendStatus`.
