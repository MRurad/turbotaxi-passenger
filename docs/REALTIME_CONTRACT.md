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

### Server → client (ALL TODO, placeholder names)
| Placeholder name | Payload (expected) | App reaction |
|---|---|---|
| `RideAccepted` | `RideAcceptedResponse` shape + driver & vehicle info | status → driver_assigned, subscribe to driver location |
| `DriverArrived` | `{ rideId }` | status → driver_arrived |
| `RideStarted` | `StartRideResponse` | status → in_progress |
| `RideFinished` | `RideFinishedResponse` | status → completed, show summary |
| `RideCancelled` | `CancelRideResponse` (+ reason / by whom) | status → cancelled |
| `NoDriverFound` | `{ rideId }` | status → no_driver |
| `DriverLocationUpdated` | `{ driverId, latitude, longitude, heading? }` | move car marker |

## /hubs/chat

### Client → server (confirmed)
| Method | Args |
|---|---|
| `JoinRideChat` | `(rideId: int, actorRole: string /* TODO value */, actorId: int)` |
| `LeaveRideChat` | `(rideId: int)` |

Sending messages goes over REST: `POST /api/Chat/rides/{rideId}/messages`.

### Server → client (TODO)
| Placeholder | Payload |
|---|---|
| `ReceiveMessage` | `ChatMessageDto` |

## Discovering the real names (dev builds)

Open the avatar menu → **Open realtime inspector** (`/dev/realtime`). It shows both hubs' connection state, buttons for every client → server method above, and the last 50 server → client invocations with their raw JSON arguments. Events whose name isn't in `src/realtime/events.ts` are tagged **unknown** (also logged as `[turbotaxi] realtime: unknown user event "…"` in Metro). Trigger a ride from the driver side, read the names/payloads off the screen, then update this file and `events.ts`.

## Client notes

- Transport: WebSockets with `skipNegotiation: true`; if the server rejects that, the app falls back once to normal negotiation (still WebSockets).
- Reconnect: 0 s, 2 s, 5 s, 10 s, 20 s, 30 s, then every 30 s forever. After every reconnect the app re-runs `SubscribeUser` (and `SubscribeToDriverLocation` / `JoinRideChat` when active), because group membership is lost.
- Payloads are validated with zod; an event whose first argument doesn't match its schema is logged (dev) and ignored. Extra fields are kept.
- Expected-but-unconfirmed fields: `RideAccepted` driver/vehicle info (`driverName`, `driverSurname`, `driverPhoneNumber`, `vehiclePlateNumber`, `vehicleBrand`, `vehicleModel`, `vehicleColor`); `RideCancelled.cancelledBy` and `reason`.
- Auth on the socket: the React Native client sends the JWT as an `Authorization: Bearer …` header on the WebSocket upgrade (browsers can't, and use `?access_token=`). The backend should accept both for `/hubs/*`. A 401 / expired token ends the session (logout) instead of retrying.
- Lifecycle: the user hub runs while signed in; it is stopped 30 s after the app goes to the background (kept alive during an active ride) and restored on foreground. The chat hub runs only while a ride chat is open. On logout every hub is stopped and its on-connect actions are cleared.
