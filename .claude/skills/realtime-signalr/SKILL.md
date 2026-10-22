---
name: realtime-signalr
description: SignalR connection management for /hubs/user and /hubs/chat — connect with JWT, reconnect, resubscribe, app background/foreground, typed events. Use for anything touching live ride updates, driver location or chat realtime.
---

# Realtime (SignalR) conventions

Read `docs/REALTIME_CONTRACT.md` first. It is the contract, and it records what was actually captured from the backend (`/dev/realtime`). Where this skill and the contract disagree, the contract wins.

## What the server really sends (captured 2026-10-22)
- **Arguments are positional.** Schemas validate the whole argument list (a zod tuple) and `.transform` it into one object. Never validate only `args[0]`.
- `RideStatusUpdated(rideId: int, type: "ride_update", payload)` is the **only** ride event. Phases come from `payload.status` (`Searching`, `OnWay`, `Completed` seen). There are no `RideAccepted` / `RideStarted` / … events.
- `DriverLocationUpdated(driverId: int, latitude: number, longitude: number)`: no heading.
- `ReceiveChatMessage(message)` on `/hubs/chat`: `{ id, rideId, senderRole, senderId, text, sentAtUtc }`. Roles are lower case (`"driver"`, `"user"`).

## Files
- `src/realtime/events.ts` is the ONLY place hub paths, method names and event names appear:
  ```ts
  export const HUBS = { user: '/hubs/user', chat: '/hubs/chat' } as const;
  export const USER_HUB_METHODS = { subscribeUser: 'SubscribeUser', unsubscribeUser: 'UnsubscribeUser',
    subscribeDriverLocation: 'SubscribeToDriverLocation', unsubscribeDriverLocation: 'UnsubscribeFromDriverLocation', ping: 'Ping' } as const;
  export const USER_HUB_EVENTS = { rideStatusUpdated: 'RideStatusUpdated', driverLocationUpdated: 'DriverLocationUpdated' } as const;
  ```
  The tuple schemas (`rideStatusUpdatedSchema`, `driverLocationSchema`, `chatMessageSchema`) and the `UserHubEventMap` / `ChatHubEventMap` (derived with `z.output`) live here too. Payload objects are `z.looseObject` (unknown fields kept). `rideStatusUpdatedSchema` rejects a payload whose `rideId` differs from the routed one.
- `src/realtime/HubConnectionManager.ts`: a generic class wrapping `@microsoft/signalr`.
  - Uses WebSockets with `skipNegotiation: true`, falling back once to normal negotiation. The JWT goes in the header; a 401 ends the session.
  - Reconnect delays are `[0, 2000, 5000, 10000, 20000, 30000]`, then every 30 s forever.
  - Exposes `start()`, `stop()`, `reset()`, `invoke(method, ...args)`, `on(event, handler) => unsubscribe`, `addOnConnect(action) => remove`, and state for the banner.
  - **On-connect actions** re-run after every (re)connect, because group membership is lost. `SubscribeUser`, `SubscribeToDriverLocation(driverId)` and `JoinRideChat` are all registered this way. A failing action is retried, then the hub reconnects, so **on-connect actions must not reject for app-level reasons** (catch inside).
  - A catch-all protocol tap records every incoming invocation for `/dev/realtime`, and in dev it logs unknown event names. This is how real names get discovered.
- `src/realtime/userHub.ts` and `src/realtime/chatHub.ts`: singletons plus typed helpers (`subscribeToDriverLocation`, `onUserHubEvent('rideStatusUpdated', handler)`, `keepRideChatJoined(rideId)` …).
- `src/realtime/useRealtimeLifecycle.ts`: mounted once in `src/app/(app)/_layout.tsx`.
  - It starts the user hub when signed in, and resets all hubs on logout.
  - Background: it stops after 30 s, **unless a ride is active**: `keepAliveInBackground: hasActiveRide` from the ride store. It restores on foreground.
  - It sends `Ping` every 30 s while connected.

## Rules
- Screens never touch SignalR. Feature hooks subscribe through the helpers and **return the unsubscribe function in the useEffect cleanup**.
- Ride events go through `src/features/ride/rideEvents.ts` into the ride store (see the ride-flow skill). Components read from the store.
- Validate payloads with the zod schemas in `events.ts`. On a parse failure, log in dev and ignore the event. Never crash.
- Show the "Reconnecting…" banner (`RealtimeBanner`, i18n) from the connection state.
- `@microsoft/signalr` is pure JS and works in Expo Go. Don't add native socket libraries.
- Unknown event names or statuses: check `/dev/realtime` (avatar menu → realtime inspector) and update the contract and `events.ts` together. Never guess silently; put open questions in `docs/BACKEND_REQUESTS.md`.
