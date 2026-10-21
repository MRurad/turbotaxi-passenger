# Backend requests for the passenger app

Send this to the backend developer. Items are ordered by priority. Claude Code appends new items here when it hits a gap.

## Blocking (needed before the ride flow works end to end)

1. **Server → client SignalR events for the passenger** (`/hubs/user`). We have the client→server methods. We also need the method names the server *sends* to the user, plus their payload shapes. Please fill in `docs/REALTIME_CONTRACT.md`. At minimum:
   - driver accepted the ride (rideId, driverId, driver name/phone, vehicle plate/brand/model/color, polylines, ETA)
   - driver arrived at pickup
   - ride started
   - ride finished (final price, discount, promo)
   - ride cancelled by driver / no driver found / timeout
   - driver location update (driverId, lat, lng, heading?)
   - new chat message (`/hubs/chat`)
2. **What string does `SubscribeUser(string)` expect?** The userId as a string? A group name like `user-12`?
3. **`GET /api/rides/{id}`.** Returns full ride state (status, driver, vehicle, pickup/destination, fare, polylines). This lets the app recover state after a restart or reconnect.
4. **`GET /api/rides/active`** (for the current JWT user). Returns the in-progress ride or 204. Without it, a reinstalled or relaunched app can't find an ongoing ride.
5. **List of ride status strings** (e.g., `Searching`, `Accepted`, `Arrived`, `InProgress`, `Completed`, `CancelledByUser`, ...).
6. **VehicleType 0–3 names** (0 = ?, 1 = ?, 2 = ?, 3 = ?). Ideally return them as string enums in Swagger (`JsonStringEnumConverter`), or provide `GET /api/vehicle-types` with name and capacity.
7. **Chat `actorRole` value** for passengers (`"User"`? `"user"`? `"Passenger"`?).

## Security (important before production)

8. Take the user's identity from the **JWT claims**, not from `userId` / `actorId` / `actorRole` in the body or query. Today any logged-in user could cancel another user's ride or read their chat.
9. Lock down `/api/debug/*`, `/api/Users` (list all), `/api/Drivers`, `/api/Vehicles` and `PromoCodes` POST to admin only.
10. Add a Bearer security scheme to Swagger so the generated types and docs show which endpoints need auth.

## Nice to have

11. `POST /api/auth/refresh` (refreshToken → new tokens). The app is ready to use it.
12. `GET /api/users/me`.
13. Add `pickupAddress` / `destinationAddress` text to `CreateRideRequest`. The app already knows the address from Google, so the backend doesn't need to reverse-geocode.
14. Add `promoCode` (or `promoCodeId`) to `CreateRideRequest` so the user's chosen promo applies explicitly.
15. Later: rating and tip after a ride, push device token registration, saved places.

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
