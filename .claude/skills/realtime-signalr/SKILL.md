---
name: realtime-signalr
description: SignalR connection management for /hubs/user and /hubs/chat — connect with JWT, reconnect, resubscribe, app background/foreground, typed events. Use for anything touching live ride updates, driver location or chat realtime.
---

# Realtime (SignalR) conventions

Read `docs/REALTIME_CONTRACT.md` first. It is the contract.

## Files
- `src/realtime/events.ts` is the ONLY place hub paths, method names and event names appear:
  ```ts
  export const HUBS = { user: '/hubs/user', chat: '/hubs/chat' } as const;
  export const USER_HUB_METHODS = { subscribeUser: 'SubscribeUser', unsubscribeUser: 'UnsubscribeUser',
    subscribeDriverLocation: 'SubscribeToDriverLocation', unsubscribeDriverLocation: 'UnsubscribeFromDriverLocation', ping: 'Ping' } as const;
  export const USER_HUB_EVENTS = { rideAccepted: 'RideAccepted', /* TODO confirm */ ... } as const;
  ```
  Also put the typed payloads here (`RideAcceptedEvent`, `DriverLocationEvent`, ...) and an `UserHubEventMap` that maps each event name to its payload type.
- `src/realtime/HubConnectionManager.ts`: a generic class wrapping `@microsoft/signalr`:
  - `HubConnectionBuilder().withUrl(url, { accessTokenFactory, transport: HttpTransportType.WebSockets, skipNegotiation: true })`. If skipNegotiation fails against the server, fall back to the default negotiation and note it.
  - `.withAutomaticReconnect([0, 2000, 5000, 10000, 20000, 30000])` with a custom retry policy that keeps retrying every 30 s.
  - Exposes `start()`, `stop()`, `invoke<T>(method, ...args)`, `on<E>(event, handler) => unsubscribe`, and `state$` (subscribe to connection state for the UI banner).
  - On `onreconnected` it **re-runs every registered "on-connect" action**. Group membership is lost on reconnect, so it must call SubscribeUser again, SubscribeToDriverLocation again for the active ride, and JoinRideChat again.
  - In `__DEV__`, it logs any event the client receives that isn't registered (this is how the real names get discovered).
- `src/realtime/userHub.ts` and `src/realtime/chatHub.ts`: singleton instances plus typed helpers (`subscribeToDriverLocation(driverId)` etc.).
- `src/realtime/useRealtimeLifecycle.ts`: mounted once in the authenticated layout.
  - When logged in, it starts the user hub and registers on-connect `SubscribeUser(String(user.id))` (the argument format is TODO).
  - Logout stops all hubs.
  - `AppState`: when the app goes to the background with no active ride, stop after 30 s. With an active ride, keep the connection. On foreground, `start()` if disconnected.
  - It sends `Ping` every 30 s while connected.

## Rules
- Screens never touch SignalR. Feature hooks subscribe through the helpers and **must return the unsubscribe function in the useEffect cleanup**.
- Events update the Zustand ride store (see the ride-flow skill). Components read from the store.
- Validate incoming payloads with zod schemas in `events.ts`. On a parse failure, log in dev and ignore the event. Never crash.
- Show a small "Reconnecting…" banner (i18n) from the connection state.
- `@microsoft/signalr` is pure JS and works in Expo Go. Don't add native socket libraries.
