# Realtime contract (SignalR)

The source of truth for hub methods and events. `src/realtime/events.ts` mirrors this file. Change event names ONLY there.
Fields marked **TODO** must be confirmed by the backend developer. Until then the app uses the placeholder names and logs any unknown events it receives (dev only), so the real names can be discovered by watching the logs.

Auth: connect with `accessTokenFactory: () => accessToken` (sent as `?access_token=` on the WebSocket).
Base URL: `${EXPO_PUBLIC_API_URL}/hubs/...`

## /hubs/user (passenger)

### Client → server (confirmed)
| Method | Args | When |
|---|---|---|
| `SubscribeUser` | `(string)` (**TODO** userId as string? group name?) | right after connect / reconnect |
| `UnsubscribeUser` | `(string)` | logout |
| `SubscribeToDriverLocation` | `(driverId: int)` | after driver assigned |
| `UnsubscribeFromDriverLocation` | `(driverId: int)` | ride finished/cancelled |
| `Ping` | `()` | every 30 s keep-alive |

### Server → client (captured on `/dev/realtime`, 2026-10-22)
Arguments are **positional**. The app validates the whole argument list and turns it into one object.

| Event | Arguments | App reaction |
|---|---|---|
| `RideStatusUpdated` | `(rideId: int, type: "ride_update", payload)` | `payload.status` → phase via `src/constants/rideStatus.ts` |
| `DriverLocationUpdated` | `(driverId: int, latitude: number, longitude: number)` | move car marker |

`RideStatusUpdated` payloads seen, by `status`:

| `status` | Fields | Meaning |
|---|---|---|
| `Searching` | `rideId, message, driverId, distance` | request offered to a nearby driver ("Driver #4 is 3.7km away"). `driverId` is NOT assigned yet: don't subscribe to its location |
| *(not captured)* | `…pickup/destination/driver lat-lng, encodedPolyline, tripEncodedPolyline, polylinePhase: "Approach", distanceKm, durationMinutes, message` | driver accepted and is coming ("Driver is coming! ETA: 8 min") |
| `OnWay` | `startedAt, driverLat/Lng, pickupLat/Lng, destinationLat/Lng, encodedPolyline, tripEncodedPolyline, polylinePhase: "EnRoute", distanceKm, durationMinutes, message` | trip started |
| `Completed` | `finalPrice, completedAtUtc, clearMap: true, userType, message`; polylines and distance null | trip finished |

`polylinePhase` says which line `encodedPolyline` is: `Approach` = driver → pickup, `EnRoute` = the trip.

**Still TODO** (docs/BACKEND_REQUESTS.md #1, #5): the status strings for accepted, arrived at pickup, cancelled and no driver; driver/vehicle info; heading.

## /hubs/chat

### Client → server (confirmed)
| Method | Args |
|---|---|
| `JoinRideChat` | `(rideId: int, actorRole: string /* TODO value */, actorId: int)` |
| `LeaveRideChat` | `(rideId: int)` |

Sending messages goes over REST: `POST /api/Chat/rides/{rideId}/messages`.

### Server → client (captured on `/dev/realtime`, 2026-10-22)
| Event | Arguments |
|---|---|
| `ReceiveChatMessage` | `(message: { id, rideId, senderRole, senderId, text, sentAtUtc })`, e.g. `senderRole: "driver"` |

Roles are lower case (`"driver"`); the passenger sends and joins as `"user"`.

## Discovering the real names (dev builds)

Open the avatar menu → **Open realtime inspector** (`/dev/realtime`). It shows both hubs' connection state, buttons for every client → server method above, and the last 50 server → client invocations with their raw JSON arguments. Events whose name isn't in `src/realtime/events.ts` are tagged **unknown** (also logged as `[turbotaxi] realtime: unknown user event "…"` in Metro). Trigger a ride from the driver side, read the names/payloads off the screen, then update this file and `events.ts`.

## Client notes

- Transport: WebSockets with `skipNegotiation: true`; if the server rejects that, the app falls back once to normal negotiation (still WebSockets).
- Reconnect: 0 s, 2 s, 5 s, 10 s, 20 s, 30 s, then every 30 s forever. After every reconnect the app re-runs `SubscribeUser` (and `SubscribeToDriverLocation` / `JoinRideChat` when active), because group membership is lost.
- Payloads are validated with zod; an event whose argument list doesn't match its schema is logged (dev) and ignored. Extra fields are kept.
- Expected-but-unconfirmed fields in the `RideStatusUpdated` payload: driver/vehicle info (`driverName`, `driverSurname`, `driverPhoneNumber`, `vehiclePlateNumber`, `vehicleBrand`, `vehicleModel`, `vehicleColor`).
- Auth on the socket: the React Native client sends the JWT as an `Authorization: Bearer …` header on the WebSocket upgrade (browsers can't, and use `?access_token=`). The backend should accept both for `/hubs/*`. A 401 / expired token ends the session (logout) instead of retrying.
- Ride flow (`src/features/ride/`): `RideStatusUpdated` drives the ride store (`rideEvents.ts`). The phase comes from `status` via `mapBackendStatus`, with `polylinePhase` as a tie-breaker (`Approach` = driver on the way, `EnRoute` = trip) because the accepted / arrived strings weren't captured yet. Once a driver is assigned the app calls `SubscribeToDriverLocation(driverId)` as an on-connect action (so it re-runs after every reconnect) and `UnsubscribeFromDriverLocation` when the ride completes or is cancelled. `DriverLocationUpdated` is only applied for the assigned driver. Events for another `rideId`, and transitions the store doesn't allow (late or duplicate events), are ignored.
- Ride recovery (no GET ride / active-ride endpoint, by decision): on app start and on every `/hubs/user` (re)connect, a persisted active ride is looked up on the first page of `GET /api/TripHistory/user/{userId}`. Completed / cancelled there → final screen; otherwise restore, re-run `SubscribeToDriverLocation(driverId)` and wait for the next `RideStatusUpdated`. A snapshot older than 3 h that history can't confirm is reset. A failed history request never ends a live ride. Code: `src/features/ride/recovery.ts`.
- Chat: while a driver is assigned (until the ride ends) the app keeps the ride chat joined (`JoinRideChat(rideId, "User", userId)` as an on-connect action, `LeaveRideChat` when the ride ends), so driver messages reach the unread badge even when the chat screen is closed. Incoming messages are de-duplicated by id into the history cache.
- Lifecycle: the user hub runs while signed in; it is stopped 30 s after the app goes to the background (kept alive during an active ride) and restored on foreground. The chat hub runs only while a ride chat is open. On logout every hub is stopped and its on-connect actions are cleared.
