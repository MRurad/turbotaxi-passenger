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
