# Backend requests for the passenger app

Send this to the backend developer. Claude Code appends new items here when it hits a gap. Item numbers are stable (code comments refer to them).

## Required before launch

8. Take the user's identity from the **JWT claims**, not from `userId` / `actorId` / `actorRole` in the body or query. Today any logged-in user could cancel another user's ride or read their chat.
9. Lock down `/api/debug/*`, `/api/Users` (list all), `/api/Drivers`, `/api/Vehicles` and `PromoCodes` POST to admin only. **Careful:** the passenger app currently reads `GET /api/Drivers/{id}`, `GET /api/Users/{id}` and `GET /api/Vehicles/{id}` for the assigned driver (see #1). Locking those down first blanks the driver card: ship #1 before, or allow a passenger to read only their assigned driver.

## Open questions (the app works around them; answers improve it)

1. **Server → client SignalR events for the passenger** (`/hubs/user`). *Partly answered*: the app has seen `RideStatusUpdated(rideId, "ride_update", payload)` and `DriverLocationUpdated(driverId, lat, lng)` (captured 2026-10-22, now in `docs/REALTIME_CONTRACT.md`). Still needed:
   - **driver and vehicle info** once a driver accepts: name, phone, plate, brand, model, color. None of the captured payloads carry it. **Now the most visible gap**: the ride screen shows "Your driver" + the vehicle class, no plate, and hides Call (no phone). The app already reads `driverName`, `driverSurname`, `driverPhoneNumber`, `vehiclePlateNumber`, `vehicleBrand`, `vehicleModel`, `vehicleColor` from the `RideStatusUpdated` payload as soon as they appear. **Stop-gap until then:** the app reads them through `GET /api/Drivers/{driverId}` → `GET /api/Users/{userId}` + `GET /api/Vehicles/{vehicleId}` (one adapter, `src/api/services/drivers.ts`). That is three calls per ride and reads another user's record, so please send the details in the event (or add a passenger endpoint such as `GET /api/Rides/{id}/driver`).
   - the payload for **cancelled by driver**, **no driver found / timeout** and **driver arrived at pickup** (not seen yet). Do these also come as `RideStatusUpdated`, and with which `status`?
   - are there other values of the second argument besides `"ride_update"`?
   - driver heading in `DriverLocationUpdated` (optional, to rotate the car marker).
   - the new chat message event on `/hubs/chat` (not captured yet).
2. **What string does `SubscribeUser(string)` expect?** The userId as a string? A group name like `user-12`?
5. **Full list of ride status strings.** Seen so far: `Searching`, `OnWay` (trip started) and `Completed`, plus one driver-on-the-way update (`polylinePhase: "Approach"`) whose status wasn't captured. Which strings mean accepted, arrived at pickup, cancelled (by whom) and no driver found? Please also confirm that `OnWay` means "trip started" (it came with `startedAt` and `polylinePhase: "EnRoute"`), not "driver on the way to pickup".
6. **VehicleType 0–3 names** (0 = ?, 1 = ?, 2 = ?, 3 = ?). Ideally return them as string enums in Swagger (`JsonStringEnumConverter`), or provide `GET /api/vehicle-types` with name and capacity.
7. **Chat `actorRole` value** for passengers. Captured messages use lower case (`senderRole: "driver"`), so the app now uses `"user"`. Please confirm.
26. **Driver cancels after accepting: what is sent?** *Answered (captured 2026-10-22):* `RideStatusUpdated` with status `Pending` and message "Driver not available. Please wait while we search for another driver..."; the app shows "Your driver cancelled. Looking for another one…" and searches again. The old driver keeps sending `DriverLocationUpdated` for a while (ignored). Remaining question: The app handles both: a `Cancelled` / `Canceled` status (any spelling, optionally `…ByDriver`) ends the ride; a `Searching` update after the accept is read as "driver dropped out, searching for another one" and shows the search again. Please confirm which one the backend does, with the exact status string. **Who cancelled, and why.** When a ride is cancelled by the driver or the system, please send it as `RideStatusUpdated` with a status that says who (e.g. `CancelledByDriver`) and an optional `reason` text. The app shows "The driver cancelled the ride" only when the status names the driver; a plain `Cancelled` shows no reason.
27. **Server-side search timeout.** The app gives up after 3 minutes (`SEARCH_TIMEOUT_MS`) and shows "No drivers nearby" with Retry. Retry cancels the old ride (cancel-by-user) and creates a new one. Does the backend also time out searches, and does it send a status for it (e.g. `NoDriverFound`)? If a driver accepts after the app's timeout, the app still follows them. While the user hub is disconnected (offline, just foregrounded) the app waits for it before giving up, and a cancel that fails offline is retried once the network returns.
25. **Trip history as the ride-recovery source.** The app finds a ride that ended while it was closed on the first page of `GET /api/TripHistory/user/{userId}` (see "Won't do" #3/#4). Please confirm: newest rides come first; a ride appears there as soon as it ends (or already while active?); and which `status` a cancelled and a no-driver ride get.
28. **The approach polyline is a straight line.** While the driver comes to the pickup, `encodedPolyline` (`polylinePhase: "Approach"`) has only two points (driver → pickup), so the map would draw a straight line through buildings. The trip polyline is a real road route. Please send the road route for the approach too. **Stop-gap:** when a leg has fewer than 3 points the app asks `POST /api/Routes/estimate` (driver position → pickup) once per ride and driver, and draws that instead (`src/features/ride/hooks/useRideRoute.ts`). Please confirm an estimate has no side effects (logging, promo counters), since the app calls it only for the route shape.

29. **Chat: live event and page order.** (a) ~~Which event does `/hubs/chat` send?~~ **Answered (captured):** `ReceiveChatMessage(message)`. The 15 s re-fetch of an open chat stays as a safety net. (b) Does page 1 of `GET /api/Chat/rides/{rideId}/messages` hold the newest or the oldest messages? The app merges and sorts on the client, so messages always show in the right order, but "load older" (scrolling up) assumes newest-first pages: with oldest-first pages the first screen would show the oldest messages.
30. **Account deletion.** Settings → Delete account calls `DELETE /api/Users/{id}` with the signed-in user's id, then signs out. Please confirm a passenger may delete their own account with it (and only their own, see #8), and what happens to their trip history, chats and promo codes. If it is admin-only today, please add a self-delete endpoint; the App Store requires in-app account deletion.

## Nice to have

10. Add a Bearer security scheme to Swagger so the generated types and docs show which endpoints need auth.

## Won't do: handled in the app

Agreed with the backend (2026-10-22): these will not be added. How the app copes:

3. ~~`GET /api/rides/{id}`~~ and 4. ~~`GET /api/rides/active`~~ — **won't do, handled in app.** The app persists an active-ride snapshot (ride id, phase, driver id; AsyncStorage, no PII). On app start and on every `/hubs/user` (re)connect it looks the ride up on the first page of `GET /api/TripHistory/user/{userId}`: completed / cancelled there → show the summary or cancelled screen; otherwise restore and resubscribe (SignalR then brings the live state). A snapshot older than 3 h that history can't confirm is reset as a last fallback. See `src/features/ride/recovery.ts`. Limitation: after a reinstall (no snapshot) an ongoing ride isn't found until the next SignalR update.
11. ~~`POST /api/auth/refresh`~~ — **won't do, handled in app.** On 401 the session is cleared and the user signs in again.
12. ~~`GET /api/users/me`~~ — **won't do, handled in app.** The signed-in user from login is cached (SecureStore); `GET /api/Users/{id}` refreshes it when needed.
13. ~~Addresses in `CreateRideRequest`~~ — **won't do, handled in app.** The app keeps the Google addresses locally for its own screens.
14. ~~`promoCode` in `CreateRideRequest`~~ — **won't do, handled in app** with the existing promo endpoints and the estimate's `promoCode`; the ride screen shows what `CreateRideResponse` reports (`promoApplied`, `discountAmount`).
15. ~~Rating, tip, push token, saved places~~ — **won't do for now.** Recent places stay on the device.

## Added while building the API layer

16. **`PromoDiscountType` 0 / 1 meaning.** Swagger exposes it as a bare int enum. The app assumes `0 = percentage`, `1 = fixed amount` (`src/constants/api.ts`). Please confirm, or return string enums.
17. **Trip history query params are PascalCase** (`PageNumber`, `PageSize`) while every other paged endpoint uses camelCase (`pageNumber`, `pageSize`). ASP.NET binds both case-insensitively, but aligning Swagger would keep the generated types consistent.
18. **Vehicle color as a stable key** (e.g. `white`, `black`, `silver`) in ride-accepted / trip payloads, so the app can translate it instead of showing a raw backend string inside az/ru text.
19. **Register validation rules.** What minimum password length and complexity does `/api/Auth/register` enforce, and what are the max lengths for name / surname / email? The app assumes min 6 characters (`src/features/auth/constants.ts`) and no max yet.
20. **Localized or coded auth errors.** Login/register show the `{ success:false, message }` text as-is. If it's English-only, az/ru users see English. Either honour `Accept-Language` (the app sends `az-AZ` / `ru-RU` / `en-US`) or add a stable `errorCode` (e.g. `EMAIL_TAKEN`, `PHONE_TAKEN`, `INVALID_CREDENTIALS`) so the app can translate it.
21. **Duplicate phone/email on register.** Please return a 409 (or `errorCode`) instead of a generic 400 so the form can highlight the right field.
22. **`POST /api/Auth/register` should return the same `{ success, data: { user, tokens } }` as login.** Today it returns HTTP 200 without a usable session, so the app makes a second `/api/Auth/login` call with the same credentials to sign the user in (`src/api/services/auth.ts`). Returning tokens from register removes that extra round trip.
23. **Pickup ETA per vehicle type in `/api/Routes/estimate`.** The estimate returns the trip duration and distance, but not how far away the nearest available driver of that class is. The vehicle list shows "About 25 min" (trip) for now. A field like `pickupEtaMinutes` (or `null` when no driver is nearby) would let us show "3 min away" and hide unavailable classes.
24. **Estimate with an invalid or used-up promo.** What does `/api/Routes/estimate` return when `promoCode` is unknown, expired or already used? The app needs to tell "no discount" apart from "estimate failed" so it can drop the promo and show a message.
